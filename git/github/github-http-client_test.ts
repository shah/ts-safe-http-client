import { testingAsserts as ta } from "../deps-test.ts";
import * as gh from "./mod.ts";

Deno.test(`Test GitHubRepo builders`, async () => {
  const repo = new gh.GitHubRepo("shah/ts-lhncbc-lforms");
  ta.assert(repo);
  ta.assert(repo.url());
});

Deno.test(`Test valid GitHub repo tags`, async () => {
  const repo = new gh.GitHubRepo("shah/ts-lhncbc-lforms");
  ta.assert(repo);

  const latestTag = await repo.repoLatestTag();
  ta.assert(latestTag, "A latest tag should be available");

  const tags = await repo.repoTags();
  ta.assert(tags, "A list of tags should be available");
  ta.assert(tags.gitRepoTags.length > 0, "At least one tag should be found");
});

Deno.test(`Test invalid GitHub repo tags`, async () => {
  const repo = new gh.GitHubRepo({ org: "shah", repo: "unknown" });
  ta.assert(repo);

  const tags = await repo.repoTags();
  ta.assertEquals(tags, undefined, "The tags list should not be found");

  const latestTag = await repo.repoLatestTag();
  ta.assertEquals(latestTag, undefined, "The tag should not be found");
});
