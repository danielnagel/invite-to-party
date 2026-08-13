export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable('invites', {
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
    invite_code: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    guest_name: {
      type: 'text',
      notNull: true,
    },
    greeting_text: {
      type: 'text',
    },
    // Set per guest at creation (the "Begleitung" checkbox); companion_response
    // below is the guest's actual answer, not what the host allowed.
    allow_companion: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    status: {
      type: 'text',
      notNull: true,
      default: 'pending',
    },
    companion_response: {
      type: 'boolean',
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
    responded_at: {
      type: 'timestamptz',
    },
  });

  pgm.createIndex('invites', 'party_id');
};

export const down = (pgm) => {
  pgm.dropTable('invites');
};
