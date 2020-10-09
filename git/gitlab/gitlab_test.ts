import { testingAsserts as ta } from "../deps-test.ts";
import * as git from "../mod.ts";
import * as mod from "./mod.ts";

const glServerAuthn = mod.envVarAuthnAccessToken("TSHC_GLPAT_", {
  userNamePassword: ["user", "password"],
  reporter: (message: string): void => {
    console.error(message);
    glServerValid = false;
  },
});

ta.assert(
  glServerAuthn.glServerUserNamePasswdAvailable(),
  "TSHC_GLPAT_* environment variables not available, try:\n\n    ==> source $HOME/.engrsb/secrets.env\n\n",
);

let glServerValid = true;
const glServer = mod.envVarGitLabServer(
  "TSHC_GLSERVER_HOST",
  glServerAuthn,
);

Deno.test(`GitLabRepo builders`, async () => {
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new mod.GitLab(glServer);
  const repo = gitLab.repo(
    { group: "netspective-studios", repo: "netspective-workspaces" },
  );
  ta.assert(repo);
  ta.assert(repo.url());
});

Deno.test(`valid GitLab repo tags`, async () => {
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new mod.GitLab(glServer);
  const repo = gitLab.repo(
    { group: "netspective-studios", repo: "netspective-workspaces" },
  );
  ta.assert(repo);

  const tags = await repo.repoTags();
  ta.assert(tags, "A list of tags should be available");
  ta.assert(tags.gitRepoTags.length > 0, "At least one tag should be found");

  const latestTag = await repo.repoLatestTag();
  ta.assert(latestTag, "A latest tag should be available");
});

Deno.test(`retrieve Managed Git JSON`, async () => {
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new mod.GitLab(glServer);
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
  ta.assert(git.isManagedGitJsonFile(result));
});
