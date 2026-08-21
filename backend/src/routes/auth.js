import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { publicRateLimiter } from '../middleware/rateLimit.js';
import { isDemoMode } from '../middleware/demoMode.js';

const router = Router();

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '12h';
const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = await bcrypt.hash(
  'dummy-password-for-timing-parity',
  BCRYPT_ROUNDS,
);

router.post('/login', publicRateLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const { rows } = await pool.query(
    'SELECT id, username, password_hash FROM hosts WHERE username = $1',
    [username],
  );

  const host = rows[0] ?? null;
  const passwordMatches = await bcrypt.compare(
    password,
    host?.password_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (!host || !passwordMatches) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  await pool.query('UPDATE hosts SET last_login_at = now() WHERE id = $1', [host.id]);

  const token = jwt.sign(
    { sub: host.id, username: host.username },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  });

  return res.status(200).json({ username: host.username, demoMode: isDemoMode() });
});

router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({
    id: req.currentHost.id,
    username: req.currentHost.username,
    demoMode: isDemoMode(),
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  return res.status(200).json({ success: true });
});

export default router;
