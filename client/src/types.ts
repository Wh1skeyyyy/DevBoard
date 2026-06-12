export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  description: string | null;
}

export interface TaskInput {
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
}

export interface RepositoryCacheSummary {
  fetchedAt: string;
  expiresAt: string;
}

export interface GitHubRepository {
  id: number;
  projectId: number;
  githubId: number;
  owner: string;
  name: string;
  url: string;
  description: string | null;
  defaultBranch: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  cache?: RepositoryCacheSummary | null;
}

export interface GitHubActor {
  login: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  htmlUrl: string;
  author: GitHubActor;
  committedAt: string | null;
}

export interface GitHubIssue {
  number: number;
  title: string;
  htmlUrl: string;
  author: GitHubActor;
  labels: Array<{ name: string; color: string }>;
  comments: number;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  htmlUrl: string;
  author: GitHubActor;
  draft: boolean;
  headRef: string;
  baseRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubActivity {
  repository: GitHubRepository;
  commits: GitHubCommit[];
  issues: GitHubIssue[];
  pullRequests: GitHubPullRequest[];
  cache: {
    status: 'fresh' | 'refreshed' | 'stale';
    fetchedAt: string;
    expiresAt: string;
    warning?: string;
  };
}
