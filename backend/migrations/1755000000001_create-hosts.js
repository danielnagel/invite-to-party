export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('hosts', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    username: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    last_login_at: {
      type: 'timestamptz',
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('hosts');
};
