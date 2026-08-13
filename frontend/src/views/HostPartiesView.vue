<script setup>
import { onMounted, ref } from 'vue';

import { apiClient } from '../api/client';
import PartyForm from '../components/PartyForm.vue';

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
    errorMessage.value = 'Could not load parties.';
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
    errorMessage.value = 'Could not create the party.';
  }
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB').format(new Date(value));
}

onMounted(loadParties);
</script>

<template>
  <main class="flex flex-col gap-6 px-4 py-8 max-w-3xl mx-auto w-full">
    <h1 class="text-2xl font-semibold">
      Parties
    </h1>

    <p
      v-if="errorMessage"
      class="text-red-400 text-sm"
    >
      {{ errorMessage }}
    </p>

    <section class="bg-black/60 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-4">
        New party
      </h2>
      <PartyForm
        :key="formResetKey"
        @submit="handleCreate"
      />
    </section>

    <p
      v-if="isLoading"
      class="text-primary/70 text-sm"
    >
      Loading...
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
          :to="`/invite/parties/${party.id}`"
          class="flex items-center justify-between gap-3 p-4"
        >
          <span class="font-medium">{{ party.name }}</span>
          <span class="flex items-center gap-2 text-sm text-primary/70">
            {{ formatDate(party.event_date) }}
            <span aria-hidden="true">→</span>
          </span>
        </router-link>
      </li>
      <li
        v-if="parties.length === 0"
        class="text-primary/70 text-sm"
      >
        No parties yet.
      </li>
    </ul>
  </main>
</template>
