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
    ],
  };
}

export function rssContentInspector(
  options: RssContentInspectorOptions | undefined =
    defaultRssContentInspectorOptions(),
): insp.Inspector<RequestInfo> {
  return async (
    instance: RequestInfo | insp.InspectionResult<RequestInfo>,
  ): Promise<
    | RequestInfo
    | insp.InspectionResult<RequestInfo>
    | TraversalRssContent
  > => {
    if (isTraversalRssContent(instance)) return instance;
    if (tr.isTraversalContent(instance)) {
      if (
        options?.verifyMimeTypesStartWith &&
        options?.verifyMimeTypesStartWith.find((mt) =>
          instance.contentType.startsWith(mt)
        )
      ) {
        const xml = await instance.response.text();
        const [feedType, feed] = await rss.deserializeFeed(
          xml,
          { outputJsonFeed: true },
        ) as [rss.FeedType, rss.JsonFeed];
        const result: TraversalRssContent = {
          ...instance,
          isStructuredContent: true,
          feed: feed,
          feedType: feedType,
        };
        return result;
      }
    }
    return instance;
  };
}
