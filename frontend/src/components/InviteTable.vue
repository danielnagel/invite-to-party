<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import IconCopy from './icons/IconCopy.vue';
import IconCheck from './icons/IconCheck.vue';

const props = defineProps({
  invites: { type: Array, default: () => [] },
  partyExpired: { type: Boolean, default: false },
  partySlug: { type: String, default: '' },
});

defineEmits(['edit', 'delete']);

const { t } = useI18n();

const copiedInviteId = ref(null);
let copiedTimeout = null;

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
              <span>{{ invite.guest_name }}</span>
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
            <button
              type="button"
              class="underline text-sm hover:text-accent cursor-pointer"
              @click="$emit('edit', invite)"
            >
              {{ t('inviteTable.edit') }}
            </button>
            <button
              type="button"
              class="underline text-sm text-red-400 hover:text-red-300 cursor-pointer"
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
