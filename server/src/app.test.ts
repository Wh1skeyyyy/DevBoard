import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { pool } from './db/client.js';

const app = createApp();

afterAll(async () => {
  await pool.end();
});

describe('application error contracts', () => {
  it('returns validation details for an invalid project body', async () => {
    const response = await request(app).post('/api/projects').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details.name).toBeDefined();
  });

  it('rejects malformed GitHub URLs before accessing the database', async () => {
    const response = await request(app)
      .post('/api/projects/1/repositories')
      .send({ url: 'https://example.com/not-github' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid GitHub repository URL' });
  });

  it('returns a client error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid JSON body' });
  });

  it('returns JSON for unmatched routes', async () => {
    const response = await request(app).get('/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not Found' });
  });
});
