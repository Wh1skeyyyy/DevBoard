import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';

export const healthRouter = Router();

// Liveness + readiness in one endpoint: the process responding proves the
// app is alive; the SELECT 1 proves it can actually reach the database.
healthRouter.get('/health', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({
      application: 'DevBoard',
      status: 'healthy',
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      application: 'DevBoard',
      status: 'degraded',
      database: 'disconnected',
    });
  }
});
