import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import type { GitHubActivity, GitHubRepository } from '../types';
import { GitHubPanel } from './GitHubPanel';

vi.mock('../lib/api', () => ({
  api: {
    listRepositories: vi.fn(),
    linkRepository: vi.fn(),
    deleteRepository: vi.fn(),
    getRepositoryActivity: vi.fn(),
    refreshRepository: vi.fn(),
  },
}));

const repository: GitHubRepository = {
  id: 5,
  projectId: 1,
  githubId: 99,
  owner: 'acme',
  name: 'devboard',
  url: 'https://github.com/acme/devboard',
  description: 'Developer dashboard',
  defaultBranch: 'main',
  visibility: 'private',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  cache: null,
};

const activity: GitHubActivity = {
  repository,
  commits: [
    {
      sha: 'abc123456789',
      message: 'Ship the GitHub panel',
      htmlUrl: 'https://github.com/acme/devboard/commit/abc1234',
      author: { login: 'octocat', name: null, avatarUrl: null },
      committedAt: '2026-06-11T00:00:00.000Z',
    },
  ],
  issues: [],
  pullRequests: [],
  cache: {
    status: 'stale',
    fetchedAt: '2026-06-11T00:00:00.000Z',
    expiresAt: '2026-06-11T00:05:00.000Z',
    warning: 'GitHub refresh failed; serving cached data',
  },
};

const mockedApi = vi.mocked(api);

beforeEach(() => {
  mockedApi.listRepositories.mockResolvedValue([repository]);
  mockedApi.getRepositoryActivity.mockResolvedValue(activity);
  mockedApi.refreshRepository.mockResolvedValue({
    ...activity,
    cache: {
      status: 'refreshed',
      fetchedAt: '2026-06-12T00:00:00.000Z',
      expiresAt: '2026-06-12T00:05:00.000Z',
    },
  });
});

describe('GitHubPanel', () => {
  it('renders cached activity and refreshes on demand', async () => {
    const user = userEvent.setup();
    render(<GitHubPanel projectId={1} />);

    expect(await screen.findByText('Ship the GitHub panel')).toBeInTheDocument();
    expect(
      screen.getByText('GitHub refresh failed; serving cached data'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Refresh repository activity' }),
    );

    await waitFor(() => {
      expect(mockedApi.refreshRepository).toHaveBeenCalledWith(5);
    });
    expect(await screen.findByText('refreshed')).toBeInTheDocument();
  });
});
