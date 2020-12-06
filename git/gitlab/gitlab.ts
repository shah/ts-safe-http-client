import {
  inspect as insp,
  managedGit as mGit,
  safeHttpClient as shc,
  urlcat,
  vault as v,
} from "./deps.ts";
import * as glg from "./groups.ts";
import * as glr from "./repos.ts";
export interface GitLabApiCallPreparer {
  (
    pathTemplate: string,
    params?: urlcat.ParamMap,
  ): string;
}

export type GitLabHostname = string;

export interface GitLabServerAuthn {
  readonly userName: v.VaultAttr;
  readonly accessToken: v.VaultAttr;
}

export class GitLabAuthnEnvVault {
  readonly vault: v.EnvironmentVault;

  constructor(vault?: v.EnvironmentVault) {
    this.vault = vault ||
      new v.EnvironmentVault(
        { commonNamespace: "GITLAB_", secretsNamespace: "GITLAB_SECRET_" },
      );
  }

  userName(hostID: string, defaultUser?: string): v.VaultAttr {
    return this.vault.defineEnvVar(
      `${hostID}_USER`,
      { defaultValue: defaultUser },
    );
  }

  accessToken(hostID: string, defaultToken?: string): v.VaultAttr {
    return this.vault.defineEnvVar(
      `${hostID}_TOKEN`,
      { defaultValue: defaultToken, isSecret: true },
    );
  }

  hostName(hostID: string, defaultHost?: string): GitLabHostname {
    const serverHostEnvVarName = this.vault.defineEnvVar(
      `${hostID}_HOST`,
      { defaultValue: defaultHost },
    );
    return serverHostEnvVarName.value() as string;
  }

  isServerConfigAvailable(hostID: string, defaultHostName?: string): boolean {
    const hostName = this.hostName(hostID, defaultHostName);
    const userName = this.userName(hostID).value();
    const accessToken = this.accessToken(hostID).value();
    return hostName && userName && accessToken ? true : false;
  }

  server(hostID: string, defaultHostName?: string): GitLabServer | undefined {
    const hostName = this.hostName(hostID, defaultHostName);
    const userName = this.userName(hostID);
    const accessToken = this.accessToken(hostID);
    if (hostName && userName.value() && accessToken.value()) {
      return {
        host: hostName,
        authn: { userName, accessToken },
      };
    }
    return undefined;
  }
}

export interface GitLabServer {
  readonly authn: GitLabServerAuthn;
  readonly host: GitLabHostname;
}

export interface GitLabHttpClientContext
  extends mGit.ManagedGitRepoEndpointContext {
  requestInit: RequestInit;
}

export class GitLab implements
  mGit.GitManager<
    glg.GitLabStructure,
    glr.GitLabRepoIdentity,
    glr.GitLabRepo
  > {
  readonly typicalGroupsPopulator = glg.gitLabGroupsPopulator(this);

  constructor(readonly server: GitLabServer) {
  }

  apiRequestInit(): RequestInit {
    const authn = this.server.authn.accessToken.value();
    return {
      headers: {
        "PRIVATE-TOKEN": (authn as string) || "accessToken?",
      },
    };
  }

  apiClientContext(
    request: RequestInfo,
    options?: shc.TraverseOptions,
  ): GitLabHttpClientContext {
    return {
      isManagedGitRepoEndpointContext: true,
      request: request,
      requestInit: this.apiRequestInit(),
      options: options || shc.defaultTraverseOptions(),
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

  async structure(): Promise<glg.GitLabStructure> {
    const populated = await this.typicalGroupsPopulator(
      new glg.GitLabStructure(this),
    );
    return insp.inspectionTarget(populated);
  }

  repo(identity: glr.GitLabRepoIdentity): glr.GitLabRepo {
    return new glr.GitLabRepo(this, identity);
  }

  // deno-lint-ignore require-await
  async repos(
    ctx: mGit.ManagedGitReposContext<glr.GitLabRepo, void>,
  ): Promise<void> {
    throw new Error("Not implemented yet");
  }
}
