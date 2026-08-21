import { defineStore } from 'pinia';

import { apiClient } from '../api/client';

// Session store for the host (the only account type in this app - guests
// have no account, see stores/guestSession.js). Hosts are created via CLI
// only, so unlike booking's auth store there is no register/reset-password.
export const useHostAuthStore = defineStore('hostAuth', {
  state: () => ({
    host: null,
    checked: false,
    // Whether the backend is running with MODE=demo (see
    // backend/src/middleware/demoMode.js). Host-side mutations are rejected
    // there regardless of this flag; it only drives disabling the
    // corresponding buttons in the UI so demo hosts aren't met with silent
    // failures.
    demoMode: false,
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
        this.demoMode = data?.demoMode ?? false;
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
      this.demoMode = data?.demoMode ?? false;
      this.checked = true;
      return this.host;
    },

    async logout() {
      await apiClient.post('/auth/logout');
      this.host = null;
    },
  },
});
