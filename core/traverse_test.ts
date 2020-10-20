import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./mod.ts";

interface FollowTestCase<T extends mod.TraversalResult = mod.TraversalResult> {
  readonly name: string;
  readonly originalURL: string;
  readonly terminalURL: string;
  readonly options: mod.TraverseOptions;
  readonly guard?: (o: T) => o is T;
}

const followTestCases: FollowTestCase[] = [
  {
    // In bitly.com this is called "github.com/shah/ts-safe-http-client unit test case 001" and redirects to
    // "https://www.netspective.com/?utm_source=github.com_shah_ts-safe-http-client_test001&utm_medium=unit_test&utm_campaign=followTestCase"
    // but the terminal URL should be cleaned of utm_* because mod.defaultTraversalOptions() has turEnhancer which removes utm_* codes
    name:
      "Netspective.com redirect with only utm_* params from Netspective bit.ly account",
    originalURL: "https://bit.ly/34EIc4U",
    terminalURL: "https://www.netspective.com/",
    options: mod.defaultTraverseOptions(),
    guard: mod.isTraversalHtmlContent,
  },
  {
    // In bitly.com this is called "github.com/shah/ts-safe-http-client unit test case 002" and redirects to
    // "https://www.netspective.com/?utm_source=github.com_shah_ts-safe-http-client_test001&param=keep&utm_medium=unit_test&utm_campaign=followTestCase&param2=keep%20this%20too"
    // but the terminal URL should be cleaned of utm_* because mod.defaultTraversalOptions() has turEnhancer which removes utm_* codes
    name:
      "Netspective.com redirect with utm_* and other test params from Netspective bit.ly account",
    originalURL: "https://bit.ly/3dj75a0",
    terminalURL: "https://www.netspective.com/?param=keep&param2=keep this too",
    options: mod.defaultTraverseOptions(),
    guard: mod.isTraversalHtmlContent,
  },
];

for (const tc of followTestCases) {
  Deno.test(`URL follow/transform: "${tc.originalURL}" (${tc.name})"`, async () => {
    const result = await mod.traverse(
      {
        request: tc.originalURL,
        options: tc.options,
      },
      mod.inspectHttpStatus,
      mod.inspectTextContent,
      mod.inspectMetaRefreshRedirect,
      mod.inspectHtmlContent,
    );
    ta.assert(!mod.isInvalidHttpStatus(result));
    ta.assert(mod.isTraversalContent(result));
    if (tc.guard) {
      ta.assert(tc.guard(result), `"${tc.originalURL}" type guard failed`);
    }
    if (mod.isTraversalContent(result)) {
      ta.assertEquals(
        result.terminalURL,
        tc.terminalURL,
        `"${tc.originalURL}" terminal URL should be "${tc.terminalURL}" not "${result.terminalURL}"`,
      );
    }
  });
}
