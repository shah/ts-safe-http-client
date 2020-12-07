import {
  git,
  managedGit as mGit,
  safeHttpClient as shc,
  safety,
  urlcat,
} from "./deps.ts";
import * as gls from "./gitlab-schema.ts";
import * as gl from "./gitlab.ts";
import * as glg from "./group.ts";
import * as glp from "./project.ts";

export type GitLabRepoID = string;
export type GitLabRepoURL = string;

export interface GitLabRepoIdentity extends mGit.ManagedGitRepoIdentity {
  readonly repo: GitLabRepoID;
}

export interface GitLabGroupRepoIdentity extends GitLabRepoIdentity {
  readonly group: glg.GitLabGroupID;
}

export const isGitLabGroupRepoIdentity = safety.typeGuard<
  GitLabGroupRepoIdentity
>("repo", "group");

export interface GitLabProjectRepoIdentity extends GitLabRepoIdentity {
  readonly project: glp.GitLabProjectID;
}

export const isGitLabProjectRepoIdentity = safety.typeGuard<
  GitLabProjectRepoIdentity
>("repo", "project");

export interface GitLabRepoHttpClientContext
  extends gl.GitLabHttpClientContext {
  readonly repo: GitLabRepo;
}

export class GitLabRepo implements mGit.ManagedGitRepo<GitLabRepoIdentity> {
  readonly isGitRepo = true;
  readonly isGitLabRepo = true;
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
    if (isGitLabGroupRepoIdentity(this.identity)) {
      return `https://${this.manager.server.host}/${this.identity.group}/${this.identity.repo}`;
    } else if (isGitLabProjectRepoIdentity(this.identity)) {
      return `https://${this.manager.server.host}/${this.identity.project}/${this.identity.repo}`;
    } else {
      return `https://${this.manager.server.host}/<unknown repo identity type>`;
    }
  }

  groupRepoApiURL(
    pathTemplate: string,
    params?: urlcat.ParamMap,
  ): string {
    let glRepoPath;
    if (isGitLabGroupRepoIdentity(this.identity)) {
      glRepoPath = [this.identity.group, this.identity.repo].join("/");
    } else if (isGitLabProjectRepoIdentity(this.identity)) {
      glRepoPath = [this.identity.project, this.identity.repo].join("/");
    } else {
      glRepoPath = `<unknown repo identity type>`;
    }
    return urlcat.default(
      `https://${this.manager.server.host}/api/v4`,
      pathTemplate,
      {
        ...params,
        encodedRepoPath: glRepoPath,
      },
    );
  }

  async repoTags(): Promise<git.GitTags | undefined> {
    const apiClientCtx = this.apiClientContext(
      this.groupRepoApiURL(
        "projects/:encodedRepoPath/repository/tags",
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
        "projects/:encodedRepoPath/repository/files/:filePath/raw",
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
