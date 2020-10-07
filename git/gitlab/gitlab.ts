import type * as git from "../git.ts";
import { safeHttpClient as shc } from "./deps.ts";
import * as gls from "./gitlab-schema.ts";

export type GitLabHostname = string;
export type GitLabGroupID = string;
export type GitLabRepoID = string;
export type GitLabRepoURL = string;

export interface GitLabServerAuthn {
  readonly glServerUserNamePassword: () => [user: string, passwd: string];
}

export function envVarAuthnAccessToken(
  varPrefix: string,
  onInvalid: {
    userNamePassword: [string, string];
    reporter?: (message: string) => void;
  },
): GitLabServerAuthn {
  return {
    glServerUserNamePassword: (): [string, string] => {
      const userName = Deno.env.get(`${varPrefix}USERNAME`);
      const password = Deno.env.get(`${varPrefix}PASSWORD`);
      if (userName && password) {
        return [userName, password];
      }
      if (onInvalid.reporter) {
        onInvalid.reporter(
          `${varPrefix}_USERNAME and ${varPrefix}_PASSWORD not available in the environment`,
        );
      }
      return onInvalid.userNamePassword;
    },
  };
}

export function staticAuthnAccessToken(
  userName: string,
  password: string,
): GitLabServerAuthn {
  return {
    glServerUserNamePassword: (): [string, string] => {
      return [userName, password];
    },
  };
}

export interface GitLabServer {
  readonly authn: GitLabServerAuthn;
  readonly host: GitLabHostname;
}

export function envVarGitLabServer(
  serverVarName: string,
  authn: GitLabServerAuthn,
  onInvalid?: {
    server?: GitLabServer;
    reporter?: (message: string) => void;
  },
): GitLabServer | undefined {
  const hostName = Deno.env.get(serverVarName);
  if (hostName) {
    return {
      host: hostName,
      authn: authn,
    };
  }
  if (onInvalid?.reporter) {
    onInvalid.reporter(
      `${serverVarName} not available in the environment`,
    );
  }
  return onInvalid?.server;
}

export interface GitLabRepoIdentity extends git.ManagedGitRepoIdentity {
  readonly group: GitLabGroupID;
  readonly repo: GitLabRepoID;
}

export interface GitLabHttpClientContext
  extends git.ManagedGitRepoEndpointContext {
  requestInit: RequestInit;
  readonly repo: GitLabRepo;
}

// deno-lint-ignore no-empty-interface
export interface GitLabHttpClientResult
  extends git.ManagedGitRepoEndpointResult {
}

export class GitLab
  implements git.GitRepoManager<GitLabRepoIdentity, GitLabRepo> {
  constructor(readonly server: GitLabServer) {
  }
  repo(identity: GitLabRepoIdentity): GitLabRepo {
    return new GitLabRepo(this, identity);
  }
}

export class GitLabRepo implements git.ManagedGitRepo<GitLabRepoIdentity> {
  readonly isGitRepo = true;
  readonly isGitHubRepo = true;
  readonly isRemoteGitRepo = true;
  readonly isManagedGitRepo = true;
  readonly tagsFetch: shc.SafeFetchJSON<gls.GitLabRepoTags>;

  constructor(readonly manager: GitLab, readonly identity: GitLabRepoIdentity) {
    this.tagsFetch = shc.safeFetchJSON;
  }

  url(): git.GitRepoRemoteURL {
    return `https://${this.manager.server.host}/${this.identity.group}/${this.identity.repo}`;
  }

  apiURL(path: "tags"): GitLabRepoURL {
    const encodedRepo = encodeURIComponent(
      `${this.identity.group}/${this.identity.repo}`,
    );
    return `https://${this.manager.server.host}/api/v4/projects/${encodedRepo}/repository/${path}`;
  }

  apiRequestInit(): RequestInit {
    const authn = this.manager.server.authn.glServerUserNamePassword();
    return {
      headers: {
        "PRIVATE-TOKEN": authn[1],
      },
    };
  }

  async repoTags(): Promise<git.GitTags | undefined> {
    const glCtx: GitLabHttpClientContext = {
      isManagedGitRepoEndpointContext: true,
      repo: this,
      request: this.apiURL("tags"),
      requestInit: this.apiRequestInit(),
      options: shc.jsonTraverseOptions<gls.GitLabRepoTags>(
        { guard: gls.isGitLabRepoTags },
      ),
    };
    const glTags = await this.tagsFetch(glCtx);
    if (glTags) {
      const result: git.GitTags = {
        gitRepoTags: [],
      };
      glTags.forEach((tag) => {
        result.gitRepoTags.push({ isGitTag: true, identity: tag.name });
      });
      return result;
    }
    return undefined;
  }

  async repoLatestTag(): Promise<git.GitTag | undefined> {
    const result = await this.repoTags();
    return result ? result.gitRepoTags[0] : undefined;
  }
}
