import { safety } from "./deps.ts";

export type GitRepoRemoteURL = string;
export type GitBranchIdentity = string;
export type GitTagIdentity = string;

export interface GitRepo {
  readonly isGitRepo: true;
}

export const isGitRepo = safety.typeGuard<GitRepo>(
  "isGitRepo",
);

export interface LocalGitRepo extends GitRepo {
  readonly isLocalGitRepo: true;
}

export const isLocalGitRepo = safety.typeGuard<LocalGitRepo>(
  "isLocalGitRepo",
);

export interface RemoteGitRepo extends GitRepo {
  readonly isRemoteGitRepo: true;
  readonly url: () => GitRepoRemoteURL;
}

export const isRemoteGitRepo = safety.typeGuard<RemoteGitRepo>(
  "isRemoteGitRepo",
);

export interface GitTag {
  readonly isGitTag: true;
  readonly identity: GitTagIdentity;
}

export const isGitTag = safety.typeGuard<GitTag>(
  "isGitTag",
);

export interface GitTags {
  readonly gitRepoTags: GitTag[];
}

export const isGitTags = safety.typeGuard<GitTags>(
  "gitRepoTags",
);
