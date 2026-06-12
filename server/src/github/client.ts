import { z } from 'zod';
import { env } from '../config/env.js';
import type {
  GitHubActivityPayload,
  GitHubActor,
  GitHubRepositoryMetadata,
} from './types.js';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_API_VERSION = '2026-03-10';
const REQUEST_TIMEOUT_MS = 10_000;

const nullableUserSchema = z
  .object({
    login: z.string(),
    avatar_url: z.string().url(),
  })
  .nullable();

const repositorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  html_url: z.string().url(),
  description: z.string().nullable(),
  default_branch: z.string(),
  visibility: z.string(),
  owner: z.object({
    login: z.string(),
  }),
});

const commitsSchema = z.array(
  z.object({
    sha: z.string(),
    html_url: z.string().url(),
    author: nullableUserSchema,
    committer: nullableUserSchema,
    commit: z.object({
      message: z.string(),
      author: z
        .object({
          name: z.string(),
          date: z.string(),
        })
        .nullable(),
      committer: z
        .object({
          name: z.string(),
          date: z.string(),
        })
        .nullable(),
    }),
  }),
);

const issueSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  html_url: z.string().url(),
  user: nullableUserSchema,
  labels: z.array(
    z.union([
      z.string(),
      z.object({
        name: z.string().nullable(),
        color: z.string().nullable(),
      }),
    ]),
  ),
  comments: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
  pull_request: z.unknown().optional(),
});

const issuesSchema = z.array(issueSchema);

const pullRequestsSchema = z.array(
  z.object({
    number: z.number().int().positive(),
    title: z.string(),
    html_url: z.string().url(),
    user: nullableUserSchema,
    draft: z.boolean().nullish(),
    head: z.object({ ref: z.string() }),
    base: z.object({ ref: z.string() }),
    created_at: z.string(),
    updated_at: z.string(),
  }),
);

type GitHubResult<T> =
  | { status: 'modified'; data: T; etag: string | null }
  | { status: 'not_modified'; etag: string | null };

export class GitHubApiError extends Error {
  constructor(public status: number) {
    super('GitHub API request failed');
    this.name = 'GitHubApiError';
  }
}

function actor(
  user: z.infer<typeof nullableUserSchema>,
  fallbackName: string | null = null,
): GitHubActor {
  return {
    login: user?.login ?? null,
    name: fallbackName,
    avatarUrl: user?.avatar_url ?? null,
  };
}

async function githubGet<T>(
  path: string,
  schema: z.ZodType<T>,
  etag?: string | null,
): Promise<GitHubResult<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': 'DevBoard',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };
  if (etag) headers['If-None-Match'] = etag;

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_URL}${path}`, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GitHubApiError(503);
  }

  const responseEtag = response.headers.get('etag');
  if (response.status === 304) {
    return { status: 'not_modified', etag: responseEtag ?? etag ?? null };
  }
  if (!response.ok) {
    throw new GitHubApiError(response.status);
  }

  try {
    return {
      status: 'modified',
      data: schema.parse(await response.json()),
      etag: responseEtag,
    };
  } catch {
    throw new GitHubApiError(502);
  }
}

export function parseGitHubRepositoryUrl(value: string): {
  owner: string;
  name: string;
} {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GitHubApiError(400);
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.port ||
    url.username ||
    url.password ||
    parts.length !== 2 ||
    url.search ||
    url.hash
  ) {
    throw new GitHubApiError(400);
  }

  const name = parts[1].endsWith('.git') ? parts[1].slice(0, -4) : parts[1];
  if (!parts[0] || !name) throw new GitHubApiError(400);
  return { owner: parts[0], name };
}

export async function getRepository(
  owner: string,
  name: string,
  etag?: string | null,
): Promise<GitHubResult<GitHubRepositoryMetadata>> {
  const result = await githubGet(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    repositorySchema,
    etag,
  );
  if (result.status === 'not_modified') return result;

  return {
    status: 'modified',
    etag: result.etag,
    data: {
      githubId: result.data.id,
      owner: result.data.owner.login,
      name: result.data.name,
      url: result.data.html_url,
      description: result.data.description,
      defaultBranch: result.data.default_branch,
      visibility: result.data.visibility,
    },
  };
}

export async function getCommits(
  owner: string,
  name: string,
  etag?: string | null,
): Promise<GitHubResult<GitHubActivityPayload['commits']>> {
  let result;
  try {
    result = await githubGet(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits?per_page=10`,
      commitsSchema,
      etag,
    );
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 409) {
      return { status: 'modified', data: [], etag: null };
    }
    throw error;
  }
  if (result.status === 'not_modified') return result;

  return {
    status: 'modified',
    etag: result.etag,
    data: result.data.map((item) => {
      const gitAuthor = item.commit.author ?? item.commit.committer;
      return {
        sha: item.sha,
        message: item.commit.message,
        htmlUrl: item.html_url,
        author: actor(item.author ?? item.committer, gitAuthor?.name ?? null),
        committedAt: gitAuthor?.date ?? null,
      };
    }),
  };
}

export async function getIssues(
  owner: string,
  name: string,
  etag?: string | null,
): Promise<GitHubResult<GitHubActivityPayload['issues']>> {
  let result;
  try {
    result = await githubGet(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues?state=open&sort=updated&direction=desc&per_page=100`,
      issuesSchema,
      etag,
    );
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 410) {
      return { status: 'modified', data: [], etag: null };
    }
    throw error;
  }
  if (result.status === 'not_modified') return result;

  return {
    status: 'modified',
    etag: result.etag,
    data: result.data
      .filter((item) => item.pull_request === undefined)
      .slice(0, 10)
      .map((item) => ({
        number: item.number,
        title: item.title,
        htmlUrl: item.html_url,
        author: actor(item.user),
        labels: item.labels.flatMap((label) => {
          if (typeof label === 'string') {
            return [{ name: label, color: '' }];
          }
          return label.name ? [{ name: label.name, color: label.color ?? '' }] : [];
        }),
        comments: item.comments,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
  };
}

export async function getPullRequests(
  owner: string,
  name: string,
  etag?: string | null,
): Promise<GitHubResult<GitHubActivityPayload['pullRequests']>> {
  const result = await githubGet(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls?state=open&sort=updated&direction=desc&per_page=10`,
    pullRequestsSchema,
    etag,
  );
  if (result.status === 'not_modified') return result;

  return {
    status: 'modified',
    etag: result.etag,
    data: result.data.map((item) => ({
      number: item.number,
      title: item.title,
      htmlUrl: item.html_url,
      author: actor(item.user),
      draft: item.draft ?? false,
      headRef: item.head.ref,
      baseRef: item.base.ref,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  };
}
