import { inspect as insp, rss, safety } from "./deps.ts";
import * as tr from "./traverse.ts";

export interface TraversalRssContent extends tr.TraversalStructuredContent {
  readonly feedType: rss.FeedType;
  readonly feed: rss.JsonFeed;
}

export const isTraversalRssContent = safety.typeGuard<TraversalRssContent>(
  "feedType",
  "feed",
);

export interface RssContentInspectorOptions {
  readonly verifyMimeTypesStartWith?: string[];
}

export function defaultRssContentInspectorOptions(): RssContentInspectorOptions {
  return {
    verifyMimeTypesStartWith: [
      "application/rss",
      "application/xml",
      "text/xml",
    ],
  };
}

export function rssContentInspector(
  options: RssContentInspectorOptions | undefined =
    defaultRssContentInspectorOptions(),
): insp.Inspector<RequestInfo> {
  return async (
    target: RequestInfo | insp.InspectionResult<RequestInfo>,
  ): Promise<
    | RequestInfo
    | insp.InspectionResult<RequestInfo>
    | TraversalRssContent
  > => {
    if (isTraversalRssContent(target)) return target;
    if (tr.isTraversalContent(target)) {
      if (
        options?.verifyMimeTypesStartWith &&
        options?.verifyMimeTypesStartWith.find((mt) =>
          target.contentType.startsWith(mt)
        )
      ) {
        if (tr.isTraversalTextContent(target)) {
          // if we've already read the text, don't try to read it again
          return await textToFeed(target, target.bodyText);
        } else {
          // if we haven't read the text, get it from the response
          return await textToFeed(target, await target.response.text());
        }
      }
    }
    return target;
  };
}

export async function textToFeed(
  target: tr.TraversalContent,
  xml: string,
): Promise<TraversalRssContent> {
  const [feedType, feed] = await rss.deserializeFeed(
    xml,
    { outputJsonFeed: true },
  ) as [rss.FeedType, rss.JsonFeed];
  const result: TraversalRssContent = {
    ...target,
    isStructuredContent: true,
    feed: feed,
    feedType: feedType,
  };
  return result;
}
