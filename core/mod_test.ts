import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./mod.ts";

Deno.test(`URL follow/transform: "https://t.co/ELrZmo81wI"`, async () => {
  const result = await mod.traverse({
    request: "https://t.co/ELrZmo81wI",
    options: mod.defaultTraverseOptions(),
  });
  ta.assert(!mod.isInvalidHttpStatus(result));
  ta.assert(mod.isTraversalContent(result));
});

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
