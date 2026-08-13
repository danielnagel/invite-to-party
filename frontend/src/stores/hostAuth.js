import { defineStore } from 'pinia';

import { apiClient } from '../api/client';

// Session store for the host (the only account type in this app - guests
// have no account, see stores/guestSession.js). Hosts are created via CLI
// only, so unlike booking's auth store there is no register/reset-password.
export const useHostAuthStore = defineStore('hostAuth', {
  state: () => ({
    host: null,
    checked: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.host,
  },

  actions: {
    /** Checks the session on app start via GET /api/auth/me. */
    async fetchCurrentHost() {
      try {
        const data = await apiClient.get('/auth/me');
        this.host = data ?? null;
      } catch {
        this.host = null;
      } finally {
        this.checked = true;
      }
      return this.host;
    },

    async login(username, password) {
      const data = await apiClient.post('/auth/login', { username, password });
      this.host = data ?? null;
      this.checked = true;
      return this.host;
    },

    async logout() {
      await apiClient.post('/auth/logout');
      this.host = null;
    },
  },
});
