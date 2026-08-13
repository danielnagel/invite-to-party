<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useHostAuthStore } from '../stores/hostAuth';

const hostAuth = useHostAuthStore();
const router = useRouter();

const homeLink = computed(() => (hostAuth.isAuthenticated ? '/invite/parties' : '/'));

async function handleLogout() {
  await hostAuth.logout();
  router.push('/invite');
}
</script>

<template>
  <header class="hidden md:flex items-center px-6 py-4 bg-secondary text-primary">
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
      class="ml-4 text-xs text-primary/60 hover:underline"
      @click="handleLogout"
    >
      Log out
    </button>
  </header>
</template>
