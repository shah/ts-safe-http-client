import { assert } from "https://deno.land/std@0.70.0/_util/assert.ts";
import { assertEquals } from "https://deno.land/std@0.70.0/testing/asserts.ts";
import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./traverse.ts";

Deno.test(`Test URL follow/transform: "https://t.co/ELrZmo81wI"`, async () => {
  const result = await mod.traverse({
    request: "https://t.co/ELrZmo81wI",
    options: mod.defaultTraverseOptions(),
  });
  console.dir(result);
  //   if (mod.isTraversalContent(result)) {
  //     console.log(result.bodyText);
  //   }
});

// export interface Guard<I, T extends I> {
//   (o: I): o is T;
// }

// export interface UrlTestCase<T extends mod.TraversalResult = mod.TraversalResult> {
//   readonly originalURL: string;
//   readonly resultsExpected: Guard<mod.TraversalResult, T>[];
//   readonly expectTerminalURL?: string;
// }

// const testCases: UrlTestCase[] = [
//   {
//     originalURL:
//       "http://ui.constantcontact.com/sa/fwtf.jsp?llr=jwcorpsab&m=1119360584393&ea=periodicals%2Bhealthit-answersmedianetwork%40medigy.cc&a=1134632546554",
//     resultsExpected: [mod.isContentRedirectResult, mod.isTerminalResult],
//     expectTerminalURL:
//       "http://ui.constantcontact.com/sa/fwtf.jsp?llr=jwcorpsab&m=1119360584393&ea=periodicals%2Bhealthit-answersmedianetwork%40medigy.cc&a=1134632546554",
//   },
//   {
//     originalURL: "https://t.co/ELrZmo81wI",
//     resultsExpected: [mod.isContentRedirectResult, mod.isTerminalResult],
//     expectTerminalURL:
//       "https://www.foxnews.com/lifestyle/photo-of-donald-trump-look-alike-in-spain-goes-viral",
//   },
// ];

// for (const testCase of testCases) {
//   Deno.test(`Test URL follow/transform: ${testCase.originalURL}`, async () => {
//     const { originalURL, resultsExpected, expectTerminalURL } = testCase;
//     const results = await mod.traverse(originalURL);
//     ta.assertEquals(
//       results.length,
//       resultsExpected.length,
//       `${results.length} results encountered, should be ${resultsExpected.length}: ${results}`,
//     );
//     let foundTerminal: mod.TerminalResult | undefined = undefined;
//     for (let i = 0; i < results.length; i++) {
//       const encountered = results[i];
//       const expected = resultsExpected[i];
//       ta.assert(expected(encountered));
//       if (mod.isTerminalResult(encountered)) {
//         foundTerminal = encountered;
//       }
//     }
//     if (expectTerminalURL) {
//       assert(
//         foundTerminal,
//         `a terminal URL is expected for '${testCase.originalURL}': ${expectTerminalURL}`,
//       );
//       const terminalURL = mod.isRedirectResult(foundTerminal)
//         ? foundTerminal.redirectUrl
//         : foundTerminal.url;
//       assertEquals(
//         terminalURL,
//         expectTerminalURL,
//         `terminal URL is expected to be '${expectTerminalURL}', not '${terminalURL}'`,
//       );
//     }
//   });
// }
