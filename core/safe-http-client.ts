import * as enh from "./enhance.ts";
import * as tr from "./traverse.ts";

export function jsonTraverseOptions<T>(
  override?: Partial<tr.TraverseOptions> & {
    guard?: tr.DetectJsonContentGuard<T>;
    onGuardFailure?: tr.DetectJsonContentGuardFailure<T>;
  },
): tr.TraverseOptions {
  const result: tr.TraverseOptions = {
    ...override,
    trEnhancer: override?.trEnhancer || enh.enhancer(
      new tr.DetectJsonContent<T>(override?.guard, override?.onGuardFailure),
    ),
  };
  return result;
}

export interface SafeFetchJsonResultFailureHandler<T> {
  (ttc: tr.TraversalResult): T | undefined;
}

export interface SafeFetchJSON<T> {
  (
    req: tr.Requestable,
    options?: tr.TraverseOptions,
    onInvalidResult?: SafeFetchJsonResultFailureHandler<T>,
  ): Promise<T | undefined>;
}

export async function safeFetchJSON<T>(
  req: tr.Requestable,
  options: tr.TraverseOptions = jsonTraverseOptions<T>(),
  onInvalidResult?: SafeFetchJsonResultFailureHandler<T>,
): Promise<T | undefined> {
  const travResult = await tr.traverse({ ...req, options });
  if (tr.isTraversalJsonContent<T>(travResult)) {
    if (travResult.guard) {
      if (travResult.guard(travResult.jsonInstance, travResult)) {
        return travResult.jsonInstance;
      } else {
        if (travResult.onGuardFailure) {
          return travResult.onGuardFailure(travResult);
        }
      }
    } else {
      return travResult.jsonInstance ? travResult.jsonInstance as T : undefined;
    }
  }
  if (onInvalidResult) {
    return onInvalidResult(travResult);
  }
  return undefined;
}
