import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { healthRouter } from './routes/health.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';

// App factory. Routers mount under /api; the 404 and error handler go last.
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
