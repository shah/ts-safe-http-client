import {
  inspect as insp,
  managedGit as mGit,
  safeHttpClient as shc,
} from "./deps.ts";
import * as gls from "./gitlab-schema.ts";
import * as gl from "./gitlab.ts";

export type GitLabGroupID = string;

export interface GitLabGroupPopulateOptions {
  readonly populateGroup: true;
  readonly populateLabels: boolean;
}

export interface GitLabGroupsNextPageUrlSupplier {
  (activePage: shc.TraversalJsonContent<gls.GitLabGroups>): string | undefined;
}

export function gitLabGroupsTypicalNextPageUrlSupplier(
  activePage: shc.TraversalJsonContent<gls.GitLabGroups>,
): string | undefined {
  if (activePage.httpLinkHeader) {
    const links = activePage.httpLinkHeader();
    if (shc.isNextPageRfc8288WebLink(links)) {
      return links.next.targetIRI.toString();
    }
  }
  return undefined;
}

export interface GitLabGroupsPopulatorOptions {
  readonly pagesIteratorSafetyLimit?: number;
  readonly initialApiUrl?: (defaultParams: Record<string, unknown>) => string;
  readonly nextApiUrl?: GitLabGroupsNextPageUrlSupplier;
  readonly filterGroups?: (
    group: gls.GitLabGroup,
  ) => GitLabGroupPopulateOptions | false;
  readonly onUnstructurable?: (
    unstructured: GitLabStructComponent[],
    target:
      | GitLabStructure
      | insp.InspectionResult<GitLabStructure>,
  ) =>
    | GitLabStructure
    | insp.InspectionResult<GitLabStructure>;
}

export function gitLabGroupsPopulator(
  manager: gl.GitLab,
  options?: GitLabGroupsPopulatorOptions,
): insp.Inspector<GitLabStructure> {
  return async (
    target:
      | GitLabStructure
      | insp.InspectionResult<GitLabStructure>,
  ): Promise<
    | GitLabStructure
    | insp.InspectionResult<GitLabStructure>
  > => {
    const {
      initialApiUrl,
      nextApiUrl,
      filterGroups,
      pagesIteratorSafetyLimit,
      onUnstructurable,
    } = (options || {});
    const instance = insp.inspectionTarget(target);
    // deno-lint-ignore camelcase
    const initialApiParams = { top_level_only: false, per_page: 100 };
    let apiURL = initialApiUrl
      ? initialApiUrl(initialApiParams)
      : manager.managerApiURL("groups", initialApiParams);
    let page = 0;
    const pageCountSafetyLimit = pagesIteratorSafetyLimit || 50;
    const nextPageUrl = nextApiUrl || gitLabGroupsTypicalNextPageUrlSupplier;
    while (page < pageCountSafetyLimit) {
      const apiClientCtx = manager.apiClientContext(apiURL);
      const groupsResult = await shc.safeTraverseJSON<gls.GitLabGroups>(
        apiClientCtx,
        shc.jsonContentInspector(gls.isGitLabGroups),
      );
      if (groupsResult && gls.isGitLabGroups(groupsResult.jsonInstance)) {
        for (const group of groupsResult.jsonInstance) {
          let gpo: GitLabGroupPopulateOptions | false = false;
          if (filterGroups) {
            gpo = filterGroups(group);
            if (!gpo) continue;
          }
          instance.register(new GitLabStructComponent(group));
        }
        const nextUrl = nextPageUrl(groupsResult);
        if (nextUrl) {
          apiURL = nextUrl;
          page++;
          continue;
        }
      }
      break;
    }
    const unstructured = instance.finalize();
    if (unstructured.length > 0 && onUnstructurable) {
      return onUnstructurable(unstructured, target);
    }
    return target;
  };
}

export class GitLabStructComponent
  implements mGit.GitManagerHierarchicalComponent {
  protected subGroups: GitLabStructComponent[] = [];

  constructor(
    readonly group: gls.GitLabGroup,
    readonly level: number = 0,
    readonly parentGroup?: GitLabStructComponent,
  ) {
  }

  get name(): string {
    return this.group.name;
  }

  get components(): GitLabStructComponent[] {
    return this.subGroups;
  }

  get parent(): GitLabStructComponent | undefined {
    return this.parentGroup;
  }

  get isTopLevel(): boolean {
    return this.level == 0;
  }

  get hasChildren(): boolean {
    return this.components.length > 0;
  }

  register(c: GitLabStructComponent): void {
    const group = c.group;
    const parentId = group.parent_id;
    if (this.group.id == parentId) {
      // deno-lint-ignore no-explicit-any
      const unsafeC = c as any;
      unsafeC.level = this.level + 1;
      this.components.push(c);
    } else {
      throw new Error(
        `Group ID ${this.group.id} (${this.group.full_name}) is not the parent of ${c.group.id} (${c.group.full_name})`,
      );
    }
  }
}

export class GitLabStructure implements mGit.GitManagerStructure {
  protected groupsFetch: shc.SafeFetchJSON<gls.GitLabGroups>;
  protected populated: number;
  protected topLevelGroups: GitLabStructComponent[] = [];
  protected groupsById = new Map<number, GitLabStructComponent>();
  protected groupsByFullPath = new Map<string, GitLabStructComponent>();
  protected unstructured: GitLabStructComponent[] = [];

  constructor(readonly manager: gl.GitLab) {
    this.groupsFetch = shc.safeFetchJSON;
    this.populated = 0;
  }

  get components(): GitLabStructComponent[] {
    return this.topLevelGroups;
  }

  atPath(path: string): GitLabStructComponent | undefined {
    return this.groupsByFullPath.get(path);
  }

  register(c: GitLabStructComponent): void {
    this.populated++;
    const group = c.group;
    const parentId = group.parent_id;

    this.groupsById.set(group.id, c);
    this.groupsByFullPath.set(group.full_path, c);
    if (parentId == null) {
      this.components.push(c);
    } else {
      const parent = this.groupsById.get(parentId);
      if (parent) {
        parent.register(c);
      } else {
        this.unstructured.push(c);
      }
    }
  }

  finalize(): GitLabStructComponent[] {
    const result: GitLabStructComponent[] = [];
    let component = this.unstructured.shift();
    while (component) {
      const parentId = component.group.parent_id;
      const parent = this.groupsById.get(parentId!);
      if (parent) {
        parent.register(component);
      } else {
        result.push(component);
      }
      component = this.unstructured.shift();
    }
    return result;
  }
}
