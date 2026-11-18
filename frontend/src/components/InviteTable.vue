<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import IconCopy from './icons/IconCopy.vue';
import IconCheck from './icons/IconCheck.vue';
import IconChat from './icons/IconChat.vue';

const props = defineProps({
  invites: { type: Array, default: () => [] },
  partyExpired: { type: Boolean, default: false },
  partySlug: { type: String, default: '' },
  // Disables edit/delete (e.g. MODE=demo, see stores/hostAuth.js). Copying
  // the guest link stays enabled since it doesn't mutate anything.
  disabled: { type: Boolean, default: false },
});

defineEmits(['edit', 'delete']);

const { t } = useI18n();

// Counts people, not invites: each invite's main guest plus all additional
// guests attached to it.
const guestCount = computed(() =>
  props.invites.reduce((sum, invite) => sum + 1 + (invite.guests?.length ?? 0), 0),
);

const copiedInviteId = ref(null);
let copiedTimeout = null;

// Greeting popover: opens on hover (desktop) and on click/tap (touch devices
// have no hover); closes on leave, blur, Escape or any scroll. Teleported to
// <body> and positioned `fixed` from the trigger's rect: the table's
// overflow-x-auto wrapper would clip it, and ancestors with backdrop-blur
// become the containing block for `fixed`, shifting it away from the icon.
const openGreetingId = ref(null);
const greetingPos = ref({ top: 0, left: 0 });

function openGreeting(invite, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  greetingPos.value = { top: rect.bottom + 4, left: rect.left };
  openGreetingId.value = invite.id;
}

function closeGreeting() {
  openGreetingId.value = null;
}

// Capture phase also catches scrolling of inner containers (e.g. the table
// wrapper), since scroll events don't bubble.
watch(openGreetingId, (id) => {
  if (id === null) window.removeEventListener('scroll', closeGreeting, true);
  else window.addEventListener('scroll', closeGreeting, { capture: true, passive: true });
});
onBeforeUnmount(() => window.removeEventListener('scroll', closeGreeting, true));

function statusLabel(status) {
  return t(`inviteStatus.${status}`);
}

function guestUrl(invite) {
  const params = new URLSearchParams({ 'invite-code': invite.invite_code });
  return `${window.location.origin}/${props.partySlug}?${params}`;
}

async function copyGuestUrl(invite) {
  try {
    await navigator.clipboard.writeText(guestUrl(invite));
    clearTimeout(copiedTimeout);
    copiedInviteId.value = invite.id;
    copiedTimeout = setTimeout(() => {
      copiedInviteId.value = null;
    }, 2000);
  } catch {
    // Clipboard access can fail (permissions, insecure context); nothing to
    // recover from beyond leaving the button unclicked-looking.
  }
}
</script>

<template>
  <div class="overflow-x-auto">
    <p
      class="text-sm text-primary/80 mb-2"
      data-testid="guest-count"
    >
      {{ t('inviteTable.guestCount', { count: guestCount }) }}
    </p>
    <table class="min-w-full border-collapse">
      <thead>
        <tr>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            {{ t('inviteTable.guest') }}
          </th>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            {{ t('inviteTable.inviteCode') }}
          </th>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            {{ t('inviteTable.status') }}
          </th>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            {{ t('inviteTable.actions') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="invite in invites"
          :key="invite.id"
          class="border-b border-primary/10"
        >
          <td class="px-3 py-2">
            <div class="flex flex-col gap-1">
              <span class="flex items-center gap-1.5">
                {{ invite.guest_name }}
                <span
                  v-if="invite.greeting_text"
                  class="inline-flex"
                  @mouseenter="openGreeting(invite, $event)"
                  @mouseleave="openGreetingId = null"
                >
                  <button
                    type="button"
                    class="text-primary/60 hover:text-accent cursor-pointer"
                    :aria-label="t('inviteTable.greetingText')"
                    :aria-expanded="openGreetingId === invite.id"
                    data-testid="greeting-toggle"
                    @click="openGreeting(invite, $event)"
                    @blur="openGreetingId = null"
                    @keydown.esc="openGreetingId = null"
                  >
                    <IconChat class="w-4 h-4" />
                  </button>
                  <Teleport to="body">
                    <span
                      v-if="openGreetingId === invite.id"
                      role="tooltip"
                      class="fixed z-50 w-64 max-w-[80vw] rounded border border-primary/20 bg-secondary text-primary p-3 text-sm shadow-lg whitespace-pre-line"
                      :style="{ top: `${greetingPos.top}px`, left: `${greetingPos.left}px` }"
                      data-testid="greeting-popover"
                    >{{ invite.greeting_text }}</span>
                  </Teleport>
                </span>
              </span>
              <span
                v-for="guest in invite.guests"
                :key="guest.id"
              >{{ guest.name }}</span>
            </div>
          </td>
          <td class="px-3 py-2 font-mono text-sm">
            {{ invite.invite_code }}
          </td>
          <td class="px-3 py-2">
            <div class="flex flex-col gap-1">
              <span>{{ partyExpired ? t('inviteTable.expired') : statusLabel(invite.status) }}</span>
              <span
                v-for="guest in invite.guests"
                :key="guest.id"
              >{{ partyExpired ? t('inviteTable.expired') : statusLabel(guest.status) }}</span>
            </div>
          </td>
          <td class="px-3 py-2 flex gap-3 items-center">
            <button
              type="button"
              class="flex items-center gap-1 underline text-sm hover:text-accent cursor-pointer"
              @click="copyGuestUrl(invite)"
            >
              <IconCheck
                v-if="copiedInviteId === invite.id"
                class="w-3.5 h-3.5"
              />
              <IconCopy
                v-else
                class="w-3.5 h-3.5"
              />
              {{ copiedInviteId === invite.id ? t('inviteTable.copied') : t('inviteTable.copyLink') }}
            </button>
            <router-link
              :to="{ path: `/parties/${invite.party_id}/preview`, query: { invite: invite.id } }"
              class="underline text-sm hover:text-accent"
            >
              {{ t('inviteTable.preview') }}
            </router-link>
            <button
              type="button"
              class="underline text-sm hover:text-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline disabled:hover:text-inherit"
              :disabled="disabled"
              :title="disabled ? t('demoMode.disabledHint') : undefined"
              @click="$emit('edit', invite)"
            >
              {{ t('inviteTable.edit') }}
            </button>
            <button
              type="button"
              class="underline text-sm text-red-400 hover:text-red-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline disabled:hover:text-red-400"
              :disabled="disabled"
              :title="disabled ? t('demoMode.disabledHint') : undefined"
              @click="$emit('delete', invite.id)"
            >
              {{ t('inviteTable.delete') }}
            </button>
          </td>
        </tr>
        <tr v-if="invites.length === 0">
          <td
            colspan="4"
            class="px-3 py-6 text-center text-primary/60"
          >
            {{ t('inviteTable.empty') }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
