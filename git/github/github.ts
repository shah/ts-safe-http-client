import type * as git from "../git.ts";
import { safeHttpClient as shc, urlcat } from "./deps.ts";
import * as ghs from "./github-schema.ts";

export type GitHubOrgID = string;
export type GitHubRepoID = string;
export type GitHubRepoURL = string;

export interface GitHubRepoIdentity extends git.ManagedGitRepoIdentity {
  readonly org: GitHubOrgID;
  readonly repo: GitHubRepoID;
}

// deno-lint-ignore no-empty-interface
export interface GitHubStructure extends git.GitManagerStructure {
}

// deno-lint-ignore no-empty-interface
export interface GitHubOrg extends git.GitManagerStructComponent {
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
  implements git.GitManager<GitHubStructure, GitHubRepoIdentity, GitHubRepo> {
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

  async structure(
    ctx: git.GitManagerStructComponentsPopulatorContext,
  ): Promise<git.GitManagerStructure> {
    throw new Error("Not implemented yet");
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

export class GitHubRepo implements git.ManagedGitRepo<GitHubRepoIdentity> {
  readonly isGitRepo = true;
  readonly isGitHubRepo = true;
  readonly isRemoteGitRepo = true;
  readonly isManagedGitRepo = true;
  readonly tagsFetch: shc.SafeFetchJSON<ghs.GitHubRepoTags>;

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
      shc.jsonTraverseOptions<ghs.GitHubRepoTags>(
        { guard: ghs.isGitHubRepoTags },
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
