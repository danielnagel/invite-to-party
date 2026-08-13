import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { blockInDemoMode } from '../middleware/demoMode.js';
import { publicRateLimiter } from '../middleware/rateLimit.js';
import { generateInviteCode } from '../lib/codes.js';

const router = Router();

const INVITE_COLUMNS = `id, party_id, invite_code, guest_name, greeting_text,
  allow_companion, status, companion_response, created_at, updated_at, responded_at`;

const MAX_CODE_ATTEMPTS = 5;

async function insertInvite(partyId, { guestName, greetingText, allowCompanion }) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO invites (party_id, invite_code, guest_name, greeting_text, allow_companion)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${INVITE_COLUMNS}`,
        [partyId, generateInviteCode(), guestName, greetingText ?? null, Boolean(allowCompanion)],
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
  return res.status(200).json(rows);
});

router.post('/parties/:id/invites', requireAuth, blockInDemoMode, async (req, res) => {
  const { guest_name: guestName, greeting_text: greetingText, allow_companion: allowCompanion } =
    req.body ?? {};

  if (!guestName || !String(guestName).trim()) {
    return res.status(400).json({ error: 'guest_name_required' });
  }

  const partyExists = await pool.query('SELECT id FROM parties WHERE id = $1', [req.params.id]);
  if (partyExists.rows.length === 0) {
    return res.status(404).json({ error: 'party_not_found' });
  }

  const invite = await insertInvite(req.params.id, { guestName, greetingText, allowCompanion });
  return res.status(201).json(invite);
});

router.put('/invites/:id', requireAuth, blockInDemoMode, async (req, res) => {
  const { guest_name: guestName, greeting_text: greetingText, allow_companion: allowCompanion } =
    req.body ?? {};

  if (!guestName || !String(guestName).trim()) {
    return res.status(400).json({ error: 'guest_name_required' });
  }

  const { rows } = await pool.query(
    `UPDATE invites
     SET guest_name = $1, greeting_text = $2, allow_companion = $3, updated_at = now()
     WHERE id = $4
     RETURNING ${INVITE_COLUMNS}`,
    [guestName, greetingText ?? null, Boolean(allowCompanion), req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'invite_not_found' });
  }

  return res.status(200).json(rows[0]);
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
    `SELECT i.invite_code, i.guest_name, i.greeting_text, i.allow_companion, i.status,
            i.companion_response,
            p.id AS party_id, p.name AS party_name, p.slug AS party_slug,
            p.event_date, p.accept_label, p.decline_label,
            p.companion_field_label, p.companion_field_visible,
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
  return res.status(200).json({
    invite_code: row.invite_code,
    guest_name: row.guest_name,
    greeting_text: row.greeting_text,
    allow_companion: row.allow_companion,
    status: row.status,
    companion_response: row.companion_response,
    expired: row.expired,
    party: {
      id: row.party_id,
      name: row.party_name,
      slug: row.party_slug,
      event_date: row.event_date,
      accept_label: row.accept_label,
      decline_label: row.decline_label,
      companion_field_label: row.companion_field_label,
      companion_field_visible: row.companion_field_visible,
    },
  });
});

router.post('/invites/:code/rsvp', publicRateLimiter, async (req, res) => {
  const { status, companion } = req.body ?? {};

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
     SET status = $1, companion_response = $2, responded_at = now(), updated_at = now()
     WHERE id = $3
     RETURNING ${INVITE_COLUMNS}`,
    [status, companion ?? null, rows[0].id],
  );

  return res.status(200).json(updated[0]);
});

export default router;
