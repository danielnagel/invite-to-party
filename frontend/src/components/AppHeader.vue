<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useHostAuthStore } from '../stores/hostAuth';

const hostAuth = useHostAuthStore();
const router = useRouter();
const route = useRoute();

const homeLink = computed(() => (hostAuth.isAuthenticated ? '/invite/parties' : '/'));
const isGuestPage = computed(() => route.name === 'guest' || route.name === 'host-party-preview');

async function handleLogout() {
  await hostAuth.logout();
  router.push('/invite');
}
</script>

<template>
  <header
    v-if="!isGuestPage"
    class="hidden md:flex items-center px-6 py-4 bg-black/60 text-primary"
  >
    <router-link
      :to="homeLink"
      class="flex items-center gap-3"
    >
      <img
        src="/logo.svg"
        alt="Logo"
        class="h-10 w-10"
      >
      <span class="text-lg font-semibold">Invite to Party</span>
    </router-link>

    <button
      v-if="hostAuth.isAuthenticated"
      type="button"
      class="ml-4 text-xs text-primary/60 hover:underline cursor-pointer"
      @click="handleLogout"
    >
      Log out
    </button>
  </header>
</template>
