import express from 'express';
import { healthRouter } from './routes/health.js';

// App factory: the same pattern as CloudOps Lab's create_app(). Tests import
// createApp() and run requests against it without binding a real port.
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(healthRouter);
  return app;
}
