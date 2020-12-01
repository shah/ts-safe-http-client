import type * as univ from "../universal/mod.ts";
import { safeHttpClient as shc, safety } from "./deps.ts";

export interface ManagedGitContentContext {
  readonly path: string;
  readonly branchOrTag?: univ.GitBranchIdentity | univ.GitTagIdentity;
}

export function prepareManagedGitContent<T>(
  mgcCtx: ManagedGitContentContext,
  trCtx: shc.TraverseContext,
  tr: shc.TraversalResult,
): ManagedGitContent | undefined {
  const common = {
    path: mgcCtx.path,
    // deno-lint-ignore require-await
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
      // deno-lint-ignore require-await
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
        // deno-lint-ignore require-await
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
      // deno-lint-ignore require-await
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

export const isManagedGitContent = safety.typeGuard<ManagedGitContent>(
  "isManagedGitContent",
);

export function managedGitContentTypeGuard<
  T extends ManagedGitContent,
  K extends keyof T = keyof T,
>(
  ...requireKeysInT: K[] // = [...keyof T] TODO: default this to all required keys
): safety.TypeGuard<T> {
  const isSubtype = safety.typeGuardCustom<ManagedGitContent, T>(
    ...requireKeysInT,
  );
  return (o: unknown): o is T => {
    // Make sure that the object passed is a real object and has all required props
    return isManagedGitContent(o) && isSubtype(o);
  };
}

export interface ManagedGitFile<T> extends ManagedGitContent {
  readonly isManagedGitFile: true;
  readonly traverse: () => Promise<shc.TraversalResult>;
  readonly content: () => Promise<T>;
}

export function managedGitFileTypeGuard<
  F,
  T extends ManagedGitFile<F>,
  K extends keyof T = keyof T,
>(
  ...requireKeysInT: K[] // = [...keyof T] TODO: default this to all required keys
): safety.TypeGuardCustom<ManagedGitContent, T> {
  const isSubtype = safety.typeGuardCustom<ManagedGitContent, T>(
    ...requireKeysInT,
  );
  return (o: ManagedGitContent): o is T => {
    // Make sure that the object passed is a real object and has all required props
    return isManagedGitContent(o) && isSubtype(o);
  };
}

export function isManagedGitFile<T>(
  o: ManagedGitContent,
): o is ManagedGitFile<T> {
  return managedGitContentTypeGuard<ManagedGitFile<T>>(
    "isManagedGitFile",
  )(o);
}

export interface ManagedGitTextFile extends ManagedGitFile<string> {
  readonly isManagedGitTextFile: true;
}

export const isManagedGitTextFile = managedGitContentTypeGuard<
  ManagedGitTextFile
>(
  "isManagedGitTextFile",
);

export interface ManagedGitJsonFile<T> extends ManagedGitFile<T> {
  readonly isManagedGitJsonFile: true;
}

export function isManagedGitJsonFile<T>(
  o: ManagedGitContent,
): o is ManagedGitJsonFile<T> {
  return managedGitContentTypeGuard<ManagedGitJsonFile<T>>(
    "isManagedGitJsonFile",
  )(o);
}
