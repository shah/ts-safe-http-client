import { safety } from "./deps.ts";
import * as tr from "./traverse.ts";

// TODO: Add strongly-typed validation libraries in guards
// * [Computed-Types](https://github.com/neuledge/computed-types)
// * [segno (Segnosaurus)](https://segno.js.org/) validation library
// * [garn\-validator](https://github.com/jupegarnica/garn-validator)
//
// TODO: Add JSON "cleansing" and transformation for further safety
// * [json\-patch\-es6](https://www.skypack.dev/npm/json-patch-es6)
// * [JSON\-Patch](https://github.com/Starcounter-Jack/JSON-Patch)

export interface TraversalJsonContent<T> extends tr.TraversalStructuredContent {
  readonly jsonInstance: T;
  readonly guard?: DetectJsonContentGuard<T>;
  readonly onGuardFailure?: DetectJsonContentGuardFailure<T>;
}

export function isTraversalJsonContent<T>(
  o: tr.TraversalResult,
): o is TraversalJsonContent<T> {
  return "jsonInstance" in o;
}

export interface DetectJsonContentGuard<T> {
  (o: unknown, instance: tr.SuccessfulTraversal): o is T;
}

export interface DetectJsonContentGuardFailure<T> {
  (instance: tr.SuccessfulTraversal): T | undefined;
}

export class DetectJsonContent<T> implements tr.TraversalResultEnhancer {
  constructor(
    readonly guard?: DetectJsonContentGuard<T>,
    readonly onGuardFailure?: DetectJsonContentGuardFailure<T>,
  ) {
  }

  isProperContentType(instance: tr.TraversalContent): boolean {
    return instance.contentType.startsWith("application/json");
  }

  async enhance(
    ctx: tr.TraverseContext,
    instance: tr.SuccessfulTraversal,
  ): Promise<tr.SuccessfulTraversal | tr.TraversalTextContent> {
    instance = await tr.ValidateStatus.singleton.enhance(ctx, instance);
    if (isTraversalJsonContent(instance)) return instance;
    if (tr.isTraversalContent(instance)) {
      if (this.isProperContentType(instance)) {
        const textContent: TraversalJsonContent<T> = {
          ...instance,
          isStructuredContent: true,
          jsonInstance: await instance.response.json(),
          guard: this.guard,
          onGuardFailure: this.onGuardFailure,
        };
        return textContent;
      }
    }
    return instance;
  }
}

export function jsonTraverseOptions<T>(
  override?: Partial<tr.TraverseOptions> & {
    guard?: DetectJsonContentGuard<T>;
    onGuardFailure?: DetectJsonContentGuardFailure<T>;
  },
): tr.TraverseOptions {
  const result: tr.TraverseOptions = {
    ...override,
    trEnhancer: override?.trEnhancer || safety.enhancer(
      new DetectJsonContent<T>(override?.guard, override?.onGuardFailure),
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

// TODO: implement body management in safeFetchJSON, see "call" function below that
// needs to be integrated

export async function safeFetchJSON<T>(
  req: tr.Requestable,
  options: tr.TraverseOptions = jsonTraverseOptions<T>(),
  onInvalidResult?: SafeFetchJsonResultFailureHandler<T>,
): Promise<T | undefined> {
  const travResult = await tr.traverse({ ...req, options });
  if (isTraversalJsonContent<T>(travResult)) {
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
