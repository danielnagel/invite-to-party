<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useGuestSessionStore } from '../stores/guestSession';
import GuestView from './GuestView.vue';
import IconArrowLeft from '../components/icons/IconArrowLeft.vue';

const route = useRoute();
const guestSession = useGuestSessionStore();
const partyId = route.params.id;

const errorMessage = ref('');

onMounted(async () => {
  try {
    await guestSession.loadPreview(partyId);
  } catch {
    errorMessage.value = 'Could not load a preview for this party.';
  }
});

// Guest session state is shared with the real guest flow - drop the preview
// data on the way out so it can't be mistaken for a verified guest elsewhere.
onBeforeUnmount(() => {
  guestSession.clear();
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3 bg-black/60 px-4 py-3 text-sm text-primary">
      <router-link
        :to="`/invite/parties/${partyId}`"
        class="flex items-center gap-1.5 text-primary/70 hover:text-primary hover:underline"
      >
        <IconArrowLeft class="w-4 h-4" />
        Back to admin
      </router-link>
      <span class="text-primary/70">Preview - responses here are not saved</span>
    </div>

    <p
      v-if="errorMessage"
      class="px-4 py-2 text-sm text-red-400"
    >
      {{ errorMessage }}
    </p>

    <GuestView v-if="guestSession.isVerified" />
  </div>
</template>
