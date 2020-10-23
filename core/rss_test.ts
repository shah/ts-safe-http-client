import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./mod.ts";

Deno.test(`RSS feed`, async () => {
  const result = await mod.traverse(
    {
      request: `https://www.netspective.com/index.xml`,
      options: mod.defaultTraverseOptions(),
    },
    mod.inspectHttpStatus,
    mod.rssContentInspector(),
  );
  ta.assert(!mod.isInvalidHttpStatus(result));
  ta.assert(mod.isTraversalRssContent(result));
});
