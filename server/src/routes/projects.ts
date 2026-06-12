import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { projects } from '../db/schema.js';
import { notFound } from '../middleware/error.js';

export const projectsRouter = Router();

const idParam = z.coerce.number().int().positive();

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
});

const updateProjectSchema = createProjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

projectsRouter.post('/', async (req, res) => {
  const data = createProjectSchema.parse(req.body);
  const [project] = await db.insert(projects).values(data).returning();
  res.status(201).json(project);
});

projectsRouter.get('/', async (_req, res) => {
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  res.json(rows);
});

projectsRouter.get('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) throw notFound('Project not found');
  res.json(project);
});

projectsRouter.patch('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = updateProjectSchema.parse(req.body);
  const [project] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
  if (!project) throw notFound('Project not found');
  res.json(project);
});

projectsRouter.delete('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();
  if (!deleted) throw notFound('Project not found');
  res.status(204).send();
});
