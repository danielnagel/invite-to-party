<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { apiClient } from '../api/client';
import PartyForm from '../components/PartyForm.vue';
import ImageGallery from '../components/ImageGallery.vue';
import InviteForm from '../components/InviteForm.vue';
import InviteTable from '../components/InviteTable.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import IconArrowLeft from '../components/icons/IconArrowLeft.vue';
import IconArrowRight from '../components/icons/IconArrowRight.vue';

const route = useRoute();
const router = useRouter();
const partyId = route.params.id;

const party = ref(null);
const invites = ref([]);
const errorMessage = ref('');
const editingInvite = ref(null);
const deleteInviteTarget = ref(null);
const showDeleteParty = ref(false);
// Forces InviteForm to remount with a blank form after each successful
// create (editingInvite stays null across successive creates, so its :key
// alone wouldn't change).
const newInviteFormKey = ref(0);

const isExpired = computed(() => {
  if (!party.value) return false;
  return new Date(party.value.event_date) < new Date();
});

async function loadParty() {
  try {
    party.value = await apiClient.get(`/parties/${partyId}`);
  } catch {
    errorMessage.value = 'Could not load this party.';
  }
}

async function loadInvites() {
  try {
    invites.value = await apiClient.get(`/parties/${partyId}/invites`);
  } catch {
    errorMessage.value = 'Could not load invites.';
  }
}

async function handlePartySubmit(data) {
  errorMessage.value = '';
  try {
    party.value = await apiClient.put(`/parties/${partyId}`, data);
  } catch {
    errorMessage.value = 'Could not save the party settings.';
  }
}

async function handleInviteSubmit(data) {
  errorMessage.value = '';
  try {
    if (editingInvite.value) {
      await apiClient.put(`/invites/${editingInvite.value.id}`, data);
      editingInvite.value = null;
    } else {
      await apiClient.post(`/parties/${partyId}/invites`, data);
      newInviteFormKey.value += 1;
    }
    await loadInvites();
  } catch {
    errorMessage.value = 'Could not save the invite.';
  }
}

function handleEditInvite(invite) {
  editingInvite.value = invite;
}

function handleCancelEditInvite() {
  editingInvite.value = null;
}

function handleDeleteInviteRequest(id) {
  deleteInviteTarget.value = id;
}

async function confirmDeleteInvite() {
  if (!deleteInviteTarget.value) return;
  try {
    await apiClient.delete(`/invites/${deleteInviteTarget.value}`);
    deleteInviteTarget.value = null;
    await loadInvites();
  } catch {
    errorMessage.value = 'Could not delete the invite.';
  }
}

async function confirmDeleteParty() {
  try {
    await apiClient.delete(`/parties/${partyId}`);
    router.push('/invite/parties');
  } catch {
    errorMessage.value = 'Could not delete this party.';
  }
}

onMounted(() => {
  loadParty();
  loadInvites();
});
</script>

<template>
  <main class="flex flex-col gap-8 px-4 py-8 max-w-3xl mx-auto w-full">
    <div class="flex items-center justify-between bg-black/60 rounded-lg px-4 py-3">
      <router-link
        to="/invite/parties"
        class="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent hover:underline"
      >
        <IconArrowLeft class="w-4 h-4" />
        Back to parties
      </router-link>
      <router-link
        :to="`/invite/parties/${partyId}/preview`"
        class="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent hover:underline"
      >
        Preview guest page
        <IconArrowRight class="w-4 h-4" />
      </router-link>
    </div>

    <p
      v-if="errorMessage"
      class="text-red-400 text-sm"
    >
      {{ errorMessage }}
    </p>

    <section
      v-if="party"
      class="bg-black/60 rounded-lg p-6 flex flex-col gap-4"
    >
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">
          {{ party.name }}
        </h1>
        <button
          type="button"
          class="text-sm text-red-400 underline hover:text-red-300 cursor-pointer"
          @click="showDeleteParty = true"
        >
          Delete party
        </button>
      </div>
      <PartyForm
        :initial-data="party"
        is-edit-mode
        @submit="handlePartySubmit"
      />
    </section>

    <section
      v-if="party"
      class="bg-black/60 rounded-lg p-6"
    >
      <ImageGallery :party-id="partyId" />
    </section>

    <section class="bg-black/60 rounded-lg p-6 flex flex-col gap-6">
      <h2 class="text-lg font-semibold">
        {{ editingInvite ? 'Edit invite' : 'Add invite' }}
      </h2>
      <InviteForm
        :key="editingInvite?.id ?? `new-${newInviteFormKey}`"
        :initial-data="editingInvite ?? {}"
        :is-edit-mode="!!editingInvite"
        @submit="handleInviteSubmit"
        @cancel="handleCancelEditInvite"
      />

      <InviteTable
        :invites="invites"
        :party-expired="isExpired"
        @edit="handleEditInvite"
        @delete="handleDeleteInviteRequest"
      />
    </section>

    <ConfirmDialog
      :open="!!deleteInviteTarget"
      title="Delete invite?"
      message="This guest's invite code will stop working immediately."
      @confirm="confirmDeleteInvite"
      @cancel="deleteInviteTarget = null"
    />

    <ConfirmDialog
      :open="showDeleteParty"
      title="Delete party?"
      message="This deletes the party, all its invites and uploaded images."
      @confirm="confirmDeleteParty"
      @cancel="showDeleteParty = false"
    />
  </main>
</template>
