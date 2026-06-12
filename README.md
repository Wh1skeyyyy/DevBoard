# DevBoard

A single-user developer dashboard for projects, tasks, deadlines, and live
GitHub repository data in one workspace.

**Stack:** TypeScript, Express 5, PostgreSQL with Drizzle ORM, React 19,
Tailwind CSS, Vite, and the GitHub REST API.

## Roadmap

- [x] Phase 1 - Backend scaffold: Express + TypeScript, environment validation, Drizzle client, health endpoint, and Postgres Compose
- [x] Phase 2 - Projects and tasks CRUD
- [x] Phase 3 - GitHub integration with persistent commits, issues, and pull request caching
- [x] Phase 4 - React and Tailwind client scaffold
- [x] Phase 5 - Project and task dashboard with search, filters, and CRUD workflows
- [x] Phase 6 - GitHub activity panels and responsive behavior
- [x] Phase 7 - Vitest, Testing Library, and Supertest coverage

## Run locally

1. Start PostgreSQL from the repository root:

   ```powershell
   docker compose up -d
   ```

2. Configure and start the API:

   ```powershell
   Set-Location server
   Copy-Item .env.example .env
   # Add GITHUB_TOKEN to .env before starting the server.
   npm install
   npm run db:migrate
   npm run dev
   ```

3. Start the client in a second terminal:

   ```powershell
   Set-Location client
   npm install
   npm run dev
   ```

The client runs on `http://localhost:5173` and proxies `/api` and `/health` to
the server on `http://localhost:3000`.

## GitHub Setup

Set `GITHUB_TOKEN` in `server/.env` to a fine-grained personal access token
with read-only Metadata, Contents, Issues, and Pull requests permissions for
every repository DevBoard should access.

Cached activity refreshes after five minutes by default. Override that with
`GITHUB_CACHE_TTL_SECONDS`.

## Verify

Run these commands from both `server/` and `client/`:

```powershell
npm run lint
npm run test
npm run build
```

The test suites use mocked database and GitHub boundaries, so they do not
require Docker or a real token.
