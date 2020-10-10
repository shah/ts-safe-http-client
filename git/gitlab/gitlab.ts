import * as git from "../git.ts";
import { safeHttpClient as shc, urlcat } from "./deps.ts";
import * as gls from "./gitlab-schema.ts";

export type GitLabHostname = string;
export type GitLabGroupID = string;
export type GitLabRepoID = string;
export type GitLabRepoURL = string;

export interface GitLabServerAuthn {
  readonly glServerUserNamePasswdAvailable: () => boolean;
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
    glServerUserNamePasswdAvailable: (): boolean => {
      const userName = Deno.env.get(`${varPrefix}USERNAME`);
      const password = Deno.env.get(`${varPrefix}PASSWORD`);
      return userName != undefined && password != undefined;
    },
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
    glServerUserNamePasswdAvailable: (): boolean => {
      return true;
    },
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
}

export interface GitLabRepoHttpClientContext extends GitLabHttpClientContext {
  readonly repo: GitLabRepo;
}

// deno-lint-ignore no-empty-interface
export interface GitLabHttpClientResult
  extends git.ManagedGitRepoEndpointResult {
}

export class GitLab
  implements git.GitRepoManager<GitLabRepoIdentity, GitLabRepo> {
  readonly groupsFetch: shc.SafeFetchJSON<gls.GitLabGroups>;

  constructor(readonly server: GitLabServer) {
    this.groupsFetch = shc.safeFetchJSON;
  }

  apiRequestInit(): RequestInit {
    const authn = this.server.authn.glServerUserNamePassword();
    return {
      headers: {
        "PRIVATE-TOKEN": authn[1],
      },
    };
  }

  apiClientContext(
    request: RequestInfo,
    options: shc.TraverseOptions,
  ): GitLabHttpClientContext {
    return {
      isManagedGitRepoEndpointContext: true,
      request: request,
      requestInit: this.apiRequestInit(),
      options: options,
    };
  }

  managerApiURL(
    pathTemplate: string,
    params?: urlcat.ParamMap,
  ): string {
    return urlcat.default(
      `https://${this.server.host}/api/v4`,
      pathTemplate,
      { ...params },
    );
  }

  repo(identity: GitLabRepoIdentity): GitLabRepo {
    return new GitLabRepo(this, identity);
  }

  async repos(
    ctx: git.ManagedGitReposContext<GitLabRepo, void>,
  ): Promise<void> {
    const apiClientCtx = this.apiClientContext(
      this.managerApiURL("groups"),
      shc.jsonTraverseOptions<gls.GitLabGroups>(
        { guard: gls.isGitLabGroups },
      ),
    );
    const groups = await this.groupsFetch(apiClientCtx);
    if (groups) {
      for (const group of groups) {
        //console.dir(group);
        //await ctx.handle(ctx, group);
      }
    }
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

  apiClientContext(
    request: RequestInfo,
    options: shc.TraverseOptions,
  ): GitLabRepoHttpClientContext {
    return {
      ...this.manager.apiClientContext(request, options),
      repo: this,
    };
  }

  url(): git.GitRepoRemoteURL {
    return `https://${this.manager.server.host}/${this.identity.group}/${this.identity.repo}`;
  }

  groupRepoApiURL(
    pathTemplate: string,
    params?: urlcat.ParamMap,
  ): string {
    return urlcat.default(
      `https://${this.manager.server.host}/api/v4`,
      pathTemplate,
      {
        ...params,
        // GitLab wants the group/sub-group/repo to be a single URL-encode string
        encodedGroupRepo: [this.identity.group, this.identity.repo].join("/"),
      },
    );
  }

  async repoTags(): Promise<git.GitTags | undefined> {
    const apiClientCtx = this.apiClientContext(
      this.groupRepoApiURL(
        "projects/:encodedGroupRepo/repository/tags",
      ),
      shc.jsonTraverseOptions<gls.GitLabRepoTags>(
        { guard: gls.isGitLabRepoTags },
      ),
    );
    const glTags = await this.tagsFetch(apiClientCtx);
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

  async content(
    ctx: git.ManagedGitContentContext,
  ): Promise<git.ManagedGitContent | undefined> {
    const apiClientCtx = this.apiClientContext(
      this.groupRepoApiURL(
        "projects/:encodedGroupRepo/repository/files/:filePath/raw",
        { filePath: ctx.path, ref: ctx.branchOrTag || "master" },
      ),
      shc.defaultTraverseOptions(),
    );
    const tr = await shc.traverse(apiClientCtx);
    return git.prepareManagedGitContent(ctx, apiClientCtx, tr);
  }
}
