import { safety } from "./deps.ts";

export enum GitLabMembershipScope {
  GROUPS = "groups",
  PROJECTS = "projects",
}

export enum GitLabScope {
  ISSUES = "issues",
  MERGE_REQUESTS = "merge_requests",
}

export enum GitLabMergeRequestState {
  CLOSED = "closed",
  LOCKED = "locked",
  MERGED = "merged",
  OPENED = "opened",
}

export enum GitLabIssueState {
  CLOSED = "closed",
  OPENED = "opened",
  REOPENED = "reopened",
}

export enum GitLabMilestoneState {
  ACTIVE = "active",
  CLOSED = "closed",
}

export enum GitLabUserState {
  ACTIVE = "active",
  BLOCKED = "blocked",
}

export enum GitLabMergeRequestMergeStatus {
  CAN_BE_MERGED = "can_be_merged",
}

export enum GitLabNoteType {
  DIFF_NOTE = "DiffNote",
}

export enum GitLabNoteableType {
  MERGE_REQUST = "MergeRequest",
}

export interface GitLabLabel {
  color: string;
  description?: string;
  name: string;
}

export interface GitLabCommit {
  author_email: string;
  author_name: string;
  authored_date: string;
  committed_date: string;
  committer_email: string;
  committer_name: string;
  id: string;
  message: string;
  parent_ids: string[];
}

export interface GitLabRepoTag {
  commit: GitLabCommit;
  message: string | null;
  name: string;
  release: null;
}

export type GitLabRepoTags = GitLabRepoTag[];
export const [isGitLabRepoTag, isGitLabRepoTags] = safety.typeGuards<
  GitLabRepoTag,
  GitLabRepoTags
>("name");

export interface GitLabNamespace {
  full_path: string;
  id: number;
  kind: string;
  name: string;
  path: string;
}

export interface GitLabProject {
  archived: boolean;
  avatar_url: string;
  container_registry_enabled: boolean;
  created_at: string;
  creator_id: number;
  default_branch: string;
  description: string;
  forks_count: number;
  http_url_to_repo: string;
  id: number;
  issues_enabled: boolean;
  jobs_enabled: boolean;
  last_activity_at: string;
  lfs_enabled: boolean;
  merge_requests_enabled: boolean;
  name: string;
  name_with_namespace: string;
  namespace: GitLabNamespace;
  only_allow_merge_if_all_discussions_are_resolved: boolean;
  only_allow_merge_if_pipeline_succeeds: boolean;
  open_issues_count: number;
  path: string;
  path_with_namespace: string;
  public_jobs: boolean;
  request_access_enabled: boolean;
  shared_runners_enabled: boolean;
  shared_with_groups: unknown[];
  snippets_enabled: boolean;
  ssh_url_to_repo: string;
  star_count: number;
  tag_list: string[];
  visibility: string;
  web_url: string;
  wiki_enabled: boolean;
}

export interface GitLabTreeFile {
  id: string;
  mode: string;
  name: string;
  path: string;
  type: string;
}

export interface GitLabMember extends GitLabUser {
  access_level: GitLabAccessLevel;
  expires_at: string;
}

export enum GitLabAccessLevel {
  Guest = 10,
  Reporter = 20,
  Developer = 30,
  Maintainer = 40,
  Owner = 50,
}

export interface GitLabMilestone {
  created_at: string;
  description: string | null;
  due_date: string;
  id: number;
  iid: number;
  project_id: number;
  start_date: string;
  state: GitLabMilestoneState;
  title: string;
  updated_at: string;
}

export interface GitLabBranch {
  commit: GitLabCommit;
  developers_can_merge: boolean;
  developers_can_push: boolean;
  merged: boolean;
  name: string;
  protected: boolean;
}

export interface GitLabUser {
  avatar_url: string;
  id: number;
  name: string;
  state: GitLabUserState;
  username: string;
  web_url: string;
}

export interface GitLabIssue extends GitLabTemporal {
  assignee: GitLabUser;
  assignees: GitLabUser[];
  author: GitLabUser;
  closed_at: string | null;
  confidential: boolean;
  created_at: string;
  description: string | null;
  discussion_locked: boolean | null;
  downvotes: number;
  due_date: string | null;
  id: number;
  iid: number;
  labels: string[];
  milestone: GitLabMilestone | null;
  project_id: number;
  state: GitLabIssueState;
  title: string;
  updated_at: string;
  upvotes: number;
  user_notes_count: number;
  web_url: string;
}

export interface GitLabMergeRequest extends GitLabTemporal {
  assignee: GitLabUser;
  author: GitLabUser;
  created_at: string;
  description: string | null;
  discussion_locked: boolean | null;
  downvotes: number;
  force_remove_source_branch: boolean;
  id: number;
  iid: number;
  labels: GitLabLabel[];
  merge_commit_sha: string;
  merge_status: GitLabMergeRequestMergeStatus;
  merge_when_pipeline_succeeds: boolean;
  milestone: GitLabMilestone;
  project_id: number;
  sha: string;
  should_remove_source_branch: boolean;
  source_branch: string;
  source_project_id: number;
  state: GitLabMergeRequestState;
  target_branch: string;
  target_project_id: number;
  title: string;
  updated_at: string;
  upvotes: number;
  user_notes_count: number;
  web_url: string;
  work_in_progress: boolean;
}

export interface GitLabMergeRequestApproval {
  approvals_left: number;
  approvals_required: number;
  approved_by: Array<{ user: GitLabUser }>;
  approver_groups: GitLabGroup[];
  approvers: GitLabUser[];
  created_at: string;
  description: string;
  id: number;
  iid: number;
  merge_status: GitLabMergeRequestMergeStatus;
  project_id: number;
  state: GitLabMergeRequestState;
  title: string;
  updated_at: string;
}

export interface GitLabTemporal {
  time_stats: {
    human_time_estimate: number | null;
    human_total_time_spent: number | null;
    time_estimate: number;
    total_time_spent: number;
  };
}

export interface GitLabGroup {
  avatar_url: string;
  description: string;
  full_name: string;
  full_path: string;
  id: number;
  ldap_access: string;
  ldap_cn: string;
  lfs_enabled: boolean;
  name: string;
  parent_id: number;
  path: string;
  request_access_enabled: boolean;
  visibility: string;
  web_url: string;
}

export type GitLabGroups = GitLabGroup[];
export const [isGitLabGroup, isGitLabGroups] = safety.typeGuards<
  GitLabGroup,
  GitLabGroups
>("name", "path");

export interface GitLabDiscussion {
  id: string;
  individual_note: boolean;
  notes: GitLabNote[];
}

export interface GitLabNote {
  attachment: null;
  author: GitLabUser;
  body: string;
  created_at: string;
  id: number;
  noteable_id: number;
  noteable_iid: number;
  noteable_type: GitLabNoteableType;
  position: {
    base_sha: string;
    head_sha: string;
    new_line: number | null;
    new_path: string;
    old_line: number | null;
    old_path: string;
    position_type: string;
    start_sha: string;
  };
  resolvable: boolean;
  resolved: boolean | undefined;
  resolved_by: GitLabUser | undefined;
  system: boolean;
  type: GitLabNoteType;
  updated_at: string;
}
