# DevBoard — Phase 2: Projects & Tasks CRUD

> Hand-off spec for building Phase 2 with an external coding agent (e.g. Codex).
> Paste this into the agent while it is running in the `devboard` (this) folder.

## Context (read first)

This **continues an existing repo**. Phase 1 (Express 5 + TS scaffold, env validation, Drizzle client, `/health`, Postgres Compose) is already built and committed. **Do not** re-scaffold, re-run `git init`, or reinstall dependencies — everything from Phase 1 is in place. You are *adding* Phase 2 on top.

Phase 2 adds the first domain: **projects** and **tasks**, with a full CRUD REST API and committed SQL migrations.

**Locked decisions (carried from Phase 1 — do not revisit):**
- TypeScript + Express 5 + PostgreSQL via Drizzle ORM (`drizzle-orm` + `pg`)
- Single-user app: **no authentication, ever** — no users tables, sessions, or auth
- ESM modules (`"type": "module"`, NodeNext) — relative imports in `.ts` files end in `.js`
- Validation with zod; **no new dependencies** (`zod`, `drizzle-orm`, `pg`, `drizzle-kit` are all already installed)
- Express 5 auto-forwards rejected async handlers to error middleware — do **not** add `express-async-handler`

**Environment constraints (important):**
- Windows + **PowerShell 5.1**. Never chain with `&&`, never use `export`/`source`. One command at a time, or join with `;`.
- npm scripts stay cross-platform — no inline env vars in `package.json` scripts.
- **Docker is not installed on this machine.** `drizzle-kit generate` works offline (diffs the schema only, no DB), so produce and commit the migration SQL now. Applying it (`db:migrate`) and full CRUD testing are **deferred** until Postgres is up — provide the exact commands, don't block on them.

**Phase 2 scope — build exactly this:**
- `projects` and `tasks` tables in Drizzle (schema replaces the Phase 1 placeholder)
- Central error-handling middleware (Express 5 style)
- Full CRUD routers for projects and tasks, mounted under `/api`
- Initial Drizzle migration generated and committed
- `db:generate` / `db:migrate` npm scripts
- ESLint + TypeScript build, both passing
- One new commit

Do **not** add: auth, GitHub integration, the React client, pagination, automated tests (those are later phases).

**Data model (decided):** projects have `name`, `description`; tasks have `title`, `description`, `status` (todo/in_progress/done), `priority` (low/medium/high), `dueDate`, and a `projectId` FK. **Deleting a project cascade-deletes its tasks.**

---

## Step 1 — Schema: `server/src/db/schema.ts` (replace the placeholder)

```ts
import { relations } from 'drizzle-orm';
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'done']);
export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high']);

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatus('status').notNull().default('todo'),
  priority: taskPriority('priority').notNull().default('medium'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

## Step 2 — Error handling: `server/src/middleware/error.ts` (new)

```ts
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(message = 'Not found'): HttpError {
  return new HttpError(404, message);
}

// JSON 404 for any unmatched route.
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not Found' });
};

// Central error handler (4 args => Express treats it as the error middleware).
// Express 5 forwards rejected async route handlers here automatically.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
};
```

## Step 3 — Projects router: `server/src/routes/projects.ts` (new)

```ts
import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
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
```

## Step 4 — Tasks router: `server/src/routes/tasks.ts` (new)

```ts
import { Router } from 'express';
import { and, desc, eq, type SQL } from 'drizzle-orm';
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
```

## Step 5 — Wire up routers: `server/src/app.ts` (replace whole file)

```ts
import express from 'express';
import { healthRouter } from './routes/health.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

// App factory. Routers mount under /api; the 404 + error handler go LAST.
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(healthRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

## Step 6 — ESLint: `server/eslint.config.js` (replace whole file)

The 4-arg error handler has an unused trailing `_next` (required so Express recognizes it as error middleware). Teach ESLint to ignore underscore-prefixed args:

```js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  { ignores: ['dist/'] },
);
```

## Step 7 — Add migration scripts (from `server/`, PowerShell-safe)

```
npm pkg set "scripts.db:generate=drizzle-kit generate" "scripts.db:migrate=drizzle-kit migrate"
```

## Step 8 — Generate the migration (from `server/`)

```
npm run db:generate
```

This writes `server/drizzle/0000_*.sql` (CREATE TYPE for both enums, CREATE TABLE for `projects` and `tasks`, the FK with `ON DELETE CASCADE`) plus a `meta/` folder. No DB connection is needed. **These files are committed.**

## Step 9 — Verify

Runnable now (no database needed), from `server/`:
1. `npm run lint` → zero errors
2. `npm run build` → compiles to `dist/` with zero errors
3. Inspect `server/drizzle/0000_*.sql` — confirm the two enums, both tables, and the cascade FK
4. Validation path works without a DB. Build, then in one terminal `npm run start`, and in a second terminal:
   ```powershell
   try { Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/projects -ContentType 'application/json' -Body '{}' } catch { $_.ErrorDetails.Message }
   ```
   Expect a **400** body `{"error":"Validation failed",...}` (zod rejects before any DB call). `/api/projects/abc` likewise returns 400. A valid `GET /api/projects` will return 500 with no DB up — that's expected and proves the error handler, not a crash.

Deferred until Docker/Postgres is available (run from `devboard` root unless noted):
5. `docker compose up -d`; wait for `docker compose ps` to show the db **healthy**
6. From `server/`: `npm run db:migrate` (applies the committed SQL)
7. Full CRUD round-trip:
   ```powershell
   $p = Invoke-RestMethod -Method Post http://localhost:3000/api/projects -ContentType 'application/json' -Body '{"name":"DevBoard","description":"dogfooding"}'
   Invoke-RestMethod -Method Post http://localhost:3000/api/tasks -ContentType 'application/json' -Body (@{ projectId=$p.id; title="Ship Phase 2"; priority="high"; dueDate="2026-07-01" } | ConvertTo-Json)
   Invoke-RestMethod "http://localhost:3000/api/tasks?projectId=$($p.id)"
   Invoke-RestMethod -Method Delete "http://localhost:3000/api/projects/$($p.id)"   # cascades: its tasks are deleted too
   ```

## Step 10 — Commit

From the `devboard` root, one commit (portfolio repo — **no AI attribution / co-author trailer**):

```
git add .
git commit -m "feat(phase-2): projects & tasks schema, CRUD API, error handling, initial Drizzle migration"
```

## Acceptance checklist

- [ ] `npm run lint` passes, zero errors
- [ ] `npm run build` compiles to `dist/` with zero errors
- [ ] `server/drizzle/` has the generated migration (enums + both tables + cascade FK), and it's committed
- [ ] Invalid create bodies return 400 (validation) without a DB
- [ ] No new dependencies; no auth; no client folder
- [ ] One new commit with the Phase 2 message
