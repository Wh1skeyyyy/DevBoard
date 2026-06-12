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
  labels: Array<{
    name: string;
    color: string;
  }>;
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

export interface GitHubActivityPayload {
  commits: GitHubCommit[];
  issues: GitHubIssue[];
  pullRequests: GitHubPullRequest[];
}

export interface GitHubRepositoryMetadata {
  githubId: number;
  owner: string;
  name: string;
  url: string;
  description: string | null;
  defaultBranch: string;
  visibility: string;
}
