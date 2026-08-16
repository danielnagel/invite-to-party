<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useGuestSessionStore } from '../stores/guestSession';

const route = useRoute();
const router = useRouter();
const guestSession = useGuestSessionStore();

const code = ref(typeof route.query['invite-code'] === 'string' ? route.query['invite-code'] : '');
const errorMessage = ref('');
const isSubmitting = ref(false);

async function submit() {
  if (!code.value) return;
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await guestSession.verify(code.value);

    // On a party's vanity path (e.g. /wedding), the code must actually
    // belong to that party.
    if (route.params.slug && guestSession.party.slug !== route.params.slug) {
      guestSession.clear();
      errorMessage.value = 'This invite code is not valid for this party.';
      return;
    }

    router.push('/guest');
  } catch {
    errorMessage.value = 'Invalid or unknown invite code.';
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  if (code.value) {
    submit();
  }
});
</script>

<template>
  <main class="flex flex-col items-center justify-center px-4 py-10">
    <div class="w-full max-w-sm bg-black/60 rounded-lg p-6">
      <h1 class="text-2xl font-semibold mb-6">
        You're invited
      </h1>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="submit"
      >
        <div class="flex flex-col gap-1">
          <label
            for="invite-code"
            class="text-sm font-medium"
          >Invite code</label>
          <input
            id="invite-code"
            v-model="code"
            type="text"
            required
            class="bg-secondary text-primary border border-primary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          >
        </div>

        <p
          v-if="errorMessage"
          class="text-red-400 text-sm"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="bg-primary text-secondary rounded px-4 py-2 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          Continue
        </button>
      </form>
    </div>
  </main>
</template>
