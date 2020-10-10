import { safeHttpClient as shc } from "./deps.ts";

export interface GitHubRepoTag {
  readonly name: string;
}

export type GitHubRepoTags = GitHubRepoTag[];

export const [isGitHubRepoTag, isGitHubRepoTags] = shc.typeGuards<
  GitHubRepoTag,
  GitHubRepoTags
>("name");
