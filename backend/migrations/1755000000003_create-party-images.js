export const shorthands = undefined;

// Files themselves live on disk in the "uploads-data" volume (see
// src/lib/uploads.js), not in Postgres - this table only indexes them.
export const up = (pgm) => {
  pgm.createTable('party_images', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    party_id: {
      type: 'uuid',
      notNull: true,
      references: 'parties',
      onDelete: 'CASCADE',
    },
    filename: {
      type: 'text',
      notNull: true,
    },
    storage_path: {
      type: 'text',
      notNull: true,
    },
    uploaded_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('party_images', 'party_id');
};

export const down = (pgm) => {
  pgm.dropTable('party_images');
};
