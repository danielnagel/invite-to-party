import bcrypt from 'bcrypt';
import pool from '../db/pool.js';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

async function main() {
  const [username, password] = process.argv.slice(2);

  if (!username || !password) {
    console.error('Usage: npm run host:create -- <username> <password>');
    process.exitCode = 1;
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exitCode = 1;
    return;
  }

  const { rows: existing } = await pool.query('SELECT id FROM hosts WHERE username = $1', [
    username,
  ]);
  if (existing.length > 0) {
    console.error(`A host named "${username}" already exists.`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await pool.query('INSERT INTO hosts (username, password_hash) VALUES ($1, $2)', [
    username,
    passwordHash,
  ]);

  console.log(`Host created: ${username}`);
}

main()
  .catch((error) => {
    console.error('Failed to create host:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
