<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { apiClient } from '../api/client';
import { useHostAuthStore } from '../stores/hostAuth';
import PartyForm from '../components/PartyForm.vue';
import IconArrowRight from '../components/icons/IconArrowRight.vue';

const { t, locale } = useI18n();
const hostAuth = useHostAuthStore();

const parties = ref([]);
const isLoading = ref(false);
const errorMessage = ref('');
const formResetKey = ref(0);

async function loadParties() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    parties.value = await apiClient.get('/parties');
  } catch {
    errorMessage.value = t('hostParties.errorLoad');
  } finally {
    isLoading.value = false;
  }
}

async function handleCreate(data) {
  errorMessage.value = '';
  try {
    await apiClient.post('/parties', data);
    formResetKey.value += 1;
    await loadParties();
  } catch {
    errorMessage.value = t('hostParties.errorCreate');
  }
}

// Maps to full locale tags so the date format (day/month order, separators)
// matches each language's convention rather than relying on browser defaults.
const DATE_FORMAT_LOCALES = { en: 'en-GB', de: 'de-DE' };

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(DATE_FORMAT_LOCALES[locale.value] ?? 'en-GB').format(new Date(value));
}

onMounted(loadParties);
</script>

<template>
  <main class="flex flex-col gap-6 px-4 py-8 max-w-3xl mx-auto w-full">
    <h1 class="text-2xl font-semibold">
      {{ t('hostParties.title') }}
    </h1>

    <p
      v-if="errorMessage"
      class="text-red-400 text-sm"
    >
      {{ errorMessage }}
    </p>

    <section class="bg-black/60 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-4">
        {{ t('hostParties.newParty') }}
      </h2>
      <PartyForm
        :key="formResetKey"
        :disabled="hostAuth.demoMode"
        @submit="handleCreate"
      />
    </section>

    <p
      v-if="isLoading"
      class="text-primary/70 text-sm"
    >
      {{ t('hostParties.loading') }}
    </p>

    <ul
      v-else
      class="flex flex-col gap-3"
    >
      <li
        v-for="party in parties"
        :key="party.id"
        class="bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
      >
        <router-link
          :to="`/parties/${party.id}`"
          class="flex items-center justify-between gap-3 p-4"
        >
          <span class="font-medium">{{ party.name }}</span>
          <span class="flex items-center gap-2 text-sm text-primary/70">
            {{ formatDate(party.event_date) }}
            <IconArrowRight class="w-4 h-4" />
          </span>
        </router-link>
      </li>
      <li
        v-if="parties.length === 0"
        class="text-primary/70 text-sm"
      >
        {{ t('hostParties.empty') }}
      </li>
    </ul>
  </main>
</template>
