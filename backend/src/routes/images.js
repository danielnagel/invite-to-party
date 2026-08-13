import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { UPLOADS_ROOT, contentTypeForPath } from '../lib/uploads.js';

const router = Router();

// Images aren't sensitive and their ids are UUIDs, so this is public - no
// auth needed to render a party's background or gallery thumbnails.
router.get('/images/:id/file', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT storage_path FROM party_images WHERE id = $1',
    [req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'image_not_found' });
  }

  const filePath = path.join(UPLOADS_ROOT, rows[0].storage_path);
  res.set('Content-Type', contentTypeForPath(rows[0].storage_path));
  return fs.createReadStream(filePath).on('error', () => {
    res.status(404).json({ error: 'image_not_found' });
  }).pipe(res);
});

router.get('/parties/:id/random-background', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id FROM party_images WHERE party_id = $1 ORDER BY random() LIMIT 1',
    [req.params.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'no_images' });
  }

  return res.status(200).json({ id: rows[0].id, url: `/api/images/${rows[0].id}/file` });
});

// Host-dashboard equivalent: a random background across all parties, since
// there is no per-host ownership of parties (any host manages any party).
router.get('/images/random-background', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id FROM party_images ORDER BY random() LIMIT 1',
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'no_images' });
  }

  return res.status(200).json({ id: rows[0].id, url: `/api/images/${rows[0].id}/file` });
});

export default router;
