# Backend

Express API under `/api`, PostgreSQL via `pg` + `node-pg-migrate`. Auth is
handled via a JWT set as an httpOnly, `SameSite=Strict` cookie (no
`localStorage`). There is only one kind of account - a **host** - created
via CLI only; guests have no account and authenticate purely via their
invite code.

## Dev commands

```bash
npm run dev --workspace=backend    # nodemon src/server.js, hot reload
npm run start --workspace=backend  # node src/server.js (without hot reload)
npm test --workspace=backend       # Vitest + Supertest (runs migrations beforehand via "pretest")
```

**Tests need their own, isolated database** – `tests/helpers/db.js` truncates
all tables before every test (`TRUNCATE ... RESTART IDENTITY CASCADE`). Two
safeguards protect against this hitting a real database:

1. `npm test`/`npm run pretest` run via `scripts/run-with-test-db.js`, which
   forces `DATABASE_URL` to `TEST_DATABASE_URL` (from `.env`).
2. `resetDb()` additionally checks the actual database name and aborts with
   an error if it doesn't contain `"test"` – regardless of how
   `DATABASE_URL` was set.

Before the first local test run, start the isolated test DB once (separate
Postgres container, own port, no persistent volume – see
`docker-compose.yml`, service `db-test`):

```bash
docker compose --profile test up -d db-test
```

`.env.example` contains the corresponding `TEST_POSTGRES_*`/
`TEST_DATABASE_URL` variables with working defaults for port `5433`.

## Environment variables

Read from `.env` (see `.env.example` at the repo root; loaded locally via
`dotenv`, see `src/db/pool.js`/`src/server.js`):

- `DATABASE_URL` – full Postgres connection string. If set, it takes
  precedence over the individual `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/
  `PGDATABASE` variables (fallback for local operation without Docker).
- `JWT_SECRET` – secret for signing/verifying the auth cookie.
- `PORT` – port the Express app listens on (default `3000`).
- `NODE_ENV` – set to `production` so the auth cookie is additionally
  `Secure` (requires TLS termination in front of it).
- `TRUST_PROXY_HOPS` – number of reverse proxy hops in front of this service
  (default `0` = direct connection, no proxy). Must exactly match the real
  hop count of the given environment, see the comment in `src/app.js`
  (set incorrectly, it either breaks `publicRateLimiter`'s per-IP counting
  or – if too generous – can be bypassed via a spoofed `X-Forwarded-For`).
  The root `docker-compose.yml` already sets this to `1` (one `frontend`
  nginx hop).
- `UPLOADS_DIR` – directory uploaded party images are stored under (default
  `/app/uploads`, matching the `uploads-data` volume mount in
  `docker-compose.yml`). Tests override this to a disposable temp directory
  (see `tests/setup.js`).
- `MODE` – set to `demo` to block host-side mutation routes (`403`) and seed
  demo data on container start (see "Demo mode" below).

## Migrations

```bash
npm run migrate --workspace=backend        # apply all pending migrations
npm run migrate:down --workspace=backend   # roll back the last migration
```

Migrations live under `migrations/` (`node-pg-migrate`) and create the
`hosts`, `parties`, `party_images` and `invites` tables. In the Docker
Compose stack they run automatically on `backend` container startup (see
`Dockerfile`); in CI via `pretest` before the backend tests.

## API endpoints

Endpoints under `requireAuth` (middleware `src/middleware/auth.js`) need the
host auth cookie; without a valid cookie they respond `401`. For every such
request, `requireAuth` also checks whether the host (`sub` claim) still
exists – a deleted host is thus locked out immediately instead of retaining
access until the token expires (12h).

### Auth (`/api/auth`)

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | `{ username, password }` | Checks credentials, sets the JWT auth cookie on success (valid for 12h). Rate-limited. |
| `GET` | `/api/auth/me` | – | Returns `{ id, username }` of the logged-in host, otherwise `401`. |
| `POST` | `/api/auth/logout` | – | Clears the auth cookie. |

### Parties (`/api/parties`, host-only unless noted)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/parties` | List all parties. |
| `POST` | `/api/parties` | Create a party. Required: `name`, `slug` (lowercase, `a-z0-9-`, unique), `event_date` (`YYYY-MM-DD`, doubles as the invite expiry). Optional: `accept_label`, `decline_label`, `companion_field_label`, `companion_field_visible` (default `Accept`/`Decline`/`"Bringing a companion?"`/`false`). |
| `GET` | `/api/parties/:id` | Load a single party. |
| `PUT` | `/api/parties/:id` | Update a party (same required fields as create; omitted optional labels keep their current value). |
| `DELETE` | `/api/parties/:id` | Delete a party (cascades to its images/invites; uploaded files are removed from disk too). |
| `GET` | `/api/parties/:id/images` | List uploaded images for a party. |
| `POST` | `/api/parties/:id/images` | Upload an image (multipart field `image`; `image/jpeg`, `image/png`, `image/webp`, `image/gif`; max 8 MB). Stored at `UPLOADS_DIR/parties/<id>/<uuid>.<ext>`. |
| `DELETE` | `/api/parties/:id/images/:imageId` | Delete an uploaded image (DB row + file on disk). |

### Invites (`src/routes/invites.js`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/parties/:id/invites` | host | List invites for a party. |
| `POST` | `/api/parties/:id/invites` | host | Create an invite. Required: `guest_name`. Optional: `greeting_text`, `allow_companion`. Generates a unique 8-character `invite_code`. |
| `PUT` | `/api/invites/:id` | host | Update `guest_name`/`greeting_text`/`allow_companion` (not the RSVP status - that's guest-only). |
| `DELETE` | `/api/invites/:id` | host | Delete an invite. |
| `GET` | `/api/invites/lookup?code=` | public, rate-limited | Resolves an invite by code (case-insensitive). Returns guest name/greeting/status plus the party's RSVP labels and companion visibility, and an `expired` flag (`event_date < today`). `404` if the code doesn't exist. |
| `POST` | `/api/invites/:code/rsvp` | public, rate-limited | Body `{ status: "accepted"|"declined", companion }`. Resubmittable any number of times until the party expires; `410` once expired. Stays open in demo mode. |

### Images (`/api/images`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/images/:id/file` | public | Streams the stored image bytes (images aren't sensitive; ids are UUIDs). |
| `GET` | `/api/parties/:id/random-background` | public | Picks one random image from that party, for the guest RSVP page background. `404` (`no_images`) if the party has none. |
| `GET` | `/api/images/random-background` | host | Picks one random image across all parties, for the host dashboard background. |

## Host management

There is **no open self-registration** - a host can only be created via
CLI. These commands connect to the database via the same `DATABASE_URL` as
the API and are intended to run **inside the running backend container**:

```bash
docker compose exec backend npm run host:create -- <username> <password>
docker compose exec backend npm run host:list
```

(Prerequisite: the `backend` service is running, e.g. via
`docker compose up -d backend db`.)

There is no separate invite CLI - invites are created and managed only
through the host UI/API (`/api/parties/:id/invites`, `/api/invites/:id`).

### Demo mode (`MODE=demo`)

```bash
docker compose exec backend npm run seed:demo
```

Seeds one demo host (`demo`/`demo`), two demo parties (one upcoming, one
past/expired) with bundled placeholder images, and several invites in
varying RSVP states. Auto-run from the `Dockerfile` `CMD` when `MODE=demo`.
With `MODE=demo` set, all host-side mutation routes (party/invite/image
CRUD) respond `403`; the public RSVP endpoint (`POST /api/invites/:code/rsvp`)
stays open.
