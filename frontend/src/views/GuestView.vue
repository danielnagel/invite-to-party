<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useGuestSessionStore } from '../stores/guestSession';
import IconCheck from '../components/icons/IconCheck.vue';
import IconX from '../components/icons/IconX.vue';

const guestSession = useGuestSessionStore();
const { t, locale } = useI18n();

const companion = ref(!!guestSession.companionResponse);
const errorMessage = ref('');
const isSubmitting = ref(false);
const submittingGuestId = ref(null);

const showCompanionField = computed(
  () => guestSession.party?.companion_field_visible && guestSession.allowCompanion,
);

// A group invite (guests.length > 0) is greeted by all names together; a
// plain single-guest invite keeps the exact "Hello <name>" it always had.
const greetingName = computed(() => {
  if (guestSession.guests.length === 0) return guestSession.guestName;
  const names = [guestSession.guestName, ...guestSession.guests.map((guest) => guest.name)];
  return new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(names);
});

async function respond(status) {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await guestSession.respond(status, showCompanionField.value ? companion.value : false);
  } catch {
    errorMessage.value = t('guest.error');
  } finally {
    isSubmitting.value = false;
  }
}

async function respondGuest(guestId, status) {
  errorMessage.value = '';
  submittingGuestId.value = guestId;
  try {
    await guestSession.respondGuest(guestId, status);
  } catch {
    errorMessage.value = t('guest.error');
  } finally {
    submittingGuestId.value = null;
  }
}
</script>

<template>
  <main class="flex flex-col items-center justify-center px-4 py-10">
    <div class="w-full max-w-md bg-black/60 rounded-lg p-6 flex flex-col gap-6">
      <div>
        <h1 class="text-2xl font-semibold">
          {{ t('guest.hello', { name: greetingName }) }}
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
        {{ t('guest.expired') }}
      </p>

      <template v-else-if="guestSession.guests.length === 0">
        <label
          v-if="showCompanionField"
          class="flex items-center gap-2 cursor-pointer"
        >
          <input
            v-model="companion"
            type="checkbox"
            class="h-4 w-4 cursor-pointer"
          >
          <span class="cursor-pointer">{{ guestSession.party.companion_field_label }}</span>
        </label>

        <div class="flex justify-center gap-3">
          <button
            type="button"
            class="flex items-center gap-2 rounded px-4 py-2 hover:brightness-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            :class="guestSession.status === 'accepted' ? 'bg-accent text-primary' : 'bg-primary text-secondary'"
            :disabled="isSubmitting"
            @click="respond('accepted')"
          >
            <IconCheck class="w-4 h-4" />
            {{ guestSession.party.accept_label }}
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded px-4 py-2 border border-primary/30 hover:bg-primary/10 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            :class="guestSession.status === 'declined' ? 'bg-accent text-primary' : ''"
            :disabled="isSubmitting"
            @click="respond('declined')"
          >
            <IconX class="w-4 h-4" />
            {{ guestSession.party.decline_label }}
          </button>
        </div>

        <p
          v-if="guestSession.status !== 'pending'"
          class="text-sm text-primary/70"
        >
          {{ t('guest.changeAnswerHint') }}
        </p>
      </template>

      <template v-else>
        <label
          v-if="showCompanionField"
          class="flex items-center gap-2 cursor-pointer"
        >
          <input
            v-model="companion"
            type="checkbox"
            class="h-4 w-4 cursor-pointer"
          >
          <span class="cursor-pointer">{{ guestSession.party.companion_field_label }}</span>
        </label>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col items-center gap-2">
            <p class="font-medium">
              {{ guestSession.guestName }}
            </p>
            <div class="flex justify-center gap-3">
              <button
                type="button"
                class="flex items-center gap-2 rounded px-4 py-2 hover:brightness-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                :class="guestSession.status === 'accepted' ? 'bg-accent text-primary' : 'bg-primary text-secondary'"
                :disabled="isSubmitting"
                @click="respond('accepted')"
              >
                <IconCheck class="w-4 h-4" />
                {{ guestSession.party.accept_label }}
              </button>
              <button
                type="button"
                class="flex items-center gap-2 rounded px-4 py-2 border border-primary/30 hover:bg-primary/10 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                :class="guestSession.status === 'declined' ? 'bg-accent text-primary' : ''"
                :disabled="isSubmitting"
                @click="respond('declined')"
              >
                <IconX class="w-4 h-4" />
                {{ guestSession.party.decline_label }}
              </button>
            </div>
            <p
              v-if="guestSession.status !== 'pending'"
              class="text-sm text-primary/70"
            >
              {{ t('guest.changeAnswerHint') }}
            </p>
          </div>

          <div
            v-for="guest in guestSession.guests"
            :key="guest.id"
            class="flex flex-col items-center gap-2 border-t border-primary/10 pt-4"
          >
            <p class="font-medium">
              {{ guest.name }}
            </p>
            <div class="flex justify-center gap-3">
              <button
                type="button"
                class="flex items-center gap-2 rounded px-4 py-2 hover:brightness-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                :class="guest.status === 'accepted' ? 'bg-accent text-primary' : 'bg-primary text-secondary'"
                :disabled="submittingGuestId === guest.id"
                @click="respondGuest(guest.id, 'accepted')"
              >
                <IconCheck class="w-4 h-4" />
                {{ guestSession.party.accept_label }}
              </button>
              <button
                type="button"
                class="flex items-center gap-2 rounded px-4 py-2 border border-primary/30 hover:bg-primary/10 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                :class="guest.status === 'declined' ? 'bg-accent text-primary' : ''"
                :disabled="submittingGuestId === guest.id"
                @click="respondGuest(guest.id, 'declined')"
              >
                <IconX class="w-4 h-4" />
                {{ guestSession.party.decline_label }}
              </button>
            </div>
            <p
              v-if="guest.status !== 'pending'"
              class="text-sm text-primary/70"
            >
              {{ t('guest.changeAnswerHint') }}
            </p>
          </div>
        </div>
      </template>

      <p
        v-if="errorMessage"
        class="text-red-400 text-sm"
      >
        {{ errorMessage }}
      </p>
    </div>
  </main>
</template>
