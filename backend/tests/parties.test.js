import { beforeEach, afterAll, afterEach, describe, expect, it } from 'vitest';
import { resetDb, closeDb, insertParty } from './helpers/db.js';
import { createAndLoginHost } from './helpers/auth.js';

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

describe('POST /api/parties', () => {
  it('creates a party with the required fields, defaulting the labels', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent.post('/api/parties').send({
      name: 'Summer Rooftop Party',
      slug: 'summer-rooftop',
      event_date: '2099-06-01',
    });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Summer Rooftop Party');
    expect(response.body.slug).toBe('summer-rooftop');
    expect(response.body.accept_label).toBe('Accept');
    expect(response.body.decline_label).toBe('Decline');
    expect(response.body.companion_field_visible).toBe(false);
  });

  it('accepts custom labels and companion visibility', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent.post('/api/parties').send({
      name: 'Wedding',
      slug: 'wedding',
      event_date: '2099-06-01',
      accept_label: "We'll be there",
      decline_label: 'Sadly not',
      companion_field_label: 'Plus one?',
      companion_field_visible: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.accept_label).toBe("We'll be there");
    expect(response.body.companion_field_visible).toBe(true);
  });

  it('rejects a missing name', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent
      .post('/api/parties')
      .send({ slug: 'no-name', event_date: '2099-06-01' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_party');
  });

  it('rejects an invalid slug', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent
      .post('/api/parties')
      .send({ name: 'Party', slug: 'Not A Slug!', event_date: '2099-06-01' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_party');
  });

  it('rejects an invalid event_date', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent
      .post('/api/parties')
      .send({ name: 'Party', slug: 'party', event_date: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_party');
  });

  it('rejects a duplicate slug', async () => {
    const { agent } = await createAndLoginHost();
    await insertParty({ slug: 'taken-slug' });

    const response = await agent
      .post('/api/parties')
      .send({ name: 'Party', slug: 'taken-slug', event_date: '2099-06-01' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('slug_taken');
  });

  it('is blocked with 403 in demo mode', async () => {
    const { agent } = await createAndLoginHost();
    process.env.MODE = 'demo';

    const response = await agent
      .post('/api/parties')
      .send({ name: 'Party', slug: 'party', event_date: '2099-06-01' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('demo_mode_disabled');
  });
});

describe('GET /api/parties', () => {
  it('lists all parties', async () => {
    const { agent } = await createAndLoginHost();
    await insertParty({ name: 'A', slug: 'a' });
    await insertParty({ name: 'B', slug: 'b' });

    const response = await agent.get('/api/parties');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });
});

describe('GET /api/parties/:id', () => {
  it('returns 404 for an unknown party', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent.get('/api/parties/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
  });
});

describe('PUT /api/parties/:id', () => {
  it('updates a party', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty({ name: 'Old Name', slug: 'old-slug' });

    const response = await agent.put(`/api/parties/${party.id}`).send({
      name: 'New Name',
      slug: 'new-slug',
      event_date: '2099-07-01',
      companion_field_visible: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('New Name');
    expect(response.body.slug).toBe('new-slug');
    expect(response.body.companion_field_visible).toBe(true);
    // Omitted labels keep their existing values instead of being wiped.
    expect(response.body.accept_label).toBe('Accept');
  });

  it('returns 404 for an unknown party', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent
      .put('/api/parties/00000000-0000-0000-0000-000000000000')
      .send({ name: 'Name', slug: 'slug', event_date: '2099-07-01' });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/parties/:id', () => {
  it('deletes a party', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();

    const response = await agent.delete(`/api/parties/${party.id}`);

    expect(response.status).toBe(204);

    const getResponse = await agent.get(`/api/parties/${party.id}`);
    expect(getResponse.status).toBe(404);
  });

  it('returns 404 for an unknown party', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent.delete('/api/parties/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
  });

  it('is blocked with 403 in demo mode', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    process.env.MODE = 'demo';

    const response = await agent.delete(`/api/parties/${party.id}`);

    expect(response.status).toBe(403);
  });
});
