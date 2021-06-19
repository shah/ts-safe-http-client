import { inspect as insp } from "./deps.ts";
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
  if (o && typeof o === "object") return "jsonInstance" in o;
  return false;
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
): tr.RequestInfoInspector {
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
    inspector: tr.RequestInfoInspector,
    onInvalidResult?: SafeFetchJsonResultFailureHandler<T>,
  ): Promise<T | undefined>;
}

/**
 * safeFetchJSON executes an HTTP fetch and returns a guarded or unguarded
 * JSON object when the caller does not care about  HTTP  response. If caller
 * needs anything in the HTTP response, use `safeFetchJsonResult`.
 * @param req HTTP request
 * @param inspectJSON the inspector to run after HTTP fetch
 * @param onInvalidResult callback for invalid fetch request
 */
export async function safeFetchJSON<T>(
  req: tr.Requestable,
  inspectJSON: tr.RequestInfoInspector,
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

/**
 * safeTraverseJSON executes an HTTP fetch and returns a raw JSON traversal
 * result without guard checks. `safeTraverseJSON` should be used when HTTP
 * headers (e.g. RFC 8288 Link resources) or other response object properties
 * are needed. This function does not check the JSON type guards so that's the
 * responsibility of the caller.
 * @param req HTTP request
 * @param inspectJSON the inspector to run after HTTP fetch
 * @param onInvalidResult callback for invalid fetch request
 */
export async function safeTraverseJSON<T>(
  req: tr.Requestable,
  inspectJSON: tr.RequestInfoInspector,
  onInvalidResult?: SafeFetchJsonResultFailureHandler<TraversalJsonContent<T>>,
): Promise<TraversalJsonContent<T> | undefined> {
  const travResult = await tr.traverse(
    { ...req, options: {} },
    tr.inspectHttpStatus,
    inspectJSON,
  );
  if (isTraversalJsonContent<T>(travResult)) {
    return travResult;
  }
  if (onInvalidResult) {
    return onInvalidResult(travResult);
  }
  return undefined;
}
