import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { blockInDemoMode } from '../middleware/demoMode.js';
import { upload, UPLOADS_ROOT, relativeStoragePath, deleteStoredFile } from '../lib/uploads.js';

const router = Router();

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PARTY_COLUMNS = `id, name, slug, event_date, accept_label, decline_label,
  companion_field_label, companion_field_visible, created_at, updated_at`;

// Mirrors the column defaults in migrations/*_create-parties.js. Applied in
// JS (rather than relying on the DB's DEFAULT) because "DEFAULT" is only
// valid as a literal in an INSERT VALUES list, not as a COALESCE argument.
const DEFAULT_ACCEPT_LABEL = 'Accept';
const DEFAULT_DECLINE_LABEL = 'Decline';
const DEFAULT_COMPANION_FIELD_LABEL = 'Bringing a companion?';
const DEFAULT_COMPANION_FIELD_VISIBLE = false;

function isValidPartyInput({ name, slug, event_date: eventDate }) {
  if (!name || !String(name).trim()) return false;
  if (!slug || !SLUG_PATTERN.test(slug)) return false;
  if (!eventDate || !DATE_PATTERN.test(eventDate) || Number.isNaN(Date.parse(eventDate))) {
    return false;
  }
  return true;
}

// Every route in this file is host-only - guests never touch /api/parties.
// requireAuth is listed per-route (not a blanket router.use(requireAuth))
// because this router is mounted at the generic "/api" prefix alongside
// invites.js/images.js, which serve public routes under the same
// "/parties/*" path space (e.g. GET /parties/:id/random-background lives in
// images.js). A prefix-based router.use() can't distinguish those from this
// file's own routes and would intercept them too.
router.get('/parties', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${PARTY_COLUMNS} FROM parties ORDER BY event_date DESC`,
  );
  return res.status(200).json(rows);
});

router.get('/parties/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${PARTY_COLUMNS} FROM parties WHERE id = $1`,
    [req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'party_not_found' });
  }

  return res.status(200).json(rows[0]);
});

// Lets a host see the guest-facing RSVP page without needing a real invite
// code. Returns the same shape as GET /invites/lookup, standing in a
// placeholder guest name since previews aren't tied to any actual invite.
router.get('/parties/:id/preview', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${PARTY_COLUMNS}, (event_date < CURRENT_DATE) AS expired FROM parties WHERE id = $1`,
    [req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'party_not_found' });
  }

  const party = rows[0];
  return res.status(200).json({
    guest_name: 'Guest Name',
    greeting_text: null,
    allow_companion: true,
    status: 'pending',
    companion_response: null,
    expired: party.expired,
    guests: [],
    party: {
      id: party.id,
      name: party.name,
      slug: party.slug,
      event_date: party.event_date,
      accept_label: party.accept_label,
      decline_label: party.decline_label,
      companion_field_label: party.companion_field_label,
      companion_field_visible: party.companion_field_visible,
    },
  });
});

router.post('/parties', requireAuth, blockInDemoMode, async (req, res) => {
  const body = req.body ?? {};

  if (!isValidPartyInput(body)) {
    return res.status(400).json({ error: 'invalid_party' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO parties (name, slug, event_date, accept_label, decline_label,
                             companion_field_label, companion_field_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${PARTY_COLUMNS}`,
      [
        body.name,
        body.slug,
        body.event_date,
        body.accept_label ?? DEFAULT_ACCEPT_LABEL,
        body.decline_label ?? DEFAULT_DECLINE_LABEL,
        body.companion_field_label ?? DEFAULT_COMPANION_FIELD_LABEL,
        body.companion_field_visible ?? DEFAULT_COMPANION_FIELD_VISIBLE,
      ],
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'slug_taken' });
    }
    throw error;
  }
});

router.put('/parties/:id', requireAuth, blockInDemoMode, async (req, res) => {
  const body = req.body ?? {};

  if (!isValidPartyInput(body)) {
    return res.status(400).json({ error: 'invalid_party' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE parties
       SET name = $1,
           slug = $2,
           event_date = $3,
           accept_label = COALESCE($4, accept_label),
           decline_label = COALESCE($5, decline_label),
           companion_field_label = COALESCE($6, companion_field_label),
           companion_field_visible = COALESCE($7, companion_field_visible),
           updated_at = now()
       WHERE id = $8
       RETURNING ${PARTY_COLUMNS}`,
      [
        body.name,
        body.slug,
        body.event_date,
        body.accept_label ?? null,
        body.decline_label ?? null,
        body.companion_field_label ?? null,
        body.companion_field_visible ?? null,
        req.params.id,
      ],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'party_not_found' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'slug_taken' });
    }
    throw error;
  }
});

router.delete('/parties/:id', requireAuth, blockInDemoMode, async (req, res) => {
  // Uploaded files aren't referenced from any other party, so they can be
  // removed straight away - the DB row goes via ON DELETE CASCADE.
  const { rows } = await pool.query(
    'SELECT storage_path FROM party_images WHERE party_id = $1',
    [req.params.id],
  );

  const { rowCount } = await pool.query('DELETE FROM parties WHERE id = $1', [req.params.id]);

  if (rowCount === 0) {
    return res.status(404).json({ error: 'party_not_found' });
  }

  for (const row of rows) {
    deleteStoredFile(row.storage_path);
  }
  fs.rm(path.join(UPLOADS_ROOT, 'parties', req.params.id), { recursive: true, force: true }, () => {});

  return res.status(204).send();
});

router.get('/parties/:id/images', requireAuth, async (req, res) => {
  const partyExists = await pool.query('SELECT id FROM parties WHERE id = $1', [req.params.id]);
  if (partyExists.rows.length === 0) {
    return res.status(404).json({ error: 'party_not_found' });
  }

  const { rows } = await pool.query(
    `SELECT id, party_id, filename, storage_path, uploaded_at
     FROM party_images WHERE party_id = $1 ORDER BY uploaded_at DESC`,
    [req.params.id],
  );
  return res.status(200).json(rows);
});

router.post('/parties/:id/images', requireAuth, blockInDemoMode, async (req, res) => {
  const partyExists = await pool.query('SELECT id FROM parties WHERE id = $1', [req.params.id]);
  if (partyExists.rows.length === 0) {
    return res.status(404).json({ error: 'party_not_found' });
  }

  // Invoked manually (rather than as a normal middleware in the route
  // signature) so its callback-style error (wrong mimetype, too large) can
  // be turned into a plain 400 instead of falling through to Express's
  // default error handler.
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'invalid_image' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'image_required' });
    }

    const storagePath = relativeStoragePath(req.params.id, req.file.filename);

    const { rows } = await pool.query(
      `INSERT INTO party_images (party_id, filename, storage_path)
       VALUES ($1, $2, $3)
       RETURNING id, party_id, filename, storage_path, uploaded_at`,
      [req.params.id, req.file.originalname, storagePath],
    );

    return res.status(201).json(rows[0]);
  });
});

router.delete('/parties/:id/images/:imageId', requireAuth, blockInDemoMode, async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM party_images WHERE id = $1 AND party_id = $2 RETURNING storage_path',
    [req.params.imageId, req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'image_not_found' });
  }

  deleteStoredFile(rows[0].storage_path);

  return res.status(204).send();
});

export default router;
