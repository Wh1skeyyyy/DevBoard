import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
  githubActivityCache,
  githubRepositories,
  projects,
} from '../db/schema.js';
import {
  getRepository,
  parseGitHubRepositoryUrl,
} from '../github/client.js';
import {
  getRepositoryActivity,
  toGitHubHttpError,
} from '../github/service.js';
import { HttpError, notFound } from '../middleware/error.js';

export const projectRepositoriesRouter = Router({ mergeParams: true });
export const repositoriesRouter = Router();

const idParam = z.coerce.number().int().positive();
const createRepositorySchema = z.object({
  url: z.string().min(1),
});

async function requireProject(projectId: number): Promise<void> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) throw notFound('Project not found');
}

projectRepositoriesRouter.post<{ projectId: string }>('/', async (req, res) => {
  const projectId = idParam.parse(req.params.projectId);
  const { url } = createRepositorySchema.parse(req.body);

  let coordinates;
  try {
    coordinates = parseGitHubRepositoryUrl(url);
  } catch (error) {
    throw toGitHubHttpError(error);
  }

  await requireProject(projectId);

  let metadata;
  try {
    const result = await getRepository(coordinates.owner, coordinates.name);
    if (result.status === 'not_modified') {
      throw new HttpError(502, 'GitHub request failed');
    }
    metadata = result.data;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw toGitHubHttpError(error);
  }

  const [repository] = await db
    .insert(githubRepositories)
    .values({
      projectId,
      ...metadata,
    })
    .onConflictDoNothing()
    .returning();
  if (!repository) throw new HttpError(409, 'Repository is already linked to this project');
  res.status(201).json(repository);
});

projectRepositoriesRouter.get<{ projectId: string }>('/', async (req, res) => {
  const projectId = idParam.parse(req.params.projectId);
  await requireProject(projectId);

  const rows = await db
    .select({
      repository: githubRepositories,
      fetchedAt: githubActivityCache.fetchedAt,
      expiresAt: githubActivityCache.expiresAt,
    })
    .from(githubRepositories)
    .leftJoin(
      githubActivityCache,
      eq(githubActivityCache.repositoryId, githubRepositories.id),
    )
    .where(eq(githubRepositories.projectId, projectId))
    .orderBy(desc(githubRepositories.createdAt));

  res.json(
    rows.map(({ repository, fetchedAt, expiresAt }) => ({
      ...repository,
      cache: fetchedAt && expiresAt ? { fetchedAt, expiresAt } : null,
    })),
  );
});

projectRepositoriesRouter.delete<{
  projectId: string;
  repositoryId: string;
}>('/:repositoryId', async (req, res) => {
  const projectId = idParam.parse(req.params.projectId);
  const repositoryId = idParam.parse(req.params.repositoryId);
  await requireProject(projectId);

  const [deleted] = await db
    .delete(githubRepositories)
    .where(
      and(
        eq(githubRepositories.id, repositoryId),
        eq(githubRepositories.projectId, projectId),
      ),
    )
    .returning();
  if (!deleted) throw notFound('Repository not found');
  res.status(204).send();
});

repositoriesRouter.get('/:repositoryId/activity', async (req, res) => {
  const repositoryId = idParam.parse(req.params.repositoryId);
  res.json(await getRepositoryActivity(repositoryId));
});

repositoriesRouter.post('/:repositoryId/refresh', async (req, res) => {
  const repositoryId = idParam.parse(req.params.repositoryId);
  res.json(await getRepositoryActivity(repositoryId, true));
});
