import type * as univ from "../universal/mod.ts";
import type * as c from "./content.ts";
import type { safeHttpClient as shc } from "./deps.ts";

export interface ManagedGitRepoEndpointContext extends shc.TraverseContext {
  readonly isManagedGitRepoEndpointContext: true;
}

export interface ManagedGitRepoEndpointResult {
  readonly isManagedGitRepoEndpointResult: true;
}

// deno-lint-ignore no-empty-interface
export interface ManagedGitRepoIdentity {
}

// deno-lint-ignore no-empty-interface
export interface ManagedGitProjectIdentity {
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

export interface ManagedGitRepo<I extends ManagedGitRepoIdentity>
  extends univ.RemoteGitRepo {
  readonly isManagedGitRepo: true;
  readonly identity: I;
  readonly repoTags: () => Promise<univ.GitTags | undefined>;
  readonly repoLatestTag: () => Promise<univ.GitTag | undefined>;
  readonly content: (
    ctx: c.ManagedGitContentContext,
  ) => Promise<c.ManagedGitContent | undefined>;
}

export interface ManagedGitProject<I extends ManagedGitProjectIdentity> {
  readonly isManagedGitProject: true;
  readonly identity: I;
}
