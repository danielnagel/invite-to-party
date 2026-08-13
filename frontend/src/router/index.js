import { createRouter, createWebHistory } from 'vue-router';

import { useHostAuthStore } from '../stores/hostAuth';
import { useGuestSessionStore } from '../stores/guestSession';

const routes = [
  {
    path: '/rsvp',
    name: 'guest-rsvp',
    component: () => import('../views/GuestRsvpView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/invite',
    name: 'host-login',
    component: () => import('../views/HostLoginView.vue'),
  },
  {
    path: '/invite/parties',
    name: 'host-parties',
    component: () => import('../views/HostPartiesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/invite/parties/:id',
    name: 'host-party-detail',
    component: () => import('../views/HostPartyDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    name: 'guest-entry',
    component: () => import('../views/GuestEntryView.vue'),
  },
  // Vanity party URL (e.g. /wedding). Registered last so it never shadows
  // /invite, /invite/parties, /rsvp etc.
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
        return { name: 'guest-entry' };
      }
    }
  }

  return true;
});

export default router;
