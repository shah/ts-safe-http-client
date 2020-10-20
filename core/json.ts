import { inspect as insp, safety } from "./deps.ts";
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
  o: unknown,
): o is TraversalJsonContent<T> {
  return o && typeof o === "object" && "jsonInstance" in o;
}

export interface DetectJsonContentGuard<T> {
  (o: unknown, instance: tr.SuccessfulTraversal): o is T;
}

export interface DetectJsonContentGuardFailure<T> {
  (instance: tr.SuccessfulTraversal): T | undefined;
}

export function jsonContentInspector<T>(
  guard?: DetectJsonContentGuard<T>,
  onGuardFailure?: DetectJsonContentGuardFailure<T>,
): insp.Inspector<RequestInfo> {
  return async (
    instance: RequestInfo | insp.InspectionResult<RequestInfo>,
  ): Promise<
    | RequestInfo
    | insp.InspectionResult<RequestInfo>
    | TraversalJsonContent<T>
  > => {
    if (isTraversalJsonContent(instance)) return instance;
    if (tr.isTraversalContent(instance)) {
      if (instance.contentType.startsWith("application/json")) {
        const struct: TraversalJsonContent<T> = {
          ...instance,
          isStructuredContent: true,
          jsonInstance: await instance.response.json(),
          guard: guard,
          onGuardFailure: onGuardFailure,
        };
        return struct;
      }
    }
    return instance;
  };
}

export interface SafeFetchJsonResultFailureHandler<T> {
  (ttc: RequestInfo | insp.InspectionResult<RequestInfo>): T | undefined;
}

export interface SafeFetchJSON<T> {
  (
    req: tr.Requestable,
    inspector: insp.Inspector<RequestInfo>,
    onInvalidResult?: SafeFetchJsonResultFailureHandler<T>,
  ): Promise<T | undefined>;
}

// TODO: implement body management in safeFetchJSON, see "call" function below that
// needs to be integrated

export async function safeFetchJSON<T>(
  req: tr.Requestable,
  inspectJSON: insp.Inspector<RequestInfo>,
  onInvalidResult?: SafeFetchJsonResultFailureHandler<T>,
): Promise<T | undefined> {
  const travResult = await tr.traverse(
    { ...req, options: {} },
    tr.inspectHttpStatus,
    inspectJSON,
  );
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
