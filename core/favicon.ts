import * as enh from "./enhance.ts";
import * as tr from "./traverse.ts";

export interface FavIconSupplier {
  readonly favIconResult: tr.TraversalResult;
}

export function isTraveralResultFavIcon(
  o: tr.TraversalResult,
): o is tr.SuccessfulTraversal & FavIconSupplier {
  return "favIconResult" in o;
}

export class TraversalResultFavIconEnhancer
  implements tr.TraversalResultEnhancer {
  static readonly followOnly = new TraversalResultFavIconEnhancer(
    enh.enhancer(tr.ValidateStatus.singleton),
  );
  static readonly followAndDownload = new TraversalResultFavIconEnhancer(
    enh.enhancer(
      tr.ValidateStatus.singleton,
      // TODO: DownloadContent.singleton,
    ),
  );

  constructor(readonly transformer: tr.TraversalResultEnhancer) {
  }

  async enhance(
    ctx: tr.TraverseContext,
    instance: tr.TraversalResult,
  ): Promise<tr.TraversalResult | tr.TraversalResult & FavIconSupplier> {
    if (isTraveralResultFavIcon(instance)) return instance;
    const favIconURL = new URL(
      typeof ctx.request == "string" ? ctx.request : ctx.request.url,
    );
    favIconURL.pathname = "/favicon.ico";
    const fitr = await tr.traverse({
      ...ctx,
      request: favIconURL.href,
      options: { trEnhancer: this.transformer },
    });
    const result: tr.TraversalResult & FavIconSupplier = {
      ...instance,
      favIconResult: fitr,
    };
    return result;
  }
}
