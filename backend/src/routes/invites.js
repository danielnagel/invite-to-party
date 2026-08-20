import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { blockInDemoMode } from '../middleware/demoMode.js';
import { publicRateLimiter } from '../middleware/rateLimit.js';
import { generateInviteCode } from '../lib/codes.js';

const router = Router();

const INVITE_COLUMNS = `id, party_id, invite_code, guest_name, greeting_text,
  status, created_at, updated_at, responded_at`;

const GUEST_COLUMNS = 'id, invite_id, name, status, responded_at, created_at, updated_at';

const MAX_CODE_ATTEMPTS = 5;

async function insertInvite(partyId, { guestName, greetingText }) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO invites (party_id, invite_code, guest_name, greeting_text)
         VALUES ($1, $2, $3, $4)
         RETURNING ${INVITE_COLUMNS}`,
        [partyId, generateInviteCode(), guestName, greetingText ?? null],
      );
      return rows[0];
    } catch (error) {
      // 23505 = unique_violation on invite_code - vanishingly unlikely with
      // an 8-character code, but retried instead of failing the request.
      if (error.code !== '23505' || attempt === MAX_CODE_ATTEMPTS - 1) throw error;
    }
  }
  return undefined;
}

// Extracts non-empty, trimmed names from whatever the client sent for
// additional_guests - either plain strings or {id, name} objects (the shape
// PUT round-trips so existing guests can be matched by id).
function sanitizeAdditionalGuests(additionalGuests) {
  if (!Array.isArray(additionalGuests)) return [];
  return additionalGuests
    .map((entry) => ({
      id: typeof entry === 'object' && entry !== null ? entry.id ?? null : null,
      name: String(typeof entry === 'object' && entry !== null ? entry.name ?? '' : entry).trim(),
    }))
    .filter((entry) => entry.name.length > 0);
}

async function insertAdditionalGuests(inviteId, names) {
  const guests = [];
  for (const name of names) {
    const { rows } = await pool.query(
      `INSERT INTO invite_guests (invite_id, name) VALUES ($1, $2) RETURNING ${GUEST_COLUMNS}`,
      [inviteId, name],
    );
    guests.push(rows[0]);
  }
  return guests;
}

// Reconciles an invite's invite_guests rows against the submitted list:
// updates names for entries with a matching id, inserts entries without one,
// and deletes existing rows whose id isn't present anymore - each guest's
// own status/responded_at is left untouched unless they're removed entirely.
async function syncAdditionalGuests(inviteId, additionalGuests) {
  const entries = sanitizeAdditionalGuests(additionalGuests);

  const { rows: existing } = await pool.query(
    'SELECT id FROM invite_guests WHERE invite_id = $1',
    [inviteId],
  );
  const existingIds = new Set(existing.map((row) => row.id));
  const keptIds = new Set(entries.filter((entry) => entry.id).map((entry) => entry.id));

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length > 0) {
    await pool.query('DELETE FROM invite_guests WHERE id = ANY($1)', [toDelete]);
  }

  for (const entry of entries) {
    if (entry.id && existingIds.has(entry.id)) {
      await pool.query(
        'UPDATE invite_guests SET name = $1, updated_at = now() WHERE id = $2',
        [entry.name, entry.id],
      );
    } else {
      await pool.query(
        'INSERT INTO invite_guests (invite_id, name) VALUES ($1, $2)',
        [inviteId, entry.name],
      );
    }
  }

  const { rows } = await pool.query(
    `SELECT ${GUEST_COLUMNS} FROM invite_guests WHERE invite_id = $1 ORDER BY created_at ASC`,
    [inviteId],
  );
  return rows;
}

// Batch-fetches invite_guests for many invites at once (host list view) and
// groups them by invite_id so each invite can get its own `guests` array
// without one query per invite.
async function fetchGuestsForInvites(inviteIds) {
  if (inviteIds.length === 0) return new Map();

  const { rows } = await pool.query(
    `SELECT ${GUEST_COLUMNS} FROM invite_guests WHERE invite_id = ANY($1) ORDER BY created_at ASC`,
    [inviteIds],
  );

  const byInvite = new Map();
  for (const row of rows) {
    if (!byInvite.has(row.invite_id)) byInvite.set(row.invite_id, []);
    byInvite.get(row.invite_id).push(row);
  }
  return byInvite;
}

// --- Host-protected, nested under a party --------------------------------

router.get('/parties/:id/invites', requireAuth, async (req, res) => {
  const partyExists = await pool.query('SELECT id FROM parties WHERE id = $1', [req.params.id]);
  if (partyExists.rows.length === 0) {
    return res.status(404).json({ error: 'party_not_found' });
  }

  const { rows } = await pool.query(
    `SELECT ${INVITE_COLUMNS} FROM invites WHERE party_id = $1 ORDER BY created_at DESC`,
    [req.params.id],
  );
  const guestsByInvite = await fetchGuestsForInvites(rows.map((row) => row.id));
  return res.status(200).json(rows.map((row) => ({ ...row, guests: guestsByInvite.get(row.id) ?? [] })));
});

router.post('/parties/:id/invites', requireAuth, blockInDemoMode, async (req, res) => {
  const {
    guest_name: guestName,
    greeting_text: greetingText,
    additional_guests: additionalGuests,
  } = req.body ?? {};

  if (!guestName || !String(guestName).trim()) {
    return res.status(400).json({ error: 'guest_name_required' });
  }

  const partyExists = await pool.query('SELECT id FROM parties WHERE id = $1', [req.params.id]);
  if (partyExists.rows.length === 0) {
    return res.status(404).json({ error: 'party_not_found' });
  }

  const invite = await insertInvite(req.params.id, { guestName, greetingText });
  const guests = await insertAdditionalGuests(
    invite.id,
    sanitizeAdditionalGuests(additionalGuests).map((entry) => entry.name),
  );
  return res.status(201).json({ ...invite, guests });
});

router.put('/invites/:id', requireAuth, blockInDemoMode, async (req, res) => {
  const {
    guest_name: guestName,
    greeting_text: greetingText,
    additional_guests: additionalGuests,
  } = req.body ?? {};

  if (!guestName || !String(guestName).trim()) {
    return res.status(400).json({ error: 'guest_name_required' });
  }

  const { rows } = await pool.query(
    `UPDATE invites
     SET guest_name = $1, greeting_text = $2, updated_at = now()
     WHERE id = $3
     RETURNING ${INVITE_COLUMNS}`,
    [guestName, greetingText ?? null, req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'invite_not_found' });
  }

  const guests = await syncAdditionalGuests(req.params.id, additionalGuests);
  return res.status(200).json({ ...rows[0], guests });
});

router.delete('/invites/:id', requireAuth, blockInDemoMode, async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM invites WHERE id = $1', [req.params.id]);

  if (rowCount === 0) {
    return res.status(404).json({ error: 'invite_not_found' });
  }

  return res.status(204).send();
});

// --- Public, guest-facing -------------------------------------------------

router.get('/invites/lookup', publicRateLimiter, async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'code_required' });
  }

  const { rows } = await pool.query(
    `SELECT i.id, i.invite_code, i.guest_name, i.greeting_text, i.status,
            p.id AS party_id, p.name AS party_name, p.slug AS party_slug,
            p.event_date, p.accept_label, p.decline_label,
            (p.event_date < CURRENT_DATE) AS expired
     FROM invites i
     JOIN parties p ON p.id = i.party_id
     WHERE i.invite_code = $1`,
    [String(code).toUpperCase()],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'invite_not_found' });
  }

  const row = rows[0];
  const guestsByInvite = await fetchGuestsForInvites([row.id]);
  return res.status(200).json({
    invite_code: row.invite_code,
    guest_name: row.guest_name,
    greeting_text: row.greeting_text,
    status: row.status,
    expired: row.expired,
    guests: (guestsByInvite.get(row.id) ?? []).map((guest) => ({
      id: guest.id,
      name: guest.name,
      status: guest.status,
    })),
    party: {
      id: row.party_id,
      name: row.party_name,
      slug: row.party_slug,
      event_date: row.event_date,
      accept_label: row.accept_label,
      decline_label: row.decline_label,
    },
  });
});

router.post('/invites/:code/rsvp', publicRateLimiter, async (req, res) => {
  const { status } = req.body ?? {};

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'invalid_status' });
  }

  const { rows } = await pool.query(
    `SELECT i.id, p.event_date < CURRENT_DATE AS expired
     FROM invites i
     JOIN parties p ON p.id = i.party_id
     WHERE i.invite_code = $1`,
    [req.params.code.toUpperCase()],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'invite_not_found' });
  }

  if (rows[0].expired) {
    return res.status(410).json({ error: 'expired' });
  }

  const { rows: updated } = await pool.query(
    `UPDATE invites
     SET status = $1, responded_at = now(), updated_at = now()
     WHERE id = $2
     RETURNING ${INVITE_COLUMNS}`,
    [status, rows[0].id],
  );

  return res.status(200).json(updated[0]);
});

// RSVP for one of an invite's additional named guests (see the primary
// guest's POST /invites/:code/rsvp above - this is the same idea, scoped to
// one row in invite_guests instead of the invite itself).
router.post('/invites/:code/guests/:guestId/rsvp', publicRateLimiter, async (req, res) => {
  const { status } = req.body ?? {};

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'invalid_status' });
  }

  const { rows } = await pool.query(
    `SELECT g.id, p.event_date < CURRENT_DATE AS expired
     FROM invite_guests g
     JOIN invites i ON i.id = g.invite_id
     JOIN parties p ON p.id = i.party_id
     WHERE i.invite_code = $1 AND g.id = $2`,
    [req.params.code.toUpperCase(), req.params.guestId],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'guest_not_found' });
  }

  if (rows[0].expired) {
    return res.status(410).json({ error: 'expired' });
  }

  const { rows: updated } = await pool.query(
    `UPDATE invite_guests
     SET status = $1, responded_at = now(), updated_at = now()
     WHERE id = $2
     RETURNING ${GUEST_COLUMNS}`,
    [status, rows[0].id],
  );

  return res.status(200).json(updated[0]);
});

export default router;
