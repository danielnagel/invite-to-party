import { randomInt } from 'node:crypto';

// Excludes visually ambiguous characters (0/O, 1/I) since guests type this
// code by hand or paste it from a message - unlike booking's invite codes,
// which are only ever copy-pasted into a registration form.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/**
 * Generates a short, guest-typable invite code.
 */
export function generateInviteCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}
