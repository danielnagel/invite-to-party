import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.js';
import partiesRouter from './routes/parties.js';
import invitesRouter from './routes/invites.js';
import imagesRouter from './routes/images.js';

const app = express();

// Number of reverse-proxy hops in front of this service (0 = direct
// connection, no proxy). Controls how many trailing entries of
// X-Forwarded-For Express trusts when computing req.ip. Without this,
// req.ip is always the immediate TCP peer - i.e. the nearest proxy - so
// every real client behind the same proxy chain would share one bucket in
// publicRateLimiter (see middleware/rateLimit.js), and worse, one bad actor
// could lock out everyone else by exhausting it. Must match the exact
// number of trusted proxies in front of this deployment: setting it too
// high (or "true", trusting any X-Forwarded-For unconditionally) lets a
// client forge that header to get a fresh rate-limit bucket on every
// request, bypassing the limiter entirely.
app.set('trust proxy', Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '0', 10));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
// parties/invites/images all touch the /api/parties/* path space (nested
// image upload, nested invite CRUD), so each router declares its own full
// paths instead of being mounted under a single owned prefix.
app.use('/api', partiesRouter);
app.use('/api', invitesRouter);
app.use('/api', imagesRouter);

export default app;
