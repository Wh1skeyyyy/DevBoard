# DevBoard

A single-user developer dashboard for projects, tasks, deadlines, and live
GitHub repository data in one workspace.

**Stack:** TypeScript, Express 5, PostgreSQL (Drizzle ORM), React + Tailwind
(coming), GitHub REST API.

## Roadmap

- [x] Phase 1 - Backend scaffold: Express + TypeScript, environment validation, Drizzle client, health endpoint, and Postgres Compose
- [x] Phase 2 - Projects and tasks CRUD
- [x] Phase 3 - GitHub integration with persistent commits, issues, and pull request caching
- [ ] Phase 4 - React + Tailwind scaffold
- [ ] Phase 5 - Dashboard UI: reusable components and search/filter
- [ ] Phase 6 - GitHub panels and responsive pass
- [ ] Phase 7 - Tests with Vitest and Supertest

## GitHub Setup

Set `GITHUB_TOKEN` in `server/.env` to a fine-grained personal access token
with read-only Metadata, Contents, Issues, and Pull requests permissions for
every repository DevBoard should access.

Cached activity refreshes after five minutes by default. Override that with
`GITHUB_CACHE_TTL_SECONDS`.
