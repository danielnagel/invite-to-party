import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import { resetDb, closeDb, pool, insertHost } from './helpers/db.js';

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe('access protection without a token', () => {
  it('rejects GET /api/auth/me without a session', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('rejects GET /api/parties without a session', async () => {
    const response = await request(app).get('/api/parties');
    expect(response.status).toBe(401);
  });

  it('rejects POST /api/parties without a session', async () => {
    const response = await request(app)
      .post('/api/parties')
      .send({ name: 'Party', slug: 'party', event_date: '2099-01-01' });
    expect(response.status).toBe(401);
  });

  it('rejects requests with a garbage token cookie', async () => {
    const response = await request(app)
      .get('/api/parties')
      .set('Cookie', ['token=not-a-real-jwt']);
    expect(response.status).toBe(401);
  });
});

describe('access with a still-valid session for a since-deleted host', () => {
  it('rejects GET /api/auth/me once the host behind the session no longer exists', async () => {
    const passwordHash = await bcrypt.hash('correcthorsebatterystaple', 10);
    const host = await insertHost({ username: 'ghosted', passwordHash });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'ghosted', password: 'correcthorsebatterystaple' });

    await pool.query('DELETE FROM hosts WHERE id = $1', [host.id]);

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(401);
  });
});
