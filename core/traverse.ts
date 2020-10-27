import {
  inspect as insp,
  inspectText as inspT,
  queryableHTML as html,
  safety,
} from "./deps.ts";

// TODO: add option to apply random user agent to HTTP header (see rua in deps.ts)

export type RequestInfoInspector = insp.Inspector<RequestInfo>;
export type RequestInfoInspectionPipe = insp.InspectionPipe<RequestInfo>;
export type TerminalUrlInspectionPipe = insp.InspectionPipe<string>;

export interface Requestable {
  readonly request: RequestInfo;
  readonly requestInit?: RequestInit;
}

export interface Labelable {
  readonly label?: string;
}

export interface TraverseContext
  extends insp.InspectionContext, Requestable, Labelable {
  readonly parent?: insp.InspectionContext;
  readonly options: TraverseOptions;
}

export const isTraverseContext = safety.typeGuard<TraverseContext>(
  "request",
  "options",
);

export interface TraverseOptions {
  readonly riInspector?: RequestInfoInspectionPipe;
  readonly turlInspector?: TerminalUrlInspectionPipe;
  readonly htmlContent?: html.HtmlContentInspectionPipe;
}

export type RequestInfoInspectionResult = insp.InspectionResult<RequestInfo>;
export type RequestInfoInspectionIssue = insp.InspectionIssue<RequestInfo>;

export interface TraversalResult
  extends RequestInfoInspectionResult, Requestable, Labelable {
  readonly isTraversalResult: true;
}

export const isTraversalResult = safety.typeGuard<TraversalResult>(
  "isTraversalResult",
);

export interface TransformedTraversalResult
  extends TraversalResult, insp.TransformerProvenance<TraversalResult> {
}

export const isTransformedTraversalResult = safety.typeGuard<
  TransformedTraversalResult
>(
  "from",
  "position",
);

export interface UnsuccessfulTraversal
  extends TraversalResult, insp.InspectionException<RequestInfo> {
}

export const isUnsuccessfulTraversal = safety.typeGuard<UnsuccessfulTraversal>(
  "isTraversalResult",
  "isInspectionException",
);

export interface SuccessfulTraversal extends TraversalResult {
  readonly initAt: Date;
  readonly response: Response;
  readonly terminalURL: string;
}

export const isSuccessfulTraversal = safety.typeGuard<SuccessfulTraversal>(
  "isTraversalResult",
  "initAt",
  "response",
  "terminalURL",
);

export interface FinalizedTraversal extends SuccessfulTraversal {
  readonly finalizedAt: Date;
}

export const isTraversalFinalized = safety.typeGuard<FinalizedTraversal>(
  "isTraversalResult",
  "finalizedAt",
);

export interface InvalidHttpStatus
  extends SuccessfulTraversal, RequestInfoInspectionIssue {
  readonly invalidHttpStatus: number;
}

export const isInvalidHttpStatus = safety.typeGuard<InvalidHttpStatus>(
  "isTraversalResult",
  "invalidHttpStatus",
);

export interface TraversalContent extends SuccessfulTraversal {
  readonly httpStatus: number;
  readonly contentType: string;
  readonly contentDisposition?: { [key: string]: string };
  readonly writeContent: (writer: Deno.Writer) => Promise<number>;
}

export const isTraversalContent = safety.typeGuard<TraversalContent>(
  "isTraversalResult",
  "httpStatus",
  "contentType",
);

export interface TraversalStructuredContent extends TraversalContent {
  readonly isStructuredContent: boolean;
}

export const isTraversalStructuredContent = safety.typeGuard<
  TraversalStructuredContent
>(
  "isTraversalResult",
  "isStructuredContent",
);

export interface TraversalTextContent extends TraversalContent {
  readonly bodyText: string;
}

export const isTraversalTextContent = safety.typeGuard<TraversalTextContent>(
  "isTraversalResult",
  "bodyText",
);

export interface TraversalHtmlContent extends TraversalTextContent {
  readonly htmlContent: html.HtmlContent;
}

export function isTraversalHtmlContent(
  o: unknown,
): o is TraversalHtmlContent {
  return isTraversalTextContent(o) && "htmlContent" in o;
}

export interface TraversalContentRedirect extends TransformedTraversalResult {
  readonly contentRedirectUrl: string;
}

export const isTraversalContentRedirect = safety.typeGuard<
  TraversalContentRedirect
>(
  "isTraversalResult",
  "contentRedirectUrl",
);

export async function removeLabelLineBreaksAndTrimSpaces(
  instance: RequestInfo | insp.InspectionResult<RequestInfo>,
): Promise<
  RequestInfo | insp.InspectionResult<RequestInfo> | TransformedTraversalResult
> {
  if (isSuccessfulTraversal(instance)) {
    if (!instance.label) return instance;
    const cleanLabel = instance.label.replace(/\r\n|\n|\r/gm, " ").trim();
    if (cleanLabel != instance.label) {
      const result: TransformedTraversalResult = {
        ...instance,
        from: instance,
        label: cleanLabel,
        position: insp.nextTransformerProvenancePosition(instance),
        remarks: "Removed line breaks and trimmed spaces in label",
      };
      return result;
    }
  }
  return instance;
}

export async function inspectHttpStatus(
  instance: RequestInfo | insp.InspectionResult<RequestInfo>,
): Promise<
  | RequestInfo
  | insp.InspectionResult<RequestInfo>
  | TraversalResult
  | TraversalContent
  | InvalidHttpStatus
> {
  if (isTraversalContent(instance) || isInvalidHttpStatus(instance)) {
    return instance;
  }

  if (isSuccessfulTraversal(instance)) {
    if (instance.response.status == 200) {
      const contentType = instance.response.headers.get("Content-Type");
      const contentDisp = instance.response.headers.get("Content-Disposition");
      const result: TraversalContent = {
        ...instance,
        httpStatus: instance.response.status,
        contentType: contentType ? contentType.trim() : "",
        contentDisposition: contentDisp
          ? contentDispositionParams(contentDisp)
          : undefined,
        writeContent: async (writer: Deno.Writer): Promise<number> => {
          const blob = await instance.response.blob();
          await Deno.copy(new Deno.Buffer(await blob.arrayBuffer()), writer);
          return blob.size;
        },
      };
      return result;
    }

    const result: InvalidHttpStatus = {
      ...instance,
      isInspectionIssue: true,
      invalidHttpStatus: instance.response.status,
    };
    return result;
  }

  return instance;
}

export async function inspectTextContent(
  instance: RequestInfo | insp.InspectionResult<RequestInfo>,
): Promise<
  | RequestInfo
  | insp.InspectionResult<RequestInfo>
  | TraversalTextContent
> {
  if (isTraversalTextContent(instance)) return instance;
  if (isTraversalContent(instance)) {
    if (instance.contentType.startsWith("text/")) {
      const bodyText = await instance.response.text();
      const result: TraversalTextContent = {
        ...instance,
        bodyText: bodyText,
        writeContent: async (writer: Deno.Writer): Promise<number> => {
          await writer.write(new TextEncoder().encode(bodyText));
          return bodyText.length;
        },
      };
      return result;
    }
  }

  return instance;
}

export async function inspectHtmlContent(
  instance: RequestInfo | insp.InspectionResult<RequestInfo>,
  ctx?: insp.InspectionContext,
): Promise<
  | RequestInfo
  | insp.InspectionResult<RequestInfo>
  | TraversalHtmlContent
> {
  if (isTraversalHtmlContent(instance)) return instance;
  if (isTraversalTextContent(instance) && isTraverseContext(ctx)) {
    if (
      ctx.options.htmlContent &&
      instance.contentType.startsWith("text/html")
    ) {
      const htmlContent = await ctx.options.htmlContent({
        uri: instance.terminalURL,
        htmlSource: instance.bodyText,
      });
      if (html.isHtmlContent(htmlContent)) {
        const result: TraversalHtmlContent = {
          ...instance,
          htmlContent: htmlContent,
        };
        return result;
      }
      return insp.inspectionIssue(
        instance,
        "HTML content not available: " + htmlContent,
      );
    }
  }

  return instance;
}

export async function inspectMetaRefreshRedirect(
  target: RequestInfo | insp.InspectionResult<RequestInfo>,
  ctx?: insp.InspectionContext,
): Promise<
  | RequestInfo
  | insp.InspectionResult<RequestInfo>
  | TraversalContentRedirect
> {
  if (isTraversalContentRedirect(target)) return target;
  if (isTraversalTextContent(target) && isTraverseContext(ctx)) {
    if (target.contentType.startsWith("text/html")) {
      const metaRefreshPattern =
        "(CONTENT|content)=[\"']0;[ ]*(URL|url)=(.*?)([\"']\s*>)";
      const match = target.bodyText.match(metaRefreshPattern);
      const contentRedirectUrl = match && match.length == 5 ? match[3] : null;
      if (contentRedirectUrl) {
        const redirected = await traverse(
          { ...ctx, request: contentRedirectUrl, parent: ctx },
        );
        if (isTraversalResult(redirected)) {
          const result: TraversalContentRedirect = {
            ...redirected,
            from: target,
            position: insp.nextTransformerProvenancePosition(target),
            remarks: `inspectMetaRefreshRedirect(${contentRedirectUrl})`,
            contentRedirectUrl,
          };
          return result;
        }
      }
    }
  }

  return target;
}

export function defaultTraverseOptions(
  override?: Partial<TraverseOptions>,
): TraverseOptions {
  return {
    riInspector: override?.riInspector ||
      insp.inspectionPipe(inspT.removeUrlRequestTrackingCodes),
    turlInspector: override?.turlInspector ||
      insp.inspectionPipe(inspT.removeUrlTextTrackingCodes),
    htmlContent: override?.htmlContent ||
      insp.inspectionPipe<
        html.HtmlSourceSupplier,
        string,
        Error
      >(
        html.inspectQueryableHtmlContent,
        html.inspectCuratableContent,
        html.inspectCurationTitle,
      ),
  };
}

export async function initFetch(
  target: RequestInfo | insp.InspectionResult<RequestInfo>,
  ctx?: insp.InspectionContext | TraverseContext,
): Promise<
  | RequestInfo
  | insp.InspectionResult<RequestInfo>
  | SuccessfulTraversal
  | UnsuccessfulTraversal
> {
  if (!isTraverseContext(ctx)) {
    return insp.inspectionIssue<RequestInfo, string>(
      target,
      "ctx should be TraverseContext: " + ctx,
    );
  }

  const initRI = insp.inspectionTarget<RequestInfo>(target);
  const targetRI = ctx?.options.riInspector
    ? insp.inspectionTarget<RequestInfo>(
      await ctx?.options.riInspector(initRI, ctx),
    )
    : initRI;
  try {
    const response = await window.fetch(
      targetRI,
      { ...ctx?.requestInit, redirect: "follow" },
    );
    const terminalURL = ctx?.options.turlInspector
      ? insp.inspectionTarget<string>(
        await ctx?.options.turlInspector(response.url, ctx),
      )
      : response.url;
    const result: SuccessfulTraversal = {
      isInspectionResult: true,
      inspectionTarget: targetRI,
      isTraversalResult: true,
      initAt: new Date(),
      response,
      request: targetRI,
      requestInit: ctx?.requestInit,
      label: ctx?.label,
      terminalURL: terminalURL,
    };
    return result;
  } catch (error) {
    const result: UnsuccessfulTraversal = {
      isInspectionResult: true,
      inspectionTarget: targetRI,
      isInspectionIssue: true,
      isInspectionException: true,
      isTraversalResult: true,
      request: targetRI,
      requestInit: ctx?.requestInit,
      label: ctx?.label,
      exception: error,
    };
    return result;
  }
}

export async function finalizeFetch(
  target: RequestInfo | insp.InspectionResult<RequestInfo>,
): Promise<
  RequestInfo | insp.InspectionResult<RequestInfo> | FinalizedTraversal
> {
  if (isTraversalFinalized(target)) return target;
  if (isSuccessfulTraversal(target)) {
    if (!target.response.bodyUsed) target.response.body?.cancel();
    const result: FinalizedTraversal = {
      ...target,
      finalizedAt: new Date(),
    };
    return result;
  }
  return target;
}

export async function traverse(
  ctx: TraverseContext,
  ...inspectors: RequestInfoInspector[]
): Promise<RequestInfo | insp.InspectionResult<RequestInfo>> {
  const pipe = insp.inspectionPipe<RequestInfo, string, Error>(
    initFetch,
    ...inspectors,
    finalizeFetch,
  );
  return await pipe(ctx.request, ctx);
}

export function contentDispositionParams(
  cd: string,
): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  const components = decodeURI(cd).split(";");
  components
    .slice(1)
    .map((v: string): string => v.trim())
    .map((kv: string): void => {
      const [k, v] = kv.split("=");
      if (v) {
        const s = v.charAt(0);
        const e = v.charAt(v.length - 1);
        if ((s === e && s === '"') || s === "'") {
          result[k] = v.substr(1, v.length - 2);
        } else {
          result[k] = v;
        }
      }
    });
  return result;
}
