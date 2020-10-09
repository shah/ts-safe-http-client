import type * as git from "../git.ts";
import { safeHttpClient as shc, urlcat } from "./deps.ts";

export type GitHubOrgID = string;
export type GitHubRepoID = string;
export type GitHubRepoURL = string;

export interface GitHubRepoIdentity extends git.ManagedGitRepoIdentity {
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

export class GitHub
  implements git.GitRepoManager<GitHubRepoIdentity, GitHubRepo> {
  static readonly singleton = new GitHub();

  repo(identity: GitHubRepoIdentity): GitHubRepo {
    return new GitHubRepo(identity);
  }
}

export interface GitHubRepoTag {
  readonly name: string;
}

export type GitHubRepoTags = GitHubRepoTag[];

/**
 * Make sure that the object passed is in is an array and that each
 * element of the array is an object with a "name" property
 * @param o object passed in from HTTP client fetch
 */
export function isGitHubRepoTags(o: unknown): o is GitHubRepoTags {
  return o && Array.isArray(o) &&
    o.filter((tag) => typeof tag !== "object" || !("name" in tag)).length == 0;
}

export class GitHubRepo implements git.ManagedGitRepo<GitHubRepoIdentity> {
  readonly isGitRepo = true;
  readonly isGitHubRepo = true;
  readonly isRemoteGitRepo = true;
  readonly isManagedGitRepo = true;
  readonly tagsFetch: shc.SafeFetchJSON<GitHubRepoTags>;

  constructor(readonly identity: GitHubRepoIdentity) {
    this.tagsFetch = shc.safeFetchJSON;
  }

  url(): git.GitRepoRemoteURL {
    return urlcat.default(`https://github.com`, "/:org/:repo", {
      org: this.identity.org,
      repo: this.identity.repo,
    });
  }

  apiURL(
    pathTemplate: string,
    params: urlcat.ParamMap = {
      org: this.identity.org,
      repo: this.identity.repo,
    },
  ): string {
    return urlcat.default("https://api.github.com", pathTemplate, params);
  }

  async repoTags(): Promise<git.GitTags | undefined> {
    const ghCtx: GitHubHttpClientContext = {
      isManagedGitRepoEndpointContext: true,
      repo: this,
      request: this.apiURL("/repos/:org/:repo/tags"),
      options: shc.jsonTraverseOptions<GitHubRepoTags>(
        { guard: isGitHubRepoTags },
      ),
    };
    const ghTags = await this.tagsFetch(ghCtx);
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
