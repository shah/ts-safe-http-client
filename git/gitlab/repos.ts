import {
  git,
  inspect as insp,
  managedGit as mGit,
  safeHttpClient as shc,
  urlcat,
  vault as v,
} from "./deps.ts";
import * as gls from "./gitlab-schema.ts";
import * as gl from "./gitlab.ts";
import * as glg from "./groups.ts";

export type GitLabRepoID = string;
export type GitLabRepoURL = string;

export interface GitLabRepoIdentity extends mGit.ManagedGitRepoIdentity {
  readonly group: glg.GitLabGroupID;
  readonly repo: GitLabRepoID;
}

export interface GitLabRepoHttpClientContext
  extends gl.GitLabHttpClientContext {
  readonly repo: GitLabRepo;
}

export class GitLabRepo implements mGit.ManagedGitRepo<GitLabRepoIdentity> {
  readonly isGitRepo = true;
  readonly isGitHubRepo = true;
  readonly isRemoteGitRepo = true;
  readonly isManagedGitRepo = true;
  readonly tagsFetch: shc.SafeFetchJSON<gls.GitLabRepoTags>;

  constructor(
    readonly manager: gl.GitLab,
    readonly identity: GitLabRepoIdentity,
  ) {
    this.tagsFetch = shc.safeFetchJSON;
  }

  apiClientContext(
    request: RequestInfo,
    options?: shc.TraverseOptions,
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
    );
    const glTags = await this.tagsFetch(
      apiClientCtx,
      shc.jsonContentInspector(gls.isGitLabRepoTags),
    );
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
    const tr = await shc.traverse(
      apiClientCtx,
      shc.inspectHttpStatus,
      shc.inspectTextContent,
      shc.inspectHtmlContent,
      // shc.downloadInspector(),
      // shc.inspectFavIcon,
    );
    return shc.isTraversalContent(tr)
      ? mGit.prepareManagedGitContent(ctx, apiClientCtx, tr)
      : undefined;
  }
}
