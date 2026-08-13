<script setup>
import { computed, ref } from 'vue';

import { useGuestSessionStore } from '../stores/guestSession';

const guestSession = useGuestSessionStore();

const companion = ref(!!guestSession.companionResponse);
const errorMessage = ref('');
const isSubmitting = ref(false);

const showCompanionField = computed(
  () => guestSession.party?.companion_field_visible && guestSession.allowCompanion,
);

async function respond(status) {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await guestSession.respond(status, showCompanionField.value ? companion.value : false);
  } catch {
    errorMessage.value = 'Could not save your answer, please try again.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="flex flex-col items-center px-4 py-10">
    <div class="w-full max-w-md bg-black/60 rounded-lg p-6 flex flex-col gap-6">
      <div>
        <h1 class="text-2xl font-semibold">
          Hello {{ guestSession.guestName }}
        </h1>
        <p
          v-if="guestSession.greetingText"
          class="mt-2 whitespace-pre-line"
        >
          {{ guestSession.greetingText }}
        </p>
      </div>

      <p
        v-if="guestSession.expired"
        class="text-primary/70"
      >
        This invite has expired - the party already took place.
      </p>

      <template v-else>
        <label
          v-if="showCompanionField"
          class="flex items-center gap-2"
        >
          <input
            v-model="companion"
            type="checkbox"
            class="h-4 w-4"
          >
          <span>{{ guestSession.party.companion_field_label }}</span>
        </label>

        <div class="flex gap-3">
          <button
            type="button"
            class="rounded px-4 py-2 disabled:opacity-50"
            :class="guestSession.status === 'accepted' ? 'bg-accent text-primary' : 'bg-primary text-secondary'"
            :disabled="isSubmitting"
            @click="respond('accepted')"
          >
            {{ guestSession.party.accept_label }}
          </button>
          <button
            type="button"
            class="rounded px-4 py-2 border border-primary/30 disabled:opacity-50"
            :class="guestSession.status === 'declined' ? 'bg-accent text-primary' : ''"
            :disabled="isSubmitting"
            @click="respond('declined')"
          >
            {{ guestSession.party.decline_label }}
          </button>
        </div>

        <p
          v-if="guestSession.status !== 'pending'"
          class="text-sm text-primary/70"
        >
          You can change your answer any time before the party.
        </p>

        <p
          v-if="errorMessage"
          class="text-red-400 text-sm"
        >
          {{ errorMessage }}
        </p>
      </template>
    </div>
  </main>
</template>
