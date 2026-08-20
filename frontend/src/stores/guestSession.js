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
    status: 'pending',
    expired: false,
    guests: [],
    party: null,
    isPreview: false,
  }),

  getters: {
    isVerified: (state) => !!state.party,
  },

  actions: {
    applyLookup(code, data) {
      this.code = code;
      this.guestName = data.guest_name;
      this.greetingText = data.greeting_text;
      this.status = data.status;
      this.expired = data.expired;
      this.guests = data.guests ?? [];
      this.party = data.party;
      sessionStorage.setItem(STORAGE_KEY, code);
    },

    /**
     * Lets a host see the guest RSVP page for a party without a real invite
     * code (see GET /parties/:id/preview). respond() below skips the network
     * call while this is active, since there's no invite behind it to save to.
     */
    async loadPreview(partyId) {
      const data = await apiClient.get(`/parties/${partyId}/preview`);
      this.code = null;
      this.guestName = data.guest_name;
      this.greetingText = data.greeting_text;
      this.status = data.status;
      this.expired = data.expired;
      this.guests = data.guests ?? [];
      this.party = data.party;
      this.isPreview = true;
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

    async respond(status) {
      if (this.isPreview) {
        this.status = status;
        return;
      }

      try {
        const data = await apiClient.post(`/invites/${this.code}/rsvp`, { status });
        this.status = data.status;
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

    /** Same as respond(), but for one of the invite's additional named guests. */
    async respondGuest(guestId, status) {
      if (this.isPreview) {
        const guest = this.guests.find((g) => g.id === guestId);
        if (guest) guest.status = status;
        return;
      }

      try {
        const data = await apiClient.post(`/invites/${this.code}/guests/${guestId}/rsvp`, { status });
        const guest = this.guests.find((g) => g.id === guestId);
        if (guest) guest.status = data.status;
      } catch (error) {
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
