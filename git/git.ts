import { safeHttpClient as shc } from "./deps.ts";

// TODO: Add GitStore and JsonIQ capabilities
// * gitrows/gitrows: A lightweight module for using git as a database https://github.com/gitrows/gitrows
// * typicode/lowdb: ⚡️ lowdb is a small local JSON database powered by Lodash (supports Node, Electron and the browser) https://github.com/typicode/lowdb
// * https://github.com/usmakestwo/githubDB
// * https://github.com/superRaytin/gitlab-db
// * JSONiq - The JSON Query Language https://www.jsoniq.org/

// Terminology -- "managed" means that it's in GitHub, GitLab, BitBucket or another "git manager".
// If something isn't marked with "managed" it means it's raw Git, with or without a manager

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

export interface GitManagerStructComponentsSupplier {
  readonly components: GitManagerStructComponent[];
}

// deno-lint-ignore no-empty-interface
export interface GitManagerStructure
  extends GitManagerStructComponentsSupplier {
}

export interface GitManagerStructComponent {
  readonly name: string;
}

export interface GitManagerHierarchicalComponent
  extends GitManagerStructComponent, GitManagerStructComponentsSupplier {
  readonly parent?: GitManagerHierarchicalComponent;
  readonly level: number;
  readonly isTopLevel: boolean;
  readonly hasChildren: boolean;
}

export interface GitManagerStructComponentsPopulatorContext {
  readonly isGitManagerStructComponentsPopulatorContext: true;
  readonly populator: GitStructComponentsPopulator;
}

// deno-lint-ignore no-empty-interface
export interface GitStructComponentsPopulator extends
  shc.Enhancer<
    GitManagerStructComponentsPopulatorContext,
    GitManagerStructComponentsSupplier
  > {
}

// deno-lint-ignore no-empty-interface
export interface ManagedGitRepoIdentity {
}

export interface ManagedGitRepoHandler<C, R, T> {
  (ctx: C, repo: R): Promise<T>;
}

export interface ManagedGitRepoHandlerSync<C, R, T> {
  (ctx: C, repo: R): T;
}

export interface ManagedGitReposContext<R, T> {
  readonly handle: ManagedGitRepoHandler<ManagedGitReposContext<R, T>, R, T>;
}

export interface GitManager<
  S extends GitManagerStructure,
  I extends ManagedGitRepoIdentity,
  R extends ManagedGitRepo<I>,
> {
  readonly structure: (
    ctx: GitManagerStructComponentsPopulatorContext,
  ) => Promise<GitManagerStructure>;
  readonly repo: (identity: I) => R;
  readonly repos: (ctx: ManagedGitReposContext<R, void>) => Promise<void>;
}

export interface ManagedGitRepo<I extends ManagedGitRepoIdentity>
  extends RemoteGitRepo {
  readonly isManagedGitRepo: true;
  readonly identity: I;
  readonly repoTags: () => Promise<GitTags | undefined>;
  readonly repoLatestTag: () => Promise<GitTag | undefined>;
  readonly content: (
    ctx: ManagedGitContentContext,
  ) => Promise<ManagedGitContent | undefined>;
}

export type GitBranchIdentity = string;

export interface ManagedGitContentContext {
  readonly path: string;
  readonly branchOrTag?: GitBranchIdentity | GitTagIdentity;
  readonly enrichContent?: ManagedGitContentEnhancer;
}

// deno-lint-ignore no-empty-interface
export interface ManagedGitContentEnhancer
  extends shc.Enhancer<ManagedGitContentContext, ManagedGitContent> {
}

export function prepareManagedGitContent<T>(
  mgcCtx: ManagedGitContentContext,
  trCtx: shc.TraverseContext,
  tr: shc.TraversalResult,
): ManagedGitContent | undefined {
  const common = {
    path: mgcCtx.path,
    traverse: async (): Promise<shc.TraversalResult> => {
      return tr;
    },
  };

  if (shc.isTraversalJsonContent<T>(tr)) {
    const result: ManagedGitJsonFile<T> = {
      ...common,
      isManagedGitContent: true,
      isManagedGitFile: true,
      isManagedGitJsonFile: true,
      content: async (): Promise<T> => {
        return tr.jsonInstance;
      },
    };
    return result;
  }

  if (shc.isTraversalTextContent(tr)) {
    if (mgcCtx.path.endsWith(".json")) {
      const json: ManagedGitJsonFile<T> = {
        ...common,
        isManagedGitContent: true,
        isManagedGitFile: true,
        isManagedGitJsonFile: true,
        content: async (): Promise<T> => {
          return JSON.parse(tr.bodyText);
        },
      };
      return json;
    }

    const text: ManagedGitTextFile = {
      ...common,
      isManagedGitContent: true,
      isManagedGitFile: true,
      isManagedGitTextFile: true,
      content: async (): Promise<string> => {
        return tr.bodyText;
      },
    };
    return text;
  }

  return undefined;
}

export interface ManagedGitContent {
  readonly isManagedGitContent: true;
  readonly path: string;
}

export interface ManagedGitFile<T> extends ManagedGitContent {
  readonly isManagedGitFile: true;
  readonly traverse: () => Promise<shc.TraversalResult>;
  readonly content: () => Promise<T>;
  //readonly commit: (content: T) => void;
}

export function isManagedGitFile<T>(
  o: ManagedGitContent,
): o is ManagedGitFile<T> {
  return o && typeof o === "object" && "isManagedGitFile" in o;
}

export interface ManagedGitTextFile extends ManagedGitFile<string> {
  readonly isManagedGitTextFile: true;
}

export function isManagedGitTextFile(
  o: ManagedGitContent,
): o is ManagedGitTextFile {
  return o && typeof o === "object" && "isManagedGitTextFile" in o;
}

export interface ManagedGitJsonFile<T> extends ManagedGitFile<T> {
  readonly isManagedGitJsonFile: true;
}

export function isManagedGitJsonFile<T>(
  o: ManagedGitContent,
): o is ManagedGitJsonFile<T> {
  return o && typeof o === "object" && "isManagedGitJsonFile" in o;
}

export type GitTagIdentity = string;

export interface GitTag {
  readonly isGitTag: true;
  readonly identity: GitTagIdentity;
}

export interface GitTags {
  readonly gitRepoTags: GitTag[];
}
