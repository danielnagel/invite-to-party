import { createRouter, createWebHistory } from 'vue-router';

import { useHostAuthStore } from '../stores/hostAuth';
import { useGuestSessionStore } from '../stores/guestSession';

const routes = [
  {
    path: '/guest',
    name: 'guest',
    component: () => import('../views/GuestView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    name: 'host-login',
    component: () => import('../views/HostLoginView.vue'),
  },
  {
    path: '/parties',
    name: 'host-parties',
    component: () => import('../views/HostPartiesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/parties/:id',
    name: 'host-party-detail',
    component: () => import('../views/HostPartyDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/parties/:id/preview',
    name: 'host-party-preview',
    component: () => import('../views/GuestPreviewView.vue'),
    meta: { requiresAuth: true },
  },
  // Vanity party URL (e.g. /wedding) - the only way a guest reaches the invite
  // code entry form. Registered last so it never shadows /, /parties, /guest.
  {
    path: '/:slug',
    name: 'guest-entry-party',
    component: () => import('../views/GuestEntryView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const hostAuthStore = useHostAuthStore();

  if (to.meta.requiresAuth) {
    if (!hostAuthStore.checked) {
      await hostAuthStore.fetchCurrentHost();
    }
    if (!hostAuthStore.isAuthenticated) {
      return { name: 'host-login' };
    }
  }

  if (to.meta.requiresGuest) {
    const guestSessionStore = useGuestSessionStore();
    if (!guestSessionStore.isVerified) {
      const restored = await guestSessionStore.restore();
      if (!restored) {
        // No party slug is known at this point (e.g. a stale/direct visit to
        // /guest), so there's no `/:slug` to send them back to - the guest
        // always arrives fresh via their own party's link.
        return { name: 'host-login' };
      }
    }
  }

  return true;
});

export default router;
