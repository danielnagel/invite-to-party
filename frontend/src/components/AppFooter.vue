<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { useHostAuthStore } from '../stores/hostAuth';
import LanguageSwitch from './LanguageSwitch.vue';

const hostAuth = useHostAuthStore();
const router = useRouter();
const { t } = useI18n();

async function handleLogout() {
  await hostAuth.logout();
  router.push('/invite');
}
</script>

<template>
  <footer class="flex flex-col items-center gap-2 px-6 py-4 text-primary bg-black/60">
    <div class="md:hidden flex flex-col items-center gap-2">
      <img
        src="/favicon.svg"
        alt="Logo"
        class="h-10 w-10"
      >
      <span class="text-sm">Invite to Party</span>

      <template v-if="hostAuth.isAuthenticated">
        <LanguageSwitch />

        <button
          type="button"
          class="text-xs text-primary/60 hover:underline cursor-pointer"
          @click="handleLogout"
        >
          {{ t('app.logout') }}
        </button>
      </template>
    </div>

    <a
      href="https://dnagel.de"
      target="_blank"
      rel="noopener noreferrer"
      class="text-xs text-primary/60 hover:underline"
    >
      {{ t('app.madeBy') }}
    </a>
  </footer>
</template>
