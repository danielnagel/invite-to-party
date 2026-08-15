<script setup>
import { computed, ref, watch } from 'vue';

import { apiClient } from '../api/client';
import { useHostAuthStore } from '../stores/hostAuth';
import { useGuestSessionStore } from '../stores/guestSession';

const hostAuth = useHostAuthStore();
const guestSession = useGuestSessionStore();

// "Verified" means: host is logged in, or the guest's invite code has been
// resolved. Before that, only the neutral secondary color is shown.
const verified = computed(() => hostAuth.isAuthenticated || guestSession.isVerified);

const imageUrl = ref(null);

async function loadBackground() {
  try {
    // A guest is always scoped to one party; a logged-in host has no single
    // party in view here, so a random image is picked across all of their
    // parties (see backend images.js).
    const endpoint = guestSession.isVerified
      ? `/parties/${guestSession.party.id}/random-background`
      : '/images/random-background';
    const data = await apiClient.get(endpoint);
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
