<script setup>
import { useRouter } from 'vue-router';

import { useHostAuthStore } from '../stores/hostAuth';

const hostAuth = useHostAuthStore();
const router = useRouter();

async function handleLogout() {
  await hostAuth.logout();
  router.push('/invite');
}
</script>

<template>
  <footer class="flex flex-col items-center gap-2 px-6 py-4 bg-secondary text-primary">
    <div class="md:hidden flex flex-col items-center gap-2">
      <img
        src="/favicon.svg"
        alt="Logo"
        class="h-10 w-10"
      >
      <span class="text-sm">Invite to Party</span>

      <button
        v-if="hostAuth.isAuthenticated"
        type="button"
        class="text-xs text-primary/60 hover:underline"
        @click="handleLogout"
      >
        Log out
      </button>
    </div>
  </footer>
</template>
