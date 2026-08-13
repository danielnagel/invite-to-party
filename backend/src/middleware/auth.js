import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'session_expired' });
  }

  // A JWT stays valid for its full lifetime (12h) regardless of what happens
  // to the account it was issued for, so a deleted host could otherwise keep
  // using a still-valid cookie until it expires.
  const { rows } = await pool.query('SELECT id FROM hosts WHERE id = $1', [payload.sub]);
  if (rows.length === 0) {
    return res.status(401).json({ error: 'session_expired' });
  }

  // Not "req.host": Express already defines that as a read-only getter for
  // the Host header (req.hostname), so assigning to it throws.
  req.currentHost = { id: payload.sub, username: payload.username };
  return next();
}
