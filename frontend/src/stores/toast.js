import { defineStore } from 'pinia';

// Errors stay longer than confirmations since the user may need to read them.
const DURATION_MS = { success: 3000, error: 6000 };

let nextId = 1;

/**
 * Global, short-lived feedback messages ("Saved", "Deleted", errors) shown by
 * components/ToastContainer.vue. Lives in a store rather than per view so a
 * toast survives a route change (e.g. deleting a party navigates away).
 */
export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [],
  }),

  actions: {
    show(type, message) {
      const id = nextId++;
      this.toasts.push({ id, type, message });
      setTimeout(() => this.dismiss(id), DURATION_MS[type] ?? DURATION_MS.success);
      return id;
    },

    success(message) {
      return this.show('success', message);
    },

    error(message) {
      return this.show('error', message);
    },

    dismiss(id) {
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    },
  },
});
