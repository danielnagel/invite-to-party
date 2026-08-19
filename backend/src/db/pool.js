import pg from 'pg';
import 'dotenv/config';

const { Pool, types } = pg;

// By default node-postgres parses "date" columns (OID 1082, e.g.
// parties.event_date) into JS Date objects, which JSON.stringify then
// serializes with a time/timezone component (e.g. "2099-12-31T00:00:00.000Z").
// That breaks round-tripping through <input type="date">, which requires a
// bare "YYYY-MM-DD" value - anything else renders as an empty field. Postgres
// already returns date values as "YYYY-MM-DD" text on the wire, so keeping
// that string as-is (instead of letting pg convert it to a Date) is correct
// and avoids the mismatch entirely.
types.setTypeParser(1082, (value) => value);

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'invite_to_party',
    });

export default pool;
