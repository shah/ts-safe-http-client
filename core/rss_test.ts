import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./mod.ts";

// TODO: this is a good test but Ky fetch client is leaking async resources
//       when TimeoutError encountered
// Deno.test(`invalid RSS feed`, async () => {
//   // traverseKy uses https://github.com/sindresorhus/ky
//   // and has timeout supports, returns faster on errors
//   const result = await mod.traverseKy(
//     {
//       request: `https://www.medigy.combad/index.xml`,
//       options: mod.defaultTraverseOptions(),
//     },
//     mod.inspectHttpStatus,
//     mod.rssContentInspector(),
//   );
//   ta.assert(mod.isUnsuccessfulTraversal(result));
// });

Deno.test(`small RSS feed`, async () => {
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

Deno.test(`large RSS feed`, async () => {
  const result = await mod.traverse(
    {
      request: `https://www.medigy.com/feed/latest/index.xml`,
      options: mod.defaultTraverseOptions(),
    },
    mod.inspectHttpStatus,
    mod.rssContentInspector(),
  );
  ta.assert(!mod.isInvalidHttpStatus(result));
  ta.assert(mod.isTraversalRssContent(result));
});
