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
    const result = await mod.traverse({
      request: tc.originalURL,
      options: tc.options,
    });
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

export interface GitHubRepoTag {
  readonly name: string;
}

export type GitHubRepoTags = GitHubRepoTag[];

/**
 * Make sure that the object passed is in is an array and that each
 * element of the array is an object with a "name" property
 * @param o object passed in from HTTP client fetch
 */
export function isGitHubRepoTags(o: unknown): o is GitHubRepoTags {
  return o && Array.isArray(o) &&
    o.filter((tag) => typeof tag !== "object" || !("name" in tag)).length == 0;
}

Deno.test(`typesafe HTTP request with JSON type guard`, async () => {
  const endpoint = `https://api.github.com/repos/shah/ts-safe-http-client/tags`;
  const tags = await mod.safeFetchJSON<GitHubRepoTags>(
    { request: endpoint },
    mod.jsonTraverseOptions({ guard: isGitHubRepoTags }),
  );
  ta.assert(tags);
  ta.assert(tags.length > 0);
});

Deno.test(`invalid HTTP request (bad URL) with JSON type guard`, async () => {
  const endpoint = `https://api.github.com/repos/shah/bad-repo-name/tags`;
  let invalidResultEncountered = false;
  let invalidJsonEncountered = false;
  const tags = await mod.safeFetchJSON(
    { request: endpoint },
    mod.jsonTraverseOptions({
      guard: isGitHubRepoTags,
      onGuardFailure: (json: unknown): undefined => {
        invalidJsonEncountered = true;
        return undefined;
      },
    }),
    (tr: mod.TraversalResult): undefined => {
      invalidResultEncountered = true;
      return undefined;
    },
  );
  ta.assert(tags === undefined, "result should be undefined");
  ta.assert(invalidResultEncountered, "onInvalidResult should be called");
  ta.assert(!invalidJsonEncountered, "onInvalidJSON should not be encountered");
});

Deno.test(`valid HTTP request with failed JSON type guard`, async () => {
  const endpoint =
    `https://api.github.com/repos/shah/ts-safe-http-client/contributors`;
  let invalidResultEncountered = false;
  let invalidJsonEncountered = false;
  const contributors = await mod.safeFetchJSON(
    { request: endpoint },
    mod.jsonTraverseOptions({
      guard: isGitHubRepoTags, // give it a guard that will fail
      onGuardFailure: (json: unknown): undefined => {
        invalidJsonEncountered = true;
        return undefined;
      },
    }),
    (tr: mod.TraversalResult): undefined => {
      invalidResultEncountered = true;
      return undefined;
    },
  );
  ta.assert(contributors === undefined, "result should be undefined");
  ta.assert(!invalidResultEncountered, "onInvalidResult should not be called");
  ta.assert(invalidJsonEncountered, "onInvalidJSON should be encountered");
});

Deno.test(`valid HTTP request with HTML Content and favIcon supplier`, async () => {
  const endpoint = `https://www.netspective.com/about-us/`;
  const options = mod.defaultTraverseOptions();
  const result = await mod.traverse(
    {
      request: endpoint,
      options: {
        ...options,
        trEnhancer: mod.enhancer(
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

Deno.test(`download image`, async () => {
  const endpoint =
    `https://upload.wikimedia.org/wikipedia/en/5/54/USS_Enterprise_%28NCC-1701-A%29.jpg`;
  const result = await mod.traverse(
    {
      request: endpoint,
      options: mod.defaultTraverseOptions(
        { trEnhancer: mod.TraversalResultDownloader.tempDirDownloader },
      ),
    },
  );
  ta.assert(result, "result should be defined");
  ta.assert(
    mod.isDownloadTraversalResult(result),
    "result should be a DownloadTraversalResult",
  );
  ta.assert(
    mod.isDownloadedContent(result.download),
    "result.download should be a successful download",
  );
  ta.assertEquals(result.download.wroteBytes, result.download.shouldWriteBytes);
});

Deno.test(`download PDF`, async () => {
  const endpoint = `http://ceur-ws.org/Vol-1401/paper-05.pdf`;
  const result = await mod.traverse(
    {
      request: `http://ceur-ws.org/Vol-1401/paper-05.pdf`,
      options: mod.defaultTraverseOptions(
        { trEnhancer: mod.TraversalResultDownloader.tempDirDownloader },
      ),
    },
  );
  ta.assert(result, "result should be defined");
  ta.assert(
    mod.isDownloadTraversalResult(result),
    "result should be a DownloadTraversalResult",
  );
  ta.assert(
    mod.isDownloadedContent(result.download),
    "result.download should be a successful download",
  );
  ta.assertEquals(result.download.wroteBytes, result.download.shouldWriteBytes);
});
