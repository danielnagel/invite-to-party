<script setup>
import { statusLabel } from '../constants/inviteStatus';

defineProps({
  invites: { type: Array, default: () => [] },
  partyExpired: { type: Boolean, default: false },
});

defineEmits(['edit', 'delete']);
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full border-collapse">
      <thead>
        <tr>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            Guest
          </th>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            Invite code
          </th>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            Status
          </th>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            Companion
          </th>
          <th class="text-left border-b border-primary/20 px-3 py-2">
            Actions
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
            {{ partyExpired ? 'Expired' : statusLabel(invite.status) }}
          </td>
          <td class="px-3 py-2">
            {{ invite.allow_companion ? (invite.companion_response ? 'Yes' : 'No') : '-' }}
          </td>
          <td class="px-3 py-2 flex gap-3">
            <button
              type="button"
              class="underline text-sm hover:text-accent cursor-pointer"
              @click="$emit('edit', invite)"
            >
              Edit
            </button>
            <button
              type="button"
              class="underline text-sm text-red-400 hover:text-red-300 cursor-pointer"
              @click="$emit('delete', invite.id)"
            >
              Delete
            </button>
          </td>
        </tr>
        <tr v-if="invites.length === 0">
          <td
            colspan="5"
            class="px-3 py-6 text-center text-primary/60"
          >
            No invites yet.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
