import type {
  GitHubActivity,
  GitHubRepository,
  Project,
  ProjectInput,
  Task,
  TaskInput,
} from '../types';

interface ApiErrorBody {
  error?: string;
  details?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // The status text is used when an upstream response is not JSON.
    }
    const validationMessage = body.details
      ? Object.values(body.details).flat().at(0)
      : undefined;
    throw new ApiError(
      response.status,
      validationMessage ?? body.error ?? response.statusText ?? 'Request failed',
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listProjects: () => request<Project[]>('/api/projects'),
  createProject: (input: ProjectInput) =>
    request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateProject: (projectId: number, input: Partial<ProjectInput>) =>
    request<Project>(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteProject: (projectId: number) =>
    request<void>(`/api/projects/${projectId}`, { method: 'DELETE' }),
  listTasks: (projectId: number) =>
    request<Task[]>(`/api/tasks?projectId=${projectId}`),
  createTask: (input: TaskInput) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateTask: (taskId: number, input: Partial<Omit<TaskInput, 'projectId'>>) =>
    request<Task>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteTask: (taskId: number) =>
    request<void>(`/api/tasks/${taskId}`, { method: 'DELETE' }),
  listRepositories: (projectId: number) =>
    request<GitHubRepository[]>(`/api/projects/${projectId}/repositories`),
  linkRepository: (projectId: number, url: string) =>
    request<GitHubRepository>(`/api/projects/${projectId}/repositories`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  deleteRepository: (projectId: number, repositoryId: number) =>
    request<void>(
      `/api/projects/${projectId}/repositories/${repositoryId}`,
      { method: 'DELETE' },
    ),
  getRepositoryActivity: (repositoryId: number) =>
    request<GitHubActivity>(`/api/repositories/${repositoryId}/activity`),
  refreshRepository: (repositoryId: number) =>
    request<GitHubActivity>(`/api/repositories/${repositoryId}/refresh`, {
      method: 'POST',
    }),
};
