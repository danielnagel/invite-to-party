<script setup>
import { computed, ref, watch } from 'vue';

import { apiClient } from '../api/client';
import { useGuestSessionStore } from '../stores/guestSession';

const guestSession = useGuestSessionStore();

// The admin (host) area always shows the generic pattern - only a verified
// guest, scoped to one party, ever gets a photo background.
const verified = computed(() => guestSession.isVerified);

const imageUrl = ref(null);

async function loadBackground() {
  try {
    const data = await apiClient.get(`/parties/${guestSession.party.id}/random-background`);
    imageUrl.value = data?.url ?? null;
  } catch {
    // No uploaded images (or the request failed) - fall back to the neutral
    // color, same as the pre-verification state.
    imageUrl.value = null;
  }
}

watch(
  verified,
  (value) => {
    if (value) {
      loadBackground();
    } else {
      imageUrl.value = null;
    }
  },
  { immediate: true },
);

// Static cover/center, no zoom animation - see project plan.
// No uploaded photo yet (not verified, or the party/host has none): fall
// back to the generic repeating party-symbol pattern instead of a photo.
const backgroundStyle = computed(() =>
  imageUrl.value
    ? {
        backgroundImage: `url(${imageUrl.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage: 'url(/party-pattern-background.svg)',
        backgroundRepeat: 'repeat',
        backgroundSize: '240px 240px',
      },
);
</script>

<template>
  <div
    class="fixed inset-0 -z-10"
    :style="backgroundStyle"
  />
</template>
