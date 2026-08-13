import rateLimit from 'express-rate-limit';

// Shared limiter for every brute-force-relevant public endpoint: host login
// and the guest-facing invite lookup/RSVP endpoints (an invite code is a
// guest's only credential, so it must be resistant to brute-forcing just
// like a password). One shared instance on purpose: separate per-route
// counters would let an attacker collect 10 attempts per endpoint instead of
// 10 in total.
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
  // Vitest sets NODE_ENV=test by default (like Jest/Vite), and route tests
  // call these endpoints more than 10 times per test file, so without this
  // skip they would immediately fail with 429.
  skip: () => process.env.NODE_ENV === 'test',
});
