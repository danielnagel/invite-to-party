export const shorthands = undefined;

// The companion/plus-one field predates named multi-guest invites
// (invite_guests, see 1755000000005) - now that a host can just add the
// companion as a named guest, the separate opt-in flag is redundant.
export const up = (pgm) => {
  pgm.dropColumns('invites', ['allow_companion', 'companion_response']);
  pgm.dropColumns('parties', ['companion_field_label', 'companion_field_visible']);
};

export const down = (pgm) => {
  pgm.addColumns('parties', {
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
  });
  pgm.addColumns('invites', {
    allow_companion: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    companion_response: {
      type: 'boolean',
    },
  });
};
