export const shorthands = undefined;

// Party-wide info (schedule, location notes, dress code, ...) shown to every
// guest on their invite page - unlike invites.greeting_text, which is
// per-invite. Nullable: a party without info just shows nothing extra.
export const up = (pgm) => {
  pgm.addColumns('parties', {
    info_text: {
      type: 'text',
    },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('parties', ['info_text']);
};
