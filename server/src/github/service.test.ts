import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GitHubActivityCache,
  GitHubRepository,
} from '../db/schema.js';

const mocks = vi.hoisted(() => {
  const repository: GitHubRepository = {
    id: 7,
    projectId: 2,
    githubId: 123,
    owner: 'acme',
    name: 'devboard',
    url: 'https://github.com/acme/devboard',
    description: 'Dashboard',
    defaultBranch: 'main',
    visibility: 'private',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const state: {
    repository: GitHubRepository;
    cache: GitHubActivityCache | null;
  } = {
    repository,
    cache: null,
  };

  const client = {
    getRepository: vi.fn(),
    getCommits: vi.fn(),
    getIssues: vi.fn(),
    getPullRequests: vi.fn(),
  };

  const db = {
    select: vi.fn(() => ({
      from: () => ({
        leftJoin: () => ({
          where: async () => [
            { repository: state.repository, cache: state.cache },
          ],
        }),
      }),
    })),
    transaction: vi.fn(
      async (
        callback: (transaction: {
          update: () => {
            set: (metadata: Partial<GitHubRepository>) => {
              where: () => {
                returning: () => Promise<GitHubRepository[]>;
              };
            };
          };
          insert: () => {
            values: (values: GitHubActivityCache) => {
              onConflictDoUpdate: () => Promise<void>;
            };
          };
        }) => Promise<GitHubRepository>,
      ) =>
        callback({
          update: () => ({
            set: (metadata) => ({
              where: () => ({
                returning: async () => {
                  state.repository = { ...state.repository, ...metadata };
                  return [state.repository];
                },
              }),
            }),
          }),
          insert: () => ({
            values: (values) => ({
              onConflictDoUpdate: async () => {
                state.cache = values;
              },
            }),
          }),
        }),
    ),
  };

  return { state, repository, client, db };
});

vi.mock('../db/client.js', () => ({ db: mocks.db }));
vi.mock('./client.js', () => ({
  GitHubApiError: class GitHubApiError extends Error {
    status: number;

    constructor(status: number) {
      super('GitHub API request failed');
      this.status = status;
    }
  },
  ...mocks.client,
}));

import { getRepositoryActivity } from './service.js';

const payload = {
  commits: [
    {
      sha: 'abc123',
      message: 'Ship it',
      htmlUrl: 'https://github.com/acme/devboard/commit/abc123',
      author: { login: 'octocat', name: null, avatarUrl: null },
      committedAt: '2026-01-02T00:00:00.000Z',
    },
  ],
  issues: [],
  pullRequests: [],
};

beforeEach(() => {
  mocks.state.repository = { ...mocks.repository };
  mocks.state.cache = null;
  mocks.client.getRepository.mockResolvedValue({
    status: 'modified',
    etag: '"repository"',
    data: {
      githubId: 123,
      owner: 'acme',
      name: 'devboard',
      url: 'https://github.com/acme/devboard',
      description: 'Dashboard',
      defaultBranch: 'main',
      visibility: 'private',
    },
  });
  mocks.client.getCommits.mockResolvedValue({
    status: 'modified',
    etag: '"commits"',
    data: payload.commits,
  });
  mocks.client.getIssues.mockResolvedValue({
    status: 'modified',
    etag: '"issues"',
    data: [],
  });
  mocks.client.getPullRequests.mockResolvedValue({
    status: 'modified',
    etag: '"pulls"',
    data: [],
  });
});

describe('GitHub activity cache service', () => {
  it('refreshes a cache miss and serves the next request as fresh', async () => {
    const refreshed = await getRepositoryActivity(7);

    expect(refreshed.cache.status).toBe('refreshed');
    expect(refreshed.commits).toHaveLength(1);
    expect(mocks.client.getRepository).toHaveBeenCalledTimes(1);

    const fresh = await getRepositoryActivity(7);

    expect(fresh.cache.status).toBe('fresh');
    expect(mocks.client.getRepository).toHaveBeenCalledTimes(1);
  });

  it('serves expired cached data as stale when GitHub fails', async () => {
    mocks.state.cache = {
      repositoryId: 7,
      payload,
      repositoryEtag: '"repository"',
      commitsEtag: '"commits"',
      issuesEtag: '"issues"',
      pullRequestsEtag: '"pulls"',
      fetchedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-01T00:05:00.000Z'),
    };
    mocks.client.getRepository.mockRejectedValue(new Error('offline'));

    const result = await getRepositoryActivity(7);

    expect(result.cache.status).toBe('stale');
    expect(result.cache.warning).toMatch(/serving cached data/);
    expect(result.commits[0].sha).toBe('abc123');
  });
});
