import pool from '../../src/db/pool.js';

/**
 * Wipes all application tables so each test starts from a clean, known state.
 * Uses the real pool the app itself uses - no mocking.
 *
 * Refuses to run against anything whose database name doesn't look like a
 * disposable test database: this truncates every table, and a misconfigured
 * DATABASE_URL (e.g. accidentally pointing at the dev or a production
 * database) must not be able to wipe it. See backend/scripts/run-with-test-db.mjs
 * for how "test" DB npm scripts set DATABASE_URL from TEST_DATABASE_URL.
 */
export async function resetDb() {
  const {
    rows: [{ current_database: dbName }],
  } = await pool.query('SELECT current_database()');

  if (!dbName.includes('test')) {
    throw new Error(
      `resetDb() refuses to wipe database "${dbName}" because its name doesn't contain ` +
        '"test". Start an isolated test DB: docker compose --profile test up -d db-test, ' +
        'then set TEST_DATABASE_URL in .env (see .env.example).',
    );
  }

  await pool.query('TRUNCATE TABLE invites, party_images, parties, hosts RESTART IDENTITY CASCADE');
}

export async function closeDb() {
  await pool.end();
}

export async function insertHost({ username, passwordHash, createdAt, lastLoginAt }) {
  const { rows } = await pool.query(
    `INSERT INTO hosts (username, password_hash, created_at, last_login_at)
     VALUES ($1, $2, COALESCE($3, now()), $4)
     RETURNING id, username, created_at, last_login_at`,
    [username, passwordHash, createdAt ?? null, lastLoginAt ?? null],
  );

  return rows[0];
}

export async function insertParty(overrides = {}) {
  const { rows } = await pool.query(
    `INSERT INTO parties (name, slug, event_date, accept_label, decline_label,
                           companion_field_label, companion_field_visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, slug, event_date, accept_label, decline_label,
               companion_field_label, companion_field_visible, created_at, updated_at`,
    [
      overrides.name ?? 'Summer Party',
      overrides.slug ?? `party-${Math.random().toString(36).slice(2)}`,
      overrides.event_date ?? '2099-01-01',
      overrides.accept_label ?? 'Accept',
      overrides.decline_label ?? 'Decline',
      overrides.companion_field_label ?? 'Bringing a companion?',
      overrides.companion_field_visible ?? false,
    ],
  );

  return rows[0];
}

export async function insertPartyImage({ partyId, filename, storagePath }) {
  const { rows } = await pool.query(
    `INSERT INTO party_images (party_id, filename, storage_path)
     VALUES ($1, $2, $3)
     RETURNING id, party_id, filename, storage_path, uploaded_at`,
    [partyId, filename ?? 'photo.png', storagePath ?? `parties/${partyId}/photo.png`],
  );

  return rows[0];
}

export async function insertInvite({ partyId, ...overrides }) {
  const { rows } = await pool.query(
    `INSERT INTO invites (party_id, invite_code, guest_name, greeting_text, allow_companion,
                           status, companion_response, responded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, party_id, invite_code, guest_name, greeting_text, allow_companion,
               status, companion_response, created_at, updated_at, responded_at`,
    [
      partyId,
      overrides.invite_code ?? `CODE${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      overrides.guest_name ?? 'Guest Name',
      overrides.greeting_text ?? null,
      overrides.allow_companion ?? false,
      overrides.status ?? 'pending',
      overrides.companion_response ?? null,
      overrides.responded_at ?? null,
    ],
  );

  return rows[0];
}

export async function findHostByUsername(username) {
  const { rows } = await pool.query(
    'SELECT id, username, password_hash FROM hosts WHERE username = $1',
    [username],
  );

  return rows[0] ?? null;
}

export { pool };
