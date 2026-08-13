import { defineStore } from 'pinia';

import { apiClient } from '../api/client';

// Guest identity is just the invite code (no account, see backend
// invites.js public endpoints). The code is kept in sessionStorage so a
// page reload on /guest re-resolves the same invite instead of bouncing the
// guest back to the entry form.
const STORAGE_KEY = 'invite-to-party.invite-code';

export const useGuestSessionStore = defineStore('guestSession', {
  state: () => ({
    code: null,
    guestName: null,
    greetingText: null,
    allowCompanion: false,
    status: 'pending',
    companionResponse: null,
    expired: false,
    party: null,
  }),

  getters: {
    isVerified: (state) => !!state.party,
  },

  actions: {
    applyLookup(code, data) {
      this.code = code;
      this.guestName = data.guest_name;
      this.greetingText = data.greeting_text;
      this.allowCompanion = data.allow_companion;
      this.status = data.status;
      this.companionResponse = data.companion_response;
      this.expired = data.expired;
      this.party = data.party;
      sessionStorage.setItem(STORAGE_KEY, code);
    },

    /** Resolves an invite code via the public lookup endpoint. */
    async verify(code) {
      const data = await apiClient.get('/invites/lookup', { code });
      this.applyLookup(code, data);
      return this.party;
    },

    /** Re-resolves the code kept from a previous verify() after a reload. */
    async restore() {
      if (this.isVerified) return true;
      const code = sessionStorage.getItem(STORAGE_KEY);
      if (!code) return false;
      try {
        await this.verify(code);
        return true;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return false;
      }
    },

    async respond(status, companion) {
      try {
        const data = await apiClient.post(`/invites/${this.code}/rsvp`, { status, companion });
        this.status = data.status;
        this.companionResponse = data.companion_response;
      } catch (error) {
        // Backend responds 410 once the party's event_date has passed (see
        // backend/src/routes/invites.js) - flip to the expired state instead
        // of just showing a generic error.
        if (error.status === 410) {
          this.expired = true;
        }
        throw error;
      }
    },

    clear() {
      this.$reset();
      sessionStorage.removeItem(STORAGE_KEY);
    },
  },
});
