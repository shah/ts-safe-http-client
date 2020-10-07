import { testingAsserts as ta } from "../deps-test.ts";
import * as gl from "./mod.ts";

const glServerAuthn = gl.envVarAuthnAccessToken("TSHC_GLPAT_", {
  userNamePassword: ["user", "password"],
  reporter: (message: string): void => {
    console.error(message);
    glServerValid = false;
  },
});

ta.assert(
  glServerAuthn.glServerUserNamePasswdAvailable(),
  "TSHC_GLPAT_* environment variables not available, try 'source $HOME/.engrsb/secrets.env'",
);

let glServerValid = true;
const glServer = gl.envVarGitLabServer(
  "TSHC_GLSERVER_HOST",
  glServerAuthn,
);

Deno.test(`GitLabRepo builders`, async () => {
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new gl.GitLab(glServer);
  const repo = gitLab.repo(
    { group: "netspective-studios", repo: "netspective-workspaces" },
  );
  ta.assert(repo);
  ta.assert(repo.url());
});

Deno.test(`valid GitLab repo tags`, async () => {
  ta.assert(glServer, "GitLab Server not available");
  const gitLab = new gl.GitLab(glServer);
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

// Deno.test(`Test invalid GitLab repo tags`, async () => {
//   const repo = new gl.GitLabRepo({ group: "shah", repo: "unknown" });
//   ta.assert(repo);

//   const tags = await repo.repoTags();
//   ta.assertEquals(tags, undefined, "The tags list should not be found");

//   const latestTag = await repo.repoLatestTag();
//   ta.assertEquals(latestTag, undefined, "The tag should not be found");
// });
