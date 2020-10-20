import { inspect as insp, safety } from "./deps.ts";
import * as tr from "./traverse.ts";

export interface FavIconSupplier {
  readonly favIconResult: tr.TraversalResult;
}

export const isTraveralResultFavIcon = safety.typeGuard<
  tr.SuccessfulTraversal & FavIconSupplier
>("favIconResult");

export async function inspectFavIcon(
  instance: RequestInfo | insp.InspectionResult<RequestInfo>,
  ctx?: insp.InspectionContext,
): Promise<
  | RequestInfo
  | insp.InspectionResult<RequestInfo>
  | tr.TraversalResult & FavIconSupplier
> {
  if (isTraveralResultFavIcon(instance)) return instance;
  if (tr.isTraversalContent(instance) && tr.isTraverseContext(ctx)) {
    const favIconURL = new URL(
      typeof ctx.request == "string" ? ctx.request : ctx.request.url,
    );
    favIconURL.pathname = "/favicon.ico";
    const fitr = await tr.traverse({
      ...ctx,
      request: favIconURL.href,
      options: {},
    }, tr.inspectHttpStatus);
    if (tr.isTraversalResult(fitr)) {
      const result: tr.TraversalResult & FavIconSupplier = {
        ...instance,
        favIconResult: fitr,
      };
      return result;
    }
  }
  return instance;
}
