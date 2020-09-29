import { testingAsserts as ta } from "../deps-test.ts";
import * as shc from "../core/mod.ts";
import * as gh from "./mod.ts";

const ghTagsClient = new gh.GitHubRepoTagsHttpClient(
  shc.defaultHttpClientDiags({
    verbose: false,
  }),
);

Deno.test(`Test GitHubRepo builders`, async () => {
  const valid = gh.gitHubRepo("shah/ts-lhncbc-lforms");
  ta.assert(valid);
  ta.assert(valid.url());

  ta.assertEquals(gh.gitHubRepo(""), undefined);
  ta.assertEquals(gh.gitHubRepo("bad"), undefined);
  ta.assertEquals(gh.gitHubRepo({ org: "", repo: "bad" }), undefined);
});

Deno.test(`Test valid GitHub repo tags`, async () => {
  const repo = gh.gitHubRepo("shah/ts-lhncbc-lforms");
  ta.assert(repo);

  const latestTag = await ghTagsClient.repoLatestTag(repo);
  ta.assert(latestTag, "A latest tag should be available");

  const anyTags = await ghTagsClient.repoTags(repo);
  ta.assert(anyTags, "A list of tags should be available");
  ta.assert(anyTags.length > 0, "At least one tag should be found");
});

Deno.test(`Test invalid GitHub repo tags`, async () => {
  const repo = gh.gitHubRepo("shah/unknown");
  ta.assert(repo);

  const anyTags = await ghTagsClient.repoTags(repo);
  ta.assertEquals(anyTags, undefined, "The tags list should not be found");

  const latestTag = await ghTagsClient.repoLatestTag(repo);
  ta.assertEquals(latestTag, undefined, "The tag should not be found");
});
