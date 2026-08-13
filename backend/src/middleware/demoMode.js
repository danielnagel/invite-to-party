// Blocks host-side mutations (party/invite/image CRUD) when MODE=demo, to
// protect a public demo from abuse. Applied per-route rather than to whole
// routers, since routes/invites.js also serves the public RSVP endpoint,
// which must stay open in demo mode (see routes/invites.js).
export function blockInDemoMode(req, res, next) {
  if (process.env.MODE === 'demo') {
    return res.status(403).json({ error: 'demo_mode_disabled' });
  }
  return next();
}
