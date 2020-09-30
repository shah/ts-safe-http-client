import type * as git from "../git.ts";
import { safeHttpClient as shc } from "./deps.ts";

export type GitHubOrgID = string;
export type GitHubRepoID = string;
export type GitHubRepoURL = string;

export interface GitHubRepoOwner {
  readonly org: GitHubOrgID;
  readonly repo: GitHubRepoID;
}

export interface GitHubHttpClientContext
  extends git.ManagedGitRepoEndpointContext {
  readonly repo: GitHubRepo;
}

// deno-lint-ignore no-empty-interface
export interface GitHubHttpClientResult
  extends git.ManagedGitRepoEndpointResult {
}

export class GitHubRepoHttpClient extends shc.SafeHttpClient<
  GitHubHttpClientContext,
  GitHubHttpClientResult,
  GitHubHttpClientResult
> {
}

export interface GitHubRepoTag {
  readonly name: string;
}

export type GitHubRepoTags = GitHubRepoTag[];

export class GitHubRepo implements git.ManagedGitRepo, GitHubRepoOwner {
  readonly isGitRepo = true;
  readonly isGitHubRepo = true;
  readonly isRemoteGitRepo = true;
  readonly isManagedGitRepo = true;
  readonly org: GitHubOrgID;
  readonly repo: GitHubRepoID;
  readonly tagsFetch: shc.SafeFetchJSON<
    GitHubHttpClientContext,
    GitHubRepoTags,
    GitHubRepoTags
  >;

  constructor(repoSpec: string | GitHubRepoOwner) {
    let owner: GitHubRepoOwner;
    if (typeof repoSpec === "string") {
      const [org, repo] = repoSpec.split("/");
      owner = { org: org, repo: repo };
    } else owner = repoSpec;
    this.org = owner.org;
    this.repo = owner.repo;
    this.tagsFetch = shc.safeFetchJSON;
  }

  url(): git.GitRepoRemoteURL {
    return `https://github.com/${this.org}/${this.repo}`;
  }

  apiURL(path: "tags"): GitHubRepoURL {
    return `https://api.github.com/repos/${this.org}/${this.repo}/${path}`;
  }

  async repoTags(): Promise<git.GitTags | undefined> {
    const ghTags = await this.tagsFetch({
      isManagedGitRepoEndpointContext: true,
      repo: this,
      request: this.apiURL("tags"),
    });
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
}
