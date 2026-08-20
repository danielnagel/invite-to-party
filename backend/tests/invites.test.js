import { beforeEach, afterAll, afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { resetDb, closeDb, insertParty, insertInvite, insertInviteGuest } from './helpers/db.js';
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

describe('POST /api/parties/:id/invites', () => {
  it('creates an invite with a generated invite_code', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();

    const response = await agent
      .post(`/api/parties/${party.id}/invites`)
      .send({ guest_name: 'Alice Anderson', greeting_text: 'Welcome!' });

    expect(response.status).toBe(201);
    expect(response.body.guest_name).toBe('Alice Anderson');
    expect(response.body.status).toBe('pending');
    expect(response.body.invite_code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it('creates additional named guests alongside the primary guest', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();

    const response = await agent
      .post(`/api/parties/${party.id}/invites`)
      .send({ guest_name: 'Alice', additional_guests: ['Bob', '  Carol  ', ''] });

    expect(response.status).toBe(201);
    expect(response.body.guests).toHaveLength(2);
    expect(response.body.guests.map((g) => g.name)).toEqual(['Bob', 'Carol']);
    expect(response.body.guests.every((g) => g.status === 'pending')).toBe(true);
  });

  it('rejects a missing guest_name', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();

    const response = await agent.post(`/api/parties/${party.id}/invites`).send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('guest_name_required');
  });

  it('returns 404 for an unknown party', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent
      .post('/api/parties/00000000-0000-0000-0000-000000000000/invites')
      .send({ guest_name: 'Alice' });

    expect(response.status).toBe(404);
  });

  it('is blocked with 403 in demo mode', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    process.env.MODE = 'demo';

    const response = await agent
      .post(`/api/parties/${party.id}/invites`)
      .send({ guest_name: 'Alice' });

    expect(response.status).toBe(403);
  });
});

describe('GET /api/parties/:id/invites', () => {
  it('lists invites for a party', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    await insertInvite({ partyId: party.id, guest_name: 'Alice' });
    await insertInvite({ partyId: party.id, guest_name: 'Bob' });

    const response = await agent.get(`/api/parties/${party.id}/invites`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('includes each invite\'s additional guests', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    const invite = await insertInvite({ partyId: party.id, guest_name: 'Alice' });
    await insertInviteGuest({ inviteId: invite.id, name: 'Bob', status: 'accepted' });

    const response = await agent.get(`/api/parties/${party.id}/invites`);

    expect(response.status).toBe(200);
    const found = response.body.find((i) => i.id === invite.id);
    expect(found.guests).toEqual([
      expect.objectContaining({ name: 'Bob', status: 'accepted' }),
    ]);
  });
});

describe('PUT /api/invites/:id', () => {
  it('updates guest_name and greeting_text', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    const invite = await insertInvite({ partyId: party.id, guest_name: 'Alice' });

    const response = await agent.put(`/api/invites/${invite.id}`).send({
      guest_name: 'Alice Updated',
      greeting_text: 'New greeting',
    });

    expect(response.status).toBe(200);
    expect(response.body.guest_name).toBe('Alice Updated');
    expect(response.body.greeting_text).toBe('New greeting');
  });

  it('returns 404 for an unknown invite', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent
      .put('/api/invites/00000000-0000-0000-0000-000000000000')
      .send({ guest_name: 'Someone' });

    expect(response.status).toBe(404);
  });

  it('is blocked with 403 in demo mode', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    const invite = await insertInvite({ partyId: party.id });
    process.env.MODE = 'demo';

    const response = await agent
      .put(`/api/invites/${invite.id}`)
      .send({ guest_name: 'Someone' });

    expect(response.status).toBe(403);
  });

  it('syncs additional_guests: renames by id, adds new, drops missing, keeps status', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    const invite = await insertInvite({ partyId: party.id, guest_name: 'Alice' });
    const bob = await insertInviteGuest({ inviteId: invite.id, name: 'Bob', status: 'accepted' });
    const carol = await insertInviteGuest({ inviteId: invite.id, name: 'Carol' });

    const response = await agent.put(`/api/invites/${invite.id}`).send({
      guest_name: 'Alice',
      // Bob renamed (keeps his accepted status), Carol dropped, Dave added.
      additional_guests: [{ id: bob.id, name: 'Bobby' }, { name: 'Dave' }],
    });

    expect(response.status).toBe(200);
    expect(response.body.guests).toHaveLength(2);
    const bobby = response.body.guests.find((g) => g.id === bob.id);
    expect(bobby).toMatchObject({ name: 'Bobby', status: 'accepted' });
    expect(response.body.guests.some((g) => g.name === 'Dave')).toBe(true);
    expect(response.body.guests.some((g) => g.id === carol.id)).toBe(false);
  });
});

describe('DELETE /api/invites/:id', () => {
  it('deletes an invite', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    const invite = await insertInvite({ partyId: party.id });

    const response = await agent.delete(`/api/invites/${invite.id}`);

    expect(response.status).toBe(204);
  });

  it('returns 404 for an unknown invite', async () => {
    const { agent } = await createAndLoginHost();

    const response = await agent.delete('/api/invites/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
  });

  it('cascades to the invite\'s additional guests', async () => {
    const { agent } = await createAndLoginHost();
    const party = await insertParty();
    const invite = await insertInvite({ partyId: party.id });
    await insertInviteGuest({ inviteId: invite.id });

    const response = await agent.delete(`/api/invites/${invite.id}`);

    expect(response.status).toBe(204);
    const list = await agent.get(`/api/parties/${party.id}/invites`);
    expect(list.body).toHaveLength(0);
  });
});

describe('GET /api/invites/lookup (public)', () => {
  it('resolves an invite by code without needing auth', async () => {
    const party = await insertParty({
      name: 'Summer Party',
      slug: 'summer-party-lookup',
    });
    const invite = await insertInvite({
      partyId: party.id,
      invite_code: 'ABCD1234',
      guest_name: 'Alice Anderson',
      greeting_text: 'Welcome!',
    });

    const response = await request(app).get('/api/invites/lookup').query({ code: invite.invite_code });

    expect(response.status).toBe(200);
    expect(response.body.guest_name).toBe('Alice Anderson');
    expect(response.body.expired).toBe(false);
    expect(response.body.party.slug).toBe('summer-party-lookup');
  });

  it('includes additional guests', async () => {
    const party = await insertParty({ slug: 'group-lookup' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'GRUP1234', guest_name: 'Alice' });
    await insertInviteGuest({ inviteId: invite.id, name: 'Bob' });

    const response = await request(app).get('/api/invites/lookup').query({ code: invite.invite_code });

    expect(response.status).toBe(200);
    expect(response.body.guests).toEqual([
      expect.objectContaining({ name: 'Bob', status: 'pending' }),
    ]);
  });

  it('is case-insensitive', async () => {
    const party = await insertParty({ slug: 'case-party' });
    await insertInvite({ partyId: party.id, invite_code: 'ABCD1234' });

    const response = await request(app).get('/api/invites/lookup').query({ code: 'abcd1234' });

    expect(response.status).toBe(200);
  });

  it('marks an invite for a past party as expired', async () => {
    const party = await insertParty({ slug: 'past-party', event_date: '2000-01-01' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'PAST1234' });

    const response = await request(app).get('/api/invites/lookup').query({ code: invite.invite_code });

    expect(response.status).toBe(200);
    expect(response.body.expired).toBe(true);
  });

  it('returns 404 for an unknown code', async () => {
    const response = await request(app).get('/api/invites/lookup').query({ code: 'NOPE0000' });

    expect(response.status).toBe(404);
  });

  it('returns 400 when code is missing', async () => {
    const response = await request(app).get('/api/invites/lookup');

    expect(response.status).toBe(400);
  });
});

describe('POST /api/invites/:code/rsvp (public)', () => {
  it('accepts an invite', async () => {
    const party = await insertParty({ slug: 'rsvp-party' });
    const invite = await insertInvite({
      partyId: party.id,
      invite_code: 'RSVP1234',
    });

    const response = await request(app)
      .post(`/api/invites/${invite.invite_code}/rsvp`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('accepted');
    expect(response.body.responded_at).toBeTruthy();
  });

  it('can be resubmitted, switching from accepted to declined', async () => {
    const party = await insertParty({ slug: 'resubmit-party' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'FLIP1234' });

    await request(app)
      .post(`/api/invites/${invite.invite_code}/rsvp`)
      .send({ status: 'accepted' });

    const response = await request(app)
      .post(`/api/invites/${invite.invite_code}/rsvp`)
      .send({ status: 'declined' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('declined');
  });

  it('rejects an invalid status', async () => {
    const party = await insertParty({ slug: 'invalid-status-party' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'BAD01234' });

    const response = await request(app)
      .post(`/api/invites/${invite.invite_code}/rsvp`)
      .send({ status: 'maybe' });

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown code', async () => {
    const response = await request(app)
      .post('/api/invites/UNKNOWN1/rsvp')
      .send({ status: 'accepted' });

    expect(response.status).toBe(404);
  });

  it('rejects a response once the party has expired', async () => {
    const party = await insertParty({ slug: 'expired-party', event_date: '2000-01-01' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'OLD01234' });

    const response = await request(app)
      .post(`/api/invites/${invite.invite_code}/rsvp`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(410);
    expect(response.body.error).toBe('expired');
  });

  it('stays open in demo mode', async () => {
    const party = await insertParty({ slug: 'demo-rsvp-party' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'DEMO1234' });
    process.env.MODE = 'demo';

    const response = await request(app)
      .post(`/api/invites/${invite.invite_code}/rsvp`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(200);
  });
});

describe('POST /api/invites/:code/guests/:guestId/rsvp (public)', () => {
  it('records a response for one additional guest, independent of the primary guest', async () => {
    const party = await insertParty({ slug: 'group-rsvp-party' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'GRSV1234' });
    const bob = await insertInviteGuest({ inviteId: invite.id, name: 'Bob' });

    const response = await request(app)
      .post(`/api/invites/${invite.invite_code}/guests/${bob.id}/rsvp`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('accepted');
    expect(response.body.responded_at).toBeTruthy();

    const lookup = await request(app).get('/api/invites/lookup').query({ code: invite.invite_code });
    expect(lookup.body.status).toBe('pending');
    expect(lookup.body.guests[0].status).toBe('accepted');
  });

  it('rejects an invalid status', async () => {
    const party = await insertParty({ slug: 'group-rsvp-invalid' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'GBAD1234' });
    const bob = await insertInviteGuest({ inviteId: invite.id });

    const response = await request(app)
      .post(`/api/invites/${invite.invite_code}/guests/${bob.id}/rsvp`)
      .send({ status: 'maybe' });

    expect(response.status).toBe(400);
  });

  it('returns 404 when the guest does not belong to the invite code', async () => {
    const party = await insertParty({ slug: 'group-rsvp-mismatch' });
    const inviteA = await insertInvite({ partyId: party.id, invite_code: 'AAAA1111' });
    const inviteB = await insertInvite({ partyId: party.id, invite_code: 'BBBB2222' });
    const guestOfB = await insertInviteGuest({ inviteId: inviteB.id });

    const response = await request(app)
      .post(`/api/invites/${inviteA.invite_code}/guests/${guestOfB.id}/rsvp`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(404);
  });

  it('rejects a response once the party has expired', async () => {
    const party = await insertParty({ slug: 'group-rsvp-expired', event_date: '2000-01-01' });
    const invite = await insertInvite({ partyId: party.id, invite_code: 'GOLD1234' });
    const bob = await insertInviteGuest({ inviteId: invite.id });

    const response = await request(app)
      .post(`/api/invites/${invite.invite_code}/guests/${bob.id}/rsvp`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(410);
    expect(response.body.error).toBe('expired');
  });
});
