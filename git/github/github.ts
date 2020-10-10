import type * as git from "../git.ts";
import { safeHttpClient as shc, typeGuards, urlcat } from "./deps.ts";

export type GitHubOrgID = string;
export type GitHubRepoID = string;
export type GitHubRepoURL = string;

export interface GitHubRepoIdentity extends git.ManagedGitRepoIdentity {
  readonly org: GitHubOrgID;
  readonly repo: GitHubRepoID;
}

// deno-lint-ignore no-empty-interface
export interface GitHubHttpClientContext
  extends git.ManagedGitRepoEndpointContext {
}

export interface GitHubRepoHttpClientContext extends GitHubHttpClientContext {
  readonly repo: GitHubRepo;
}

// deno-lint-ignore no-empty-interface
export interface GitHubHttpClientResult
  extends git.ManagedGitRepoEndpointResult {
}

export class GitHub
  implements git.GitRepoManager<GitHubRepoIdentity, GitHubRepo> {
  static readonly singleton = new GitHub();

  apiClientContext(
    request: RequestInfo,
    options: shc.TraverseOptions,
  ): GitHubHttpClientContext {
    return {
      isManagedGitRepoEndpointContext: true,
      request,
      options,
    };
  }

  repo(identity: GitHubRepoIdentity): GitHubRepo {
    return new GitHubRepo(this, identity);
  }

  async repos(
    ctx: git.ManagedGitReposContext<GitHubRepo, void>,
  ): Promise<void> {
    throw new Error("TODO: Not implemented yet.");
  }
}

export interface GitHubRepoTag {
  readonly name: string;
}

export type GitHubRepoTags = GitHubRepoTag[];

export const [isGitHubRepoTag, isGitHubRepoTags] = typeGuards<
  GitHubRepoTag,
  GitHubRepoTags
>("name");

export class GitHubRepo implements git.ManagedGitRepo<GitHubRepoIdentity> {
  readonly isGitRepo = true;
  readonly isGitHubRepo = true;
  readonly isRemoteGitRepo = true;
  readonly isManagedGitRepo = true;
  readonly tagsFetch: shc.SafeFetchJSON<GitHubRepoTags>;

  constructor(readonly manager: GitHub, readonly identity: GitHubRepoIdentity) {
    this.tagsFetch = shc.safeFetchJSON;
  }

  apiClientContext(
    request: RequestInfo,
    options: shc.TraverseOptions,
  ): GitHubRepoHttpClientContext {
    return {
      ...this.manager.apiClientContext(request, options),
      repo: this,
    };
  }

  url(): git.GitRepoRemoteURL {
    return urlcat.default(`https://github.com`, "/:org/:repo", {
      org: this.identity.org,
      repo: this.identity.repo,
    });
  }

  orgRepoApiURL(
    pathTemplate: string,
    params?: urlcat.ParamMap,
  ): string {
    return urlcat.default("https://api.github.com", pathTemplate, {
      ...params,
      org: this.identity.org,
      repo: this.identity.repo,
    });
  }

  async repoTags(): Promise<git.GitTags | undefined> {
    const apiCtx = this.apiClientContext(
      this.orgRepoApiURL("/repos/:org/:repo/tags"),
      shc.jsonTraverseOptions<GitHubRepoTags>(
        { guard: isGitHubRepoTags },
      ),
    );
    const ghTags = await this.tagsFetch(apiCtx);
    if (ghTags) {
      const result: git.GitTags = {
        gitRepoTags: [],
      };
      ghTags.forEach((tag) => {
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
    throw new Error("TODO: Not implemented yet.");
  }
}
