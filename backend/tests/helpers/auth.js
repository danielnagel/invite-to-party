import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import { insertHost } from './db.js';

const PASSWORD = 'password123';

/**
 * Creates a host directly in the DB and logs them in via the real HTTP
 * endpoint, returning a supertest agent that carries the session cookie.
 */
export async function createAndLoginHost(username = `host-${Math.random().toString(36).slice(2)}`) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await insertHost({ username, passwordHash });

  const agent = request.agent(app);
  const loginResponse = await agent
    .post('/api/auth/login')
    .send({ username, password: PASSWORD });

  if (loginResponse.status !== 200) {
    throw new Error(`Test login failed: ${JSON.stringify(loginResponse.body)}`);
  }

  return { agent, username };
}
