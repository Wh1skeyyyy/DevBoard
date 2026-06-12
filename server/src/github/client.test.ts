import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCommits,
  getIssues,
  getRepository,
  parseGitHubRepositoryUrl,
} from './client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitHub client', () => {
  it('accepts canonical repository URLs and rejects other hosts', () => {
    expect(
      parseGitHubRepositoryUrl('https://github.com/OpenAI/openai-node.git'),
    ).toEqual({ owner: 'OpenAI', name: 'openai-node' });

    expect(() =>
      parseGitHubRepositoryUrl('https://example.com/OpenAI/openai-node'),
    ).toThrow();
  });

  it('sends authentication, API version, and conditional request headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          id: 42,
          name: 'devboard',
          html_url: 'https://github.com/acme/devboard',
          description: 'Dashboard',
          default_branch: 'main',
          visibility: 'private',
          owner: { login: 'acme' },
        },
        { headers: { etag: '"next"' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getRepository('acme', 'devboard', '"previous"');
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(requestInit.headers);

    expect(result).toMatchObject({
      status: 'modified',
      etag: '"next"',
      data: { owner: 'acme', name: 'devboard', defaultBranch: 'main' },
    });
    expect(headers.get('authorization')).toBe('Bearer test-token');
    expect(headers.get('x-github-api-version')).toBe('2026-03-10');
    expect(headers.get('if-none-match')).toBe('"previous"');
  });

  it('treats an empty repository as an empty commit list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 409 })),
    );

    await expect(getCommits('acme', 'empty')).resolves.toEqual({
      status: 'modified',
      data: [],
      etag: null,
    });
  });

  it('filters pull requests out of the repository issues response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json([
          {
            number: 1,
            title: 'A real issue',
            html_url: 'https://github.com/acme/devboard/issues/1',
            user: null,
            labels: [],
            comments: 0,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
          },
          {
            number: 2,
            title: 'A pull request',
            html_url: 'https://github.com/acme/devboard/pull/2',
            user: null,
            labels: [],
            comments: 0,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
            pull_request: { url: 'ignored' },
          },
        ]),
      ),
    );

    const result = await getIssues('acme', 'devboard');

    expect(result.status).toBe('modified');
    if (result.status === 'modified') {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('A real issue');
    }
  });
});
