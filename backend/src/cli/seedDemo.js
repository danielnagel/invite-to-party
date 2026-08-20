import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { generateInviteCode } from '../lib/codes.js';
import { UPLOADS_ROOT, relativeStoragePath } from '../lib/uploads.js';

const BCRYPT_ROUNDS = 10;
const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo';

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(offsetDays) {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

// Bundled 64x64 placeholder images (backend/assets/demo-images) - fictional,
// solid-color squares, not real photos - so the demo party galleries and
// background aren't empty.
const DEMO_ASSETS_DIR = path.resolve(import.meta.dirname, '../../assets/demo-images');

const DEMO_PARTIES = [
  {
    name: 'Summer Rooftop Party',
    slug: 'summer-rooftop',
    event_date: isoDate(30),
    accept_label: "I'll be there!",
    decline_label: "Can't make it",
    images: ['party-1.png', 'party-2.png'],
    invites: [
      { guest_name: 'Alice Anderson', greeting_text: 'So glad you can join us!', status: 'pending' },
      { guest_name: 'Bob Baker', greeting_text: 'Looking forward to seeing you!', status: 'accepted' },
      { guest_name: 'Carla Diaz', greeting_text: null, status: 'accepted' },
      { guest_name: 'Dave Evans', greeting_text: 'Hope to catch you next time.', status: 'declined' },
    ],
  },
  {
    name: "Last Year's Reunion",
    slug: 'past-reunion',
    event_date: isoDate(-30),
    accept_label: 'Accept',
    decline_label: 'Decline',
    images: ['party-3.png'],
    invites: [
      { guest_name: 'Erin Frank', greeting_text: null, status: 'accepted' },
      { guest_name: 'Frank Green', greeting_text: null, status: 'pending' },
    ],
  },
];

async function seedDemoHost() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  await pool.query(
    `INSERT INTO hosts (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [DEMO_USERNAME, passwordHash],
  );
}

async function seedImage(partyId, assetFilename) {
  const uuidFilename = `${randomUUID()}${path.extname(assetFilename)}`;
  const storagePath = relativeStoragePath(partyId, uuidFilename);
  const destPath = path.join(UPLOADS_ROOT, storagePath);

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(path.join(DEMO_ASSETS_DIR, assetFilename), destPath);

  await pool.query(
    'INSERT INTO party_images (party_id, filename, storage_path) VALUES ($1, $2, $3)',
    [partyId, assetFilename, storagePath],
  );
}

async function seedParty(party) {
  const { rows } = await pool.query(
    `INSERT INTO parties (name, slug, event_date, accept_label, decline_label)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      party.name,
      party.slug,
      party.event_date,
      party.accept_label,
      party.decline_label,
    ],
  );
  const partyId = rows[0].id;

  for (const assetFilename of party.images) {
    await seedImage(partyId, assetFilename);
  }

  for (const invite of party.invites) {
    const respondedAt = invite.status === 'pending' ? null : new Date();
    await pool.query(
      `INSERT INTO invites (party_id, invite_code, guest_name, greeting_text, status, responded_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        partyId,
        generateInviteCode(),
        invite.guest_name,
        invite.greeting_text ?? null,
        invite.status,
        respondedAt,
      ],
    );
  }
}

async function seedDemoParties() {
  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM parties');
  if (Number.parseInt(rows[0].count, 10) > 0) return;

  for (const party of DEMO_PARTIES) {
    await seedParty(party);
  }
}

async function main() {
  await seedDemoHost();
  await seedDemoParties();
  console.log(`Demo host "${DEMO_USERNAME}" and ${DEMO_PARTIES.length} demo parties are seeded.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed demo data:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
