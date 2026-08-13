import pool from '../db/pool.js';

async function main() {
  const { rows } = await pool.query(
    `SELECT username, created_at, last_login_at
     FROM hosts
     ORDER BY created_at DESC`,
  );

  if (rows.length === 0) {
    console.log('No hosts exist yet.');
    return;
  }

  console.log('Hosts:');
  for (const row of rows) {
    const lastLogin = row.last_login_at ? row.last_login_at.toISOString() : 'never';

    console.log(
      `  ${row.username}  (created: ${row.created_at.toISOString()}, last login: ${lastLogin})`,
    );
  }
}

main()
  .catch((error) => {
    console.error('Failed to list hosts:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
