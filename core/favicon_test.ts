import { testingAsserts as ta } from "../deps-test.ts";
import { safety } from "./deps.ts";
import * as mod from "./mod.ts";

Deno.test(`valid HTTP request with HTML Content and favIcon supplier`, async () => {
  const endpoint = `https://www.netspective.com/about-us/`;
  const options = mod.defaultTraverseOptions();
  const result = await mod.traverse(
    {
      request: endpoint,
      options: {
        ...options,
        trEnhancer: safety.enhancer(
          options.trEnhancer,
          mod.TraversalResultFavIconEnhancer.followOnly,
        ),
      },
    },
  );
  ta.assert(result, "result should be defined");
  ta.assert(
    mod.isTraversalHtmlContent(result),
    "result should have HTML content",
  );
  ta.assert(
    mod.isTraveralResultFavIcon(result),
    "result should be a TraveralResultFavIcon",
  );
  ta.assert(
    mod.isSuccessfulTraversal(result.favIconResult),
    "result.favIconResult should be a successful traversal",
  );
  ta.assertEquals(
    result.favIconResult.terminalURL,
    "https://www.netspective.com/favicon.ico",
  );
});
