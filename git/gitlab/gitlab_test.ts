import { testingAsserts as ta } from "../deps-test.ts";
import { managedGit as mGit, vault as v } from "./deps.ts";
import * as mod from "./mod.ts";

const testHostID = "GLSERVER";
const glAuthnVault = new mod.GitLabAuthnEnvVault(
  new v.EnvironmentVault({
    commonNamespace: "TSHC_TEST_",
    secretsNamespace: "TSHC_TEST_SECRET_",
  }),
);

if (!glAuthnVault.isServerConfigAvailable(testHostID)) {
  console.error(
    "GitLab Server environment variables not available, try:\n\n    ==> source $HOME/.engrsb/secrets.env\n\nRequired:",
  );
  glAuthnVault.vault.reportDefinedAttrs();
  Deno.exit(1);
}

Deno.test(`GitLabRepo builders`, async () => {
  const glServer = glAuthnVault.server(testHostID);
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new mod.GitLab(glServer!);
  const repo = gitLab.repo(
    { group: "netspective-studios", repo: "netspective-workspaces" },
  );
  ta.assert(repo);
  ta.assert(repo.url());
});

Deno.test(`valid GitLab repo tags`, async () => {
  const glServer = glAuthnVault.server(testHostID);
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new mod.GitLab(glServer!);
  const repo = gitLab.repo(
    { group: "netspective-studios", repo: "netspective-workspaces" },
  );
  ta.assert(repo);

  const tags = await repo.repoTags();
  ta.assert(tags, "A list of tags should be available");
  ta.assert(tags!.gitRepoTags.length > 0, "At least one tag should be found");

  const latestTag = await repo.repoLatestTag();
  ta.assert(latestTag, "A latest tag should be available");
});

Deno.test(`retrieve Managed Git groups`, async () => {
  const glServer = glAuthnVault.server(testHostID);
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new mod.GitLab(glServer!);
  const struct = await gitLab.structure();
  ta.assert(struct.components.length > 0);
  //console.dir(struct);
});

Deno.test(`retrieve Managed Git JSON`, async () => {
  const glServer = glAuthnVault.server(testHostID);
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new mod.GitLab(glServer!);
  const repo = gitLab.repo(
    {
      group: "netspective-studios/git-ops-experiments",
      repo: "gitlab-automation-target",
    },
  );
  const result = await repo.content({
    path: "test-artifacts/ts-lhncbc-lforms/test1-with-error.lhc-form.json",
  });
  ta.assert(result);
  ta.assert(mGit.isManagedGitJsonFile(result!));
});
