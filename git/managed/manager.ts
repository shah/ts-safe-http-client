import type * as repo from "./repo.ts";
import type * as struct from "./structure.ts";

export interface GitManager<
  S extends struct.GitManagerStructure,
  I extends repo.ManagedGitRepoIdentity,
  R extends repo.ManagedGitRepo<I>,
> {
  readonly structure: () => Promise<struct.GitManagerStructure>;
  readonly repo: (identity: I) => R;
  readonly repos: (ctx: repo.ManagedGitReposContext<R, void>) => Promise<void>;
}
