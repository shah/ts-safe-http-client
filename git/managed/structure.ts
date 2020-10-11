import type { safety } from "./deps.ts";

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
  safety.Enhancer<
    GitManagerStructComponentsPopulatorContext,
    GitManagerStructComponentsSupplier
  > {
}
