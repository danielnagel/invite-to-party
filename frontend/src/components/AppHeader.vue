<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { useHostAuthStore } from '../stores/hostAuth';
import LanguageSwitch from './LanguageSwitch.vue';

const hostAuth = useHostAuthStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const appTitle = import.meta.env.VITE_APP_TITLE || 'Invite to Party';
const homeLink = computed(() => (hostAuth.isAuthenticated ? '/parties' : '/'));
const isGuestPage = computed(() => route.name === 'guest' || route.name === 'host-party-preview');

async function handleLogout() {
  await hostAuth.logout();
  router.push('/');
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
      <span class="text-lg font-semibold">{{ appTitle }}</span>
    </router-link>

    <template v-if="hostAuth.isAuthenticated">
      <LanguageSwitch class="ml-4" />

      <button
        type="button"
        class="ml-4 text-xs text-primary/60 hover:underline cursor-pointer"
        @click="handleLogout"
      >
        {{ t('app.logout') }}
      </button>
    </template>
  </header>
</template>
