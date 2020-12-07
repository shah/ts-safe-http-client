import {
  git,
  managedGit as mGit,
  safeHttpClient as shc,
  urlcat,
} from "./deps.ts";
import * as gls from "./gitlab-schema.ts";
import * as gl from "./gitlab.ts";
import * as glg from "./group.ts";
import * as glr from "./repo.ts";

export type GitLabProjectID = string;
export type GitLabProjectURL = string;

export interface GitLabProjectIdentity extends mGit.ManagedGitProjectIdentity {
  readonly group: glg.GitLabGroupID;
  readonly project: GitLabProjectID;
}

export interface GitLabProjectHttpClientContext
  extends gl.GitLabHttpClientContext {
  readonly project: GitLabProject;
}

export class GitLabProject
  implements mGit.ManagedGitProject<GitLabProjectIdentity> {
  readonly isGitLabProject = true;
  readonly isManagedGitProject = true;

  constructor(
    readonly project: gls.GitLabProject,
    readonly identity: GitLabProjectIdentity,
  ) {
  }
}

export interface GitLabProjectsNextPageUrlSupplier {
  (
    activePage: shc.TraversalJsonContent<gls.GitLabProjects>,
  ): string | undefined;
}

export function gitLabProjectsTypicalNextPageUrlSupplier(
  activePage: shc.TraversalJsonContent<gls.GitLabProjects>,
): string | undefined {
  if (activePage.httpLinkHeader) {
    const links = activePage.httpLinkHeader();
    if (shc.isNextPageRfc8288WebLink(links)) {
      return links.next.targetIRI.toString();
    }
  }
  return undefined;
}

export interface GitLabProjectPopulateOptions {
  readonly populateProject: boolean;
  readonly construct: (
    manager: gl.GitLab,
    project: gls.GitLabProject,
    identity: GitLabProjectIdentity,
  ) => GitLabProject;
}

export interface GitLabProjectsPopulatorOptions {
  readonly pagesIteratorSafetyLimit?: number;
  readonly construct: (project: gls.GitLabProject) => GitLabProject | undefined;
  readonly initialApiUrl: (defaultParams: Record<string, unknown>) => string;
  readonly nextApiUrl: GitLabProjectsNextPageUrlSupplier;
}

export function gitLabGroupProjectsPopulator(
  manager: gl.GitLab,
  group: glg.GitLabStructComponent,
): GitLabProjectsPopulatorOptions {
  return {
    construct: (project: gls.GitLabProject): GitLabProject | undefined => {
      return new GitLabProject(project, {
        group: group.group.full_path,
        project: project.path_with_namespace,
      });
    },
    initialApiUrl: (defaultParams: Record<string, unknown>): string => {
      return urlcat.default(
        `https://${manager.server.host}/api/v4`,
        "groups/:encodedGroupRepo/projects",
        {
          ...defaultParams,
          // GitLab wants the group/sub-group/projects to be a single URL-encode string
          encodedGroupRepo: group.group.full_path,
        },
      );
    },
    nextApiUrl: gitLabProjectsTypicalNextPageUrlSupplier,
  };
}

export class GitLabProjects {
  protected projectsByFullPath = new Map<string, GitLabProject>();
  readonly projects: GitLabProject[] = [];

  atPath(path: string): GitLabProject | undefined {
    return this.projectsByFullPath.get(path);
  }

  async populate(
    manager: gl.GitLab,
    populateOptions: GitLabProjectsPopulatorOptions,
  ): Promise<void> {
    const {
      construct,
      initialApiUrl,
      nextApiUrl,
      pagesIteratorSafetyLimit,
    } = populateOptions;
    // deno-lint-ignore camelcase
    const initialApiParams = { per_page: 100 };
    let apiURL = initialApiUrl(initialApiParams);
    let page = 0;
    const pageCountSafetyLimit = pagesIteratorSafetyLimit || 50;
    while (page < pageCountSafetyLimit) {
      const apiClientCtx = manager.apiClientContext(apiURL);
      const projectsResult = await shc.safeTraverseJSON<gls.GitLabProjects>(
        apiClientCtx,
        shc.jsonContentInspector(gls.isGitLabProjects),
      );
      if (projectsResult && gls.isGitLabProjects(projectsResult.jsonInstance)) {
        for (const project of projectsResult.jsonInstance) {
          const constructed = construct(project);
          if (constructed) {
            this.projectsByFullPath.set(
              project.path_with_namespace,
              constructed,
            );
            this.projects.push(constructed);
          }
        }
        const nextUrl = nextApiUrl(projectsResult);
        if (nextUrl) {
          apiURL = nextUrl;
          page++;
          continue;
        }
      }
      break;
    }
  }
}
