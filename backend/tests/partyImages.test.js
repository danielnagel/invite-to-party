import { beforeEach, afterAll, afterEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { resetDb, closeDb, insertParty } from './helpers/db.js';
import { createAndLoginHost } from './helpers/auth.js';

const FIXTURE_IMAGE = path.resolve(import.meta.dirname, '../assets/demo-images/party-1.png');
const ORIGINAL_MODE = process.env.MODE;

beforeEach(async () => {
  await resetDb();
});

afterEach(() => {
  process.env.MODE = ORIGINAL_MODE;
});

afterAll(async () => {
  await closeDb();
});

describe('POST /api/parties/:id/images', () => {
  it('uploads an image for a party', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();

    const response = await agent
      .post(`/api/parties/${party.id}/images`)
      .attach('image', FIXTURE_IMAGE);

    expect(response.status).toBe(201);
    expect(response.body.party_id).toBe(party.id);
    expect(response.body.filename).toBe('party-1.png');
  });

  it('rejects a non-image file', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();

    const response = await agent
      .post(`/api/parties/${party.id}/images`)
      .attach('image', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown party', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent
      .post('/api/parties/00000000-0000-0000-0000-000000000000/images')
      .attach('image', FIXTURE_IMAGE);

    expect(response.status).toBe(404);
  });

  it('is blocked with 403 in demo mode', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    process.env.MODE = 'demo';

    const response = await agent
      .post(`/api/parties/${party.id}/images`)
      .attach('image', FIXTURE_IMAGE);

    expect(response.status).toBe(403);
  });
});

describe('GET /api/parties/:id/images', () => {
  it('lists uploaded images for a party', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    await agent.post(`/api/parties/${party.id}/images`).attach('image', FIXTURE_IMAGE);

    const response = await agent.get(`/api/parties/${party.id}/images`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});

describe('DELETE /api/parties/:id/images/:imageId', () => {
  it('deletes an uploaded image', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    const uploadResponse = await agent
      .post(`/api/parties/${party.id}/images`)
      .attach('image', FIXTURE_IMAGE);

    const response = await agent.delete(
      `/api/parties/${party.id}/images/${uploadResponse.body.id}`,
    );

    expect(response.status).toBe(204);

    const listResponse = await agent.get(`/api/parties/${party.id}/images`);
    expect(listResponse.body).toHaveLength(0);
  });

  it('returns 404 for an unknown image', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();

    const response = await agent.delete(
      `/api/parties/${party.id}/images/00000000-0000-0000-0000-000000000000`,
    );

    expect(response.status).toBe(404);
  });
});
