import type { safeHttpClient as shc } from "./deps.ts";

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

export interface ManagedGitRepoEndpointContext extends shc.HttpClientContext {
  readonly isManagedGitRepoEndpointContext: true;
}

export interface ManagedGitRepoEndpointResult {
  readonly isManagedGitRepoEndpointResult: true;
}

export interface ManagedGitRepoEndpoint<
  C extends ManagedGitRepoEndpointContext,
  T extends ManagedGitRepoEndpointResult,
> extends shc.HttpClient<C, T, T> {
  readonly isManagedGitRepoEndpoint: true;
}

export interface ManagedGitRepo extends RemoteGitRepo {
  readonly isManagedGitRepo: true;
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
