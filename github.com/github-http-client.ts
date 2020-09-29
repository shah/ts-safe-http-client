import * as shc from "../core/mod.ts";

export type GitHubOrgID = string;
export type GitHubRepoID = string;
export type GitHubRepoURL = string;

export interface GitHubRepoOwner {
  readonly org: GitHubOrgID;
  readonly repo: GitHubRepoID;
}

export interface GitHubRepo extends GitHubRepoOwner {
  readonly url: () => GitHubRepoURL;
  readonly apiURL: (path: "tags") => GitHubRepoURL;
}

export function gitHubRepo(
  repoSpec: string | GitHubRepoOwner,
): GitHubRepo | undefined {
  let owner: GitHubRepoOwner;
  if (typeof repoSpec === "string") {
    const [org, repo] = repoSpec.split("/");
    owner = { org: org, repo: repo };
  } else owner = repoSpec;
  if (owner.org && owner.repo) {
    return {
      ...owner,
      url: (): GitHubRepoURL => {
        return `https://github.com/${owner.org}/${owner.repo}`;
      },
      apiURL: (path: "tags"): GitHubRepoURL => {
        return `https://api.github.com/repos/${owner.org}/${owner.repo}/${path}`;
      },
    };
  }
}

export interface GitHubHttpClientContext extends shc.HttpClientContext {
  readonly repo: GitHubRepo;
}

export type GitTagIdentity = string;

export interface GitHubTag {
  readonly name: GitTagIdentity;
}

export type GitHubTags = GitHubTag[];

export class GitHubRepoTagsHttpClient
  extends shc.SafeHttpClient<GitHubHttpClientContext, GitHubTags, GitHubTags> {
  static readonly singleton = new GitHubRepoTagsHttpClient();

  async repoTags(repo: GitHubRepo): Promise<GitHubTags | undefined> {
    return await this.fetchJSON({ repo: repo, request: repo.apiURL("tags") });
  }

  async repoLatestTag(repo: GitHubRepo): Promise<GitTagIdentity | undefined> {
    const result = await this.repoTags(repo);
    return result ? result[0].name : undefined;
  }
}
