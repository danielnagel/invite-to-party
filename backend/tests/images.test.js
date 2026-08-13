import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import request from 'supertest';
import app from '../src/app.js';
import { resetDb, closeDb, insertParty } from './helpers/db.js';
import { createAndLoginHost } from './helpers/auth.js';

const FIXTURE_IMAGE = path.resolve(import.meta.dirname, '../assets/demo-images/party-1.png');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe('GET /api/images/:id/file', () => {
  it('streams a stored image without needing auth', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    const uploadResponse = await agent
      .post(`/api/parties/${party.id}/images`)
      .attach('image', FIXTURE_IMAGE);

    const response = await request(app).get(`/api/images/${uploadResponse.body.id}/file`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
  });

  it('returns 404 for an unknown image', async () => {
    const response = await request(app).get(
      '/api/images/00000000-0000-0000-0000-000000000000/file',
    );

    expect(response.status).toBe(404);
  });
});

describe('GET /api/parties/:id/random-background', () => {
  it('returns a random image for the party without needing auth', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    await agent.post(`/api/parties/${party.id}/images`).attach('image', FIXTURE_IMAGE);

    const response = await request(app).get(`/api/parties/${party.id}/random-background`);

    expect(response.status).toBe(200);
    expect(response.body.url).toMatch(/^\/api\/images\/.+\/file$/);
  });

  it('returns 404 when the party has no images', async () => {
    const party = await insertParty();

    const response = await request(app).get(`/api/parties/${party.id}/random-background`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('no_images');
  });
});

describe('GET /api/images/random-background', () => {
  it('requires a host session', async () => {
    const response = await request(app).get('/api/images/random-background');

    expect(response.status).toBe(401);
  });

  it('returns a random image across all parties', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    await agent.post(`/api/parties/${party.id}/images`).attach('image', FIXTURE_IMAGE);

    const response = await agent.get('/api/images/random-background');

    expect(response.status).toBe(200);
    expect(response.body.url).toMatch(/^\/api\/images\/.+\/file$/);
  });
});
