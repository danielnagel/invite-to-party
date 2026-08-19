export const shorthands = undefined;

// Additional named people on the same invite, each answering independently.
// The invite's own guest_name/status stay as the "primary" guest (see
// backend/README.md / routes/invites.js) - an invite with zero rows here
// behaves exactly like today's single-guest invite.
export const up = (pgm) => {
  pgm.createTable('invite_guests', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    invite_id: {
      type: 'uuid',
      notNull: true,
      references: 'invites',
      onDelete: 'CASCADE',
    },
    name: {
      type: 'text',
      notNull: true,
    },
    status: {
      type: 'text',
      notNull: true,
      default: 'pending',
    },
    responded_at: {
      type: 'timestamptz',
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

  pgm.createIndex('invite_guests', 'invite_id');
};

export const down = (pgm) => {
  pgm.dropTable('invite_guests');
};
