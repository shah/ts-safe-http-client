import type { safeHttpClient as shc } from "./deps.ts";

// TODO: Add GitStore and JsonIQ capabilities
// * gitrows/gitrows: A lightweight module for using git as a database https://github.com/gitrows/gitrows
// * typicode/lowdb: ⚡️ lowdb is a small local JSON database powered by Lodash (supports Node, Electron and the browser) https://github.com/typicode/lowdb
// * https://github.com/usmakestwo/githubDB
// * https://github.com/superRaytin/gitlab-db
// * JSONiq - The JSON Query Language https://www.jsoniq.org/

export type GitRepoRemoteURL = string;

export interface GitRepo {
  readonly isGitRepo: true;
}

export interface LocalGitRepo extends GitRepo {
  readonly isLocalGitRepo: true;
}

export interface RemoteGitRepo extends GitRepo {
  readonly isRemoteGitRepo: true;
  readonly url: () => GitRepoRemoteURL;
}

export interface ManagedGitRepoEndpointContext extends shc.TraverseContext {
  readonly isManagedGitRepoEndpointContext: true;
}

export interface ManagedGitRepoEndpointResult {
  readonly isManagedGitRepoEndpointResult: true;
}

// deno-lint-ignore no-empty-interface
export interface ManagedGitRepoIdentity {
}

export interface GitRepoManager<
  I extends ManagedGitRepoIdentity,
  R extends ManagedGitRepo<I>,
> {
  readonly repo: (mgri: I) => R;
}

export interface ManagedGitRepo<I extends ManagedGitRepoIdentity>
  extends RemoteGitRepo {
  readonly isManagedGitRepo: true;
  readonly identity: I;
  readonly repoTags: () => Promise<GitTags | undefined>;
  readonly repoLatestTag: () => Promise<GitTag | undefined>;
}

export type GitTagIdentity = string;

export interface GitTag {
  readonly isGitTag: true;
  readonly identity: GitTagIdentity;
}

export interface GitTags {
  readonly gitRepoTags: GitTag[];
}
