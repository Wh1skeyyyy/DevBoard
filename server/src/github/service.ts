import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import {
  githubActivityCache,
  githubRepositories,
  type GitHubActivityCache,
  type GitHubRepository,
} from '../db/schema.js';
import { HttpError, notFound } from '../middleware/error.js';
import {
  getCommits,
  getIssues,
  getPullRequests,
  getRepository,
  GitHubApiError,
} from './client.js';
import type { GitHubActivityPayload } from './types.js';

export type ActivityCacheStatus = 'fresh' | 'refreshed' | 'stale';

export interface ActivityResponse extends GitHubActivityPayload {
  repository: GitHubRepository;
  cache: {
    status: ActivityCacheStatus;
    fetchedAt: Date;
    expiresAt: Date;
    warning?: string;
  };
}

const refreshes = new Map<number, Promise<ActivityResponse>>();

function activityUpstreamError(error: unknown): HttpError {
  if (!(error instanceof GitHubApiError)) {
    return new HttpError(503, 'GitHub is temporarily unavailable');
  }
  if (error.status === 401) {
    return new HttpError(502, 'GitHub credentials were rejected');
  }
  if (error.status === 403 || error.status === 429 || error.status >= 500) {
    return new HttpError(503, 'GitHub is temporarily unavailable');
  }
  return new HttpError(502, 'GitHub request failed');
}

function linkUpstreamError(error: unknown): HttpError {
  if (error instanceof GitHubApiError && error.status === 400) {
    return new HttpError(400, 'Invalid GitHub repository URL');
  }
  if (error instanceof GitHubApiError && error.status === 404) {
    return new HttpError(404, 'GitHub repository not found or inaccessible');
  }
  return activityUpstreamError(error);
}

function responseFromCache(
  repository: GitHubRepository,
  cache: GitHubActivityCache,
  status: ActivityCacheStatus,
): ActivityResponse {
  return {
    repository,
    ...cache.payload,
    cache: {
      status,
      fetchedAt: cache.fetchedAt,
      expiresAt: cache.expiresAt,
      ...(status === 'stale'
        ? { warning: 'GitHub refresh failed; serving cached data' }
        : {}),
    },
  };
}

async function loadRepository(repositoryId: number): Promise<{
  repository: GitHubRepository;
  cache: GitHubActivityCache | null;
}> {
  const [row] = await db
    .select({
      repository: githubRepositories,
      cache: githubActivityCache,
    })
    .from(githubRepositories)
    .leftJoin(
      githubActivityCache,
      eq(githubActivityCache.repositoryId, githubRepositories.id),
    )
    .where(eq(githubRepositories.id, repositoryId));

  if (!row) throw notFound('Repository not found');
  return row;
}

async function refreshRepository(
  repository: GitHubRepository,
  cache: GitHubActivityCache | null,
): Promise<ActivityResponse> {
  let results;
  try {
    const metadata = await getRepository(
      repository.owner,
      repository.name,
      cache?.repositoryEtag,
    );
    const commits = await getCommits(
      repository.owner,
      repository.name,
      cache?.commitsEtag,
    );
    const issues = await getIssues(
      repository.owner,
      repository.name,
      cache?.issuesEtag,
    );
    const pullRequests = await getPullRequests(
      repository.owner,
      repository.name,
      cache?.pullRequestsEtag,
    );
    results = { metadata, commits, issues, pullRequests };
  } catch (error) {
    if (cache) return responseFromCache(repository, cache, 'stale');
    throw activityUpstreamError(error);
  }

  const { metadata, commits, issues, pullRequests } = results;
  if (
    !cache &&
    (metadata.status === 'not_modified' ||
      commits.status === 'not_modified' ||
      issues.status === 'not_modified' ||
      pullRequests.status === 'not_modified')
  ) {
    throw new HttpError(502, 'GitHub request failed');
  }

  const repositoryMetadata =
    metadata.status === 'modified'
      ? metadata.data
      : {
          githubId: repository.githubId,
          owner: repository.owner,
          name: repository.name,
          url: repository.url,
          description: repository.description,
          defaultBranch: repository.defaultBranch,
          visibility: repository.visibility,
        };
  const payload: GitHubActivityPayload = {
    commits: commits.status === 'modified' ? commits.data : cache!.payload.commits,
    issues: issues.status === 'modified' ? issues.data : cache!.payload.issues,
    pullRequests:
      pullRequests.status === 'modified'
        ? pullRequests.data
        : cache!.payload.pullRequests,
  };
  const fetchedAt = new Date();
  const expiresAt = new Date(
    fetchedAt.getTime() + env.GITHUB_CACHE_TTL_SECONDS * 1000,
  );

  const updatedRepository = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(githubRepositories)
      .set(repositoryMetadata)
      .where(eq(githubRepositories.id, repository.id))
      .returning();
    if (!updated) throw notFound('Repository not found');

    await tx
      .insert(githubActivityCache)
      .values({
        repositoryId: repository.id,
        payload,
        repositoryEtag: metadata.etag,
        commitsEtag: commits.etag,
        issuesEtag: issues.etag,
        pullRequestsEtag: pullRequests.etag,
        fetchedAt,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: githubActivityCache.repositoryId,
        set: {
          payload,
          repositoryEtag: metadata.etag,
          commitsEtag: commits.etag,
          issuesEtag: issues.etag,
          pullRequestsEtag: pullRequests.etag,
          fetchedAt,
          expiresAt,
        },
      });

    return updated;
  });

  return {
    repository: updatedRepository,
    ...payload,
    cache: {
      status: 'refreshed',
      fetchedAt,
      expiresAt,
    },
  };
}

export async function getRepositoryActivity(
  repositoryId: number,
  forceRefresh = false,
): Promise<ActivityResponse> {
  const { repository, cache } = await loadRepository(repositoryId);

  if (!forceRefresh && cache && cache.expiresAt.getTime() > Date.now()) {
    return responseFromCache(repository, cache, 'fresh');
  }

  const existing = refreshes.get(repositoryId);
  if (existing) return existing;

  const refresh = refreshRepository(repository, cache).finally(() => {
    refreshes.delete(repositoryId);
  });
  refreshes.set(repositoryId, refresh);
  return refresh;
}

export function toGitHubHttpError(error: unknown): HttpError {
  return linkUpstreamError(error);
}
