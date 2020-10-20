import { testingAsserts as ta } from "../deps-test.ts";
import { inspect as insp, safety } from "./deps.ts";
import * as mod from "./mod.ts";

export interface GitHubRepoTag {
  readonly name: string;
}

export type GitHubRepoTags = GitHubRepoTag[];

const isGitHubRepoTags = safety.typeGuardArrayOf<
  GitHubRepoTag,
  GitHubRepoTags
>("name");

Deno.test(`typesafe HTTP request with JSON type guard`, async () => {
  const endpoint = `https://api.github.com/repos/shah/ts-safe-http-client/tags`;
  const tags = await mod.safeFetchJSON<GitHubRepoTags>(
    { request: endpoint },
    mod.jsonContentInspector(
      isGitHubRepoTags,
      (json: unknown): undefined => {
        console.log("\n***\nGUARD FAILURE, should not happen");
        return undefined;
      },
    ),
    (tr: RequestInfo | insp.InspectionResult<RequestInfo>): undefined => {
      console.log(
        "\n***\nHTTP failuare, should not happen, see TraversalResult for debugging data",
      );
      console.dir(tr);
      return undefined;
    },
  );
  ta.assert(tags);
  ta.assert(tags.length > 0);
});

Deno.test(`invalid HTTP request (bad URL) with JSON type guard`, async () => {
  const endpoint = `https://api.github.com/repos/shah/bad-repo-name/tags`;
  let invalidResultEncountered = false;
  let invalidJsonEncountered = false;
  const tags = await mod.safeFetchJSON<GitHubRepoTags>(
    { request: endpoint },
    mod.jsonContentInspector(
      isGitHubRepoTags,
      (json: unknown): undefined => {
        invalidJsonEncountered = true;
        return undefined;
      },
    ),
    (): undefined => {
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
    mod.jsonContentInspector(
      isGitHubRepoTags, // give it a guard that will fail
      (json: unknown): undefined => {
        invalidJsonEncountered = true;
        return undefined;
      },
    ),
    (): undefined => {
      invalidResultEncountered = true;
      return undefined;
    },
  );
  ta.assert(contributors === undefined, "result should be undefined");
  ta.assert(!invalidResultEncountered, "onInvalidResult should not be called");
  ta.assert(invalidJsonEncountered, "onInvalidJSON should be encountered");
});
