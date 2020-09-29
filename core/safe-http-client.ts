export interface HttpClientContext {
  readonly request: RequestInfo;
}

export interface HttpClientDiagnostics<
  C extends HttpClientContext,
  T,
> {
  isValidResponse: (ctx: C, resp: Response) => boolean;
  onInvalidResponse: (ctx: HttpClientContext, resp: Response) => T | undefined;
  onInvalidContent: (
    ctx: HttpClientContext,
    o: unknown,
    res: Response,
  ) => T | undefined;
  onException: (ctx: HttpClientContext, err: Error) => T | undefined;
}

export interface SafeFetchGuard<C extends HttpClientContext, T> {
  (o: unknown, res: Response, ctx: C): o is T;
}

export interface SafeFetchJSON<
  C extends HttpClientContext,
  T,
  ReplaceT extends T,
> {
  (
    ctx: C,
    guard?: SafeFetchGuard<C, T>,
    diags?: HttpClientDiagnostics<C, ReplaceT>,
  ): Promise<T | undefined>;
}

export interface HttpClient<
  C extends HttpClientContext,
  T,
  ReplaceT extends T,
> {
  readonly fetchJSON: SafeFetchJSON<C, T, ReplaceT>;
}

export function defaultHttpClientDiags<C extends HttpClientContext, CDT>(
  options?: Partial<HttpClientDiagnostics<C, CDT>> & {
    verbose?: boolean;
  },
): HttpClientDiagnostics<C, CDT> {
  const verbose = typeof options?.verbose === "undefined"
    ? true
    : options.verbose;
  return {
    isValidResponse: options?.isValidResponse ||
      ((ctx: C, resp: Response): boolean => {
        return resp.status == 200;
      }),
    onInvalidContent: options?.onInvalidContent ||
      ((ctx: HttpClientContext, o: unknown, res: Response): CDT | undefined => {
        if (verbose) console.error(`Invalid content at ${res.url}: ${o}`);
        return undefined;
      }),
    onInvalidResponse: options?.onInvalidResponse ||
      ((ctx: HttpClientContext, resp: Response): CDT | undefined => {
        if (verbose) console.warn(`${resp.url} invalid status: ${resp.status}`);
        return undefined;
      }),
    onException: options?.onException ||
      ((ctx: HttpClientContext, err: Error): CDT | undefined => {
        if (verbose) {
          console.error(`${ctx.request.toString()} exception: ${err}`);
        }
        return undefined;
      }),
  };
}

export async function safeFetchJSON<
  C extends HttpClientContext,
  T,
  ReplaceT extends T,
>(
  ctx: C,
  guard?: SafeFetchGuard<C, T>,
  diags: HttpClientDiagnostics<C, ReplaceT> = defaultHttpClientDiags<
    C,
    ReplaceT
  >(),
): Promise<T | undefined> {
  try {
    const response = await window.fetch(ctx.request);
    if (diags.isValidResponse(ctx, response)) {
      const content = await response.json();
      if (guard && !guard(content, response, ctx)) {
        return diags.onInvalidContent(ctx, content, response);
      }
      return content;
    } else {
      const result = diags.onInvalidResponse(ctx, response);
      if (!response.bodyUsed) {
        response.body?.cancel();
      }
      return result;
    }
  } catch (err) {
    return diags.onException(ctx, err);
  }
}

export class SafeHttpClient<
  C extends HttpClientContext,
  T,
  ReplaceT extends T,
> implements HttpClient<C, T, ReplaceT> {
  constructor(readonly diags = defaultHttpClientDiags<C, ReplaceT>()) {
  }

  async fetchJSON(
    ctx: C,
    guard?: (o: unknown, res: Response, ctx: C) => o is T,
  ): Promise<T | undefined> {
    return await safeFetchJSON<C, T, ReplaceT>(ctx, guard, this.diags);
  }
}
