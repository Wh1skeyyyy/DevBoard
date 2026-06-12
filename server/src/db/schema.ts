import { relations } from 'drizzle-orm';
import {
  bigint,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { GitHubActivityPayload } from '../github/types.js';

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

export const githubRepositories = pgTable(
  'github_repositories',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    githubId: bigint('github_id', { mode: 'number' }).notNull(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    defaultBranch: text('default_branch').notNull(),
    visibility: text('visibility').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('github_repositories_project_github_id_unique').on(
      table.projectId,
      table.githubId,
    ),
  ],
);

export const githubActivityCache = pgTable('github_activity_cache', {
  repositoryId: integer('repository_id')
    .primaryKey()
    .references(() => githubRepositories.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').$type<GitHubActivityPayload>().notNull(),
  repositoryEtag: text('repository_etag'),
  commitsEtag: text('commits_etag'),
  issuesEtag: text('issues_etag'),
  pullRequestsEtag: text('pull_requests_etag'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
  githubRepositories: many(githubRepositories),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const githubRepositoriesRelations = relations(
  githubRepositories,
  ({ one }) => ({
    project: one(projects, {
      fields: [githubRepositories.projectId],
      references: [projects.id],
    }),
    activityCache: one(githubActivityCache),
  }),
);

export const githubActivityCacheRelations = relations(
  githubActivityCache,
  ({ one }) => ({
    repository: one(githubRepositories, {
      fields: [githubActivityCache.repositoryId],
      references: [githubRepositories.id],
    }),
  }),
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type GitHubRepository = typeof githubRepositories.$inferSelect;
export type NewGitHubRepository = typeof githubRepositories.$inferInsert;
export type GitHubActivityCache = typeof githubActivityCache.$inferSelect;
