import {
  git,
  managedGit as mGit,
  safeHttpClient as shc,
  safety,
  urlcat,
} from "./deps.ts";
import * as gls from "./gitlab-schema.ts";

export interface GitLabApiCallPreparer {
  (
    pathTemplate: string,
    params?: urlcat.ParamMap,
  ): string;
}

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

export interface GitLabRepoIdentity extends mGit.ManagedGitRepoIdentity {
  readonly group: GitLabGroupID;
  readonly repo: GitLabRepoID;
}

export interface GitLabHttpClientContext
  extends mGit.ManagedGitRepoEndpointContext {
  requestInit: RequestInit;
}

export interface GitLabRepoHttpClientContext extends GitLabHttpClientContext {
  readonly repo: GitLabRepo;
}

export interface GitLabGroupPopulateOptions {
  readonly populateGroup: true;
  readonly populateLabels: boolean;
}

export interface GitLabStructComponentsPopulatorContext
  extends mGit.GitManagerStructComponentsPopulatorContext {
  readonly manager: GitLab;
  readonly filterGroups?: (
    group: gls.GitLabGroup,
  ) => GitLabGroupPopulateOptions | false;
}

export const isGitLabStructComponentsPopulatorContext = safety.typeGuardCustom<
  mGit.GitManagerStructComponentsPopulatorContext,
  GitLabStructComponentsPopulatorContext
>("manager");

export function defaultGitLabStructComponentsPopulatorContext(
  manager: GitLab,
): GitLabStructComponentsPopulatorContext {
  return {
    isGitManagerStructComponentsPopulatorContext: true,
    manager: manager,
    populator: PopulateTopLevelGroups.singleton,
  };
}

export class PopulateTopLevelGroups
  implements mGit.GitStructComponentsPopulator {
  static readonly singleton = new PopulateTopLevelGroups();

  async enhance(
    ctx: mGit.GitManagerStructComponentsPopulatorContext,
    instance: mGit.GitManagerStructComponentsSupplier,
  ): Promise<mGit.GitManagerStructComponentsSupplier> {
    if (isGitLabStructComponentsPopulatorContext(ctx)) {
      const apiClientCtx = ctx.manager.apiClientContext(
        ctx.manager.managerApiURL("groups", { top_level_only: true }),
        shc.jsonTraverseOptions<gls.GitLabGroups>(
          { guard: gls.isGitLabGroups },
        ),
      );
      const groups = await shc.safeFetchJSON<gls.GitLabGroups>(
        apiClientCtx,
      );
      if (groups) {
        for (const group of groups) {
          let gpo: GitLabGroupPopulateOptions | false = false;
          if (ctx.filterGroups) {
            gpo = ctx.filterGroups(group);
            if (!gpo) continue;
          }
          const component = new GitLabStructComponent(group);
          instance.components.push(component);
        }
      }
    }
    return instance;
  }
}

export class GitLabStructComponent
  implements mGit.GitManagerHierarchicalComponent {
  protected populated: boolean;
  protected subGroups: GitLabStructComponent[] = [];

  constructor(
    readonly group: gls.GitLabGroup,
    readonly level: number = 0,
    readonly parentGroup?: GitLabStructComponent,
  ) {
    this.populated = false;
  }

  get name(): string {
    return this.group.name;
  }

  get components(): GitLabStructComponent[] {
    return this.subGroups;
  }

  get parent(): GitLabStructComponent | undefined {
    return this.parentGroup;
  }

  get isTopLevel(): boolean {
    return this.level == 0;
  }

  get hasChildren(): boolean {
    return this.components.length > 0;
  }
}

export class GitLabStructure implements mGit.GitManagerStructure {
  protected groupsFetch: shc.SafeFetchJSON<gls.GitLabGroups>;
  protected populated: boolean;
  protected groups: GitLabStructComponent[] = [];

  constructor(readonly manager: GitLab) {
    this.groupsFetch = shc.safeFetchJSON;
    this.populated = false;
  }

  get components(): GitLabStructComponent[] {
    return this.groups;
  }
}

export class GitLab
  implements mGit.GitManager<GitLabStructure, GitLabRepoIdentity, GitLabRepo> {
  constructor(readonly server: GitLabServer) {
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

  async structure(
    ctx: mGit.GitManagerStructComponentsPopulatorContext =
      defaultGitLabStructComponentsPopulatorContext(this),
  ): Promise<mGit.GitManagerStructure> {
    const result = new GitLabStructure(this);
    await ctx.populator.enhance(ctx, result);
    return result;
  }

  repo(identity: GitLabRepoIdentity): GitLabRepo {
    return new GitLabRepo(this, identity);
  }

  async repos(
    ctx: mGit.ManagedGitReposContext<GitLabRepo, void>,
  ): Promise<void> {
    throw new Error("Not implemented yet");
  }
}

export class GitLabRepo implements mGit.ManagedGitRepo<GitLabRepoIdentity> {
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
    ctx: mGit.ManagedGitContentContext,
  ): Promise<mGit.ManagedGitContent | undefined> {
    const apiClientCtx = this.apiClientContext(
      this.groupRepoApiURL(
        "projects/:encodedGroupRepo/repository/files/:filePath/raw",
        { filePath: ctx.path, ref: ctx.branchOrTag || "master" },
      ),
      shc.defaultTraverseOptions(),
    );
    const tr = await shc.traverse(apiClientCtx);
    return mGit.prepareManagedGitContent(ctx, apiClientCtx, tr);
  }
}
