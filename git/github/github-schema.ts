import { safety } from "./deps.ts";

export interface GitHubRepoTag {
  readonly name: string;
}

export type GitHubRepoTags = GitHubRepoTag[];

export const [isGitHubRepoTag, isGitHubRepoTags] = safety.typeGuards<
  GitHubRepoTag,
  GitHubRepoTags
>("name");
