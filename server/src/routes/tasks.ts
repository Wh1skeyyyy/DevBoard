import { and, desc, eq, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { projects, tasks } from '../db/schema.js';
import { notFound } from '../middleware/error.js';

export const tasksRouter = Router();

const idParam = z.coerce.number().int().positive();
const statusEnum = z.enum(['todo', 'in_progress', 'done']);
const priorityEnum = z.enum(['low', 'medium', 'high']);

const createTaskSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullish(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  dueDate: z.coerce.date().nullish(),
});

const updateTaskSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().nullish(),
    status: statusEnum,
    priority: priorityEnum,
    dueDate: z.coerce.date().nullish(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const listQuerySchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  status: statusEnum.optional(),
});

tasksRouter.post('/', async (req, res) => {
  const data = createTaskSchema.parse(req.body);
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, data.projectId));
  if (!project) throw notFound('Project not found');
  const [task] = await db.insert(tasks).values(data).returning();
  res.status(201).json(task);
});

tasksRouter.get('/', async (req, res) => {
  const { projectId, status } = listQuerySchema.parse(req.query);
  const filters: SQL[] = [];
  if (projectId !== undefined) filters.push(eq(tasks.projectId, projectId));
  if (status !== undefined) filters.push(eq(tasks.status, status));
  const rows = await db
    .select()
    .from(tasks)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(tasks.createdAt));
  res.json(rows);
});

tasksRouter.get('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!task) throw notFound('Task not found');
  res.json(task);
});

tasksRouter.patch('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = updateTaskSchema.parse(req.body);
  const [task] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
  if (!task) throw notFound('Task not found');
  res.json(task);
});

tasksRouter.delete('/:id', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (!deleted) throw notFound('Task not found');
  res.status(204).send();
});
