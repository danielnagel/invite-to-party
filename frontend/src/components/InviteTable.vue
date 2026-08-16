<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  invites: { type: Array, default: () => [] },
  partyExpired: { type: Boolean, default: false },
});

defineEmits(['edit', 'delete']);

const { t } = useI18n();

function statusLabel(status) {
  return t(`inviteStatus.${status}`);
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
            {{ t('inviteTable.companion') }}
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
            {{ invite.guest_name }}
          </td>
          <td class="px-3 py-2 font-mono text-sm">
            {{ invite.invite_code }}
          </td>
          <td class="px-3 py-2">
            {{ partyExpired ? t('inviteTable.expired') : statusLabel(invite.status) }}
          </td>
          <td class="px-3 py-2">
            {{ invite.allow_companion ? (invite.companion_response ? t('inviteTable.yes') : t('inviteTable.no')) : '-' }}
          </td>
          <td class="px-3 py-2 flex gap-3">
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
            colspan="5"
            class="px-3 py-6 text-center text-primary/60"
          >
            {{ t('inviteTable.empty') }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
