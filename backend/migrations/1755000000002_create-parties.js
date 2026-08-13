export const shorthands = undefined;

// event_date doubles as the expiry for every invite in the party - there is
// no separate expiry column (see plan / backend/README.md).
export const up = (pgm) => {
  pgm.createTable('parties', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'text',
      notNull: true,
    },
    slug: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    event_date: {
      type: 'date',
      notNull: true,
    },
    accept_label: {
      type: 'text',
      notNull: true,
      default: 'Accept',
    },
    decline_label: {
      type: 'text',
      notNull: true,
      default: 'Decline',
    },
    companion_field_label: {
      type: 'text',
      notNull: true,
      default: 'Bringing a companion?',
    },
    companion_field_visible: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('parties');
};
