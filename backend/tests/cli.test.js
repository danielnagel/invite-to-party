import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import { resetDb, closeDb, pool, insertHost } from './helpers/db.js';
import { runCli } from './helpers/cli.js';

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe('host:create CLI', () => {
  it('creates a new host', async () => {
    const result = runCli('hostCreate.js', ['alice', 'supersecret1']);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Host created: alice/);

    const { rows } = await pool.query('SELECT username FROM hosts WHERE username = $1', ['alice']);
    expect(rows).toHaveLength(1);
  });

  it('fails without both arguments', async () => {
    const result = runCli('hostCreate.js', ['alice']);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Usage/);
  });

  it('fails for a too-short password', async () => {
    const result = runCli('hostCreate.js', ['alice', 'short']);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/at least/);
  });

  it('fails for a username that already exists', async () => {
    const passwordHash = await bcrypt.hash('irrelevant', 10);
    await insertHost({ username: 'alice', passwordHash });

    const result = runCli('hostCreate.js', ['alice', 'supersecret1']);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/already exists/);
  });
});

describe('host:list CLI', () => {
  it('reports when there are no hosts', async () => {
    const result = runCli('hostList.js');

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/No hosts exist/);
  });

  it('lists hosts with creation date and last login', async () => {
    const passwordHash = await bcrypt.hash('irrelevant', 10);
    await insertHost({ username: 'returning-host', passwordHash, lastLoginAt: new Date() });
    await insertHost({ username: 'never-logged-in', passwordHash });

    const result = runCli('hostList.js');

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/returning-host\s+\(created:.*last login: \d{4}-\d{2}-\d{2}T.*\)/);
    expect(result.stdout).toMatch(/never-logged-in\s+\(created:.*last login: never\)/);
  });
});

describe('seed:demo CLI', () => {
  it('seeds a demo host, parties, images and invites', async () => {
    const result = runCli('seedDemo.js');

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Demo host "demo"/);

    const { rows: hosts } = await pool.query('SELECT username FROM hosts WHERE username = $1', ['demo']);
    expect(hosts).toHaveLength(1);

    const { rows: parties } = await pool.query('SELECT id FROM parties');
    expect(parties.length).toBeGreaterThan(0);

    const { rows: images } = await pool.query('SELECT id FROM party_images');
    expect(images.length).toBeGreaterThan(0);

    const { rows: invites } = await pool.query('SELECT id FROM invites');
    expect(invites.length).toBeGreaterThan(0);
  });

  it('is idempotent about parties on repeated runs', async () => {
    runCli('seedDemo.js');
    const firstCount = (await pool.query('SELECT COUNT(*) AS count FROM parties')).rows[0].count;

    runCli('seedDemo.js');
    const secondCount = (await pool.query('SELECT COUNT(*) AS count FROM parties')).rows[0].count;

    expect(secondCount).toBe(firstCount);
  });
});
