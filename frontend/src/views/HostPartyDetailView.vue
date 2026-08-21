<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { apiClient } from '../api/client';
import { useHostAuthStore } from '../stores/hostAuth';
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
const { t } = useI18n();
const hostAuth = useHostAuthStore();

// Stable reference for InviteForm's :initial-data fallback below. A fresh
// `{}` literal there would get a new identity on every re-render of this
// component (e.g. whenever `party` is reassigned after saving party
// settings), which would make InviteForm's initialData watcher fire and
// wipe out whatever the host had already typed into the invite form.
const EMPTY_INVITE = {};

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
    errorMessage.value = t('hostPartyDetail.errorLoadParty');
  }
}

async function loadInvites() {
  try {
    invites.value = await apiClient.get(`/parties/${partyId}/invites`);
  } catch {
    errorMessage.value = t('hostPartyDetail.errorLoadInvites');
  }
}

async function handlePartySubmit(data) {
  errorMessage.value = '';
  try {
    party.value = await apiClient.put(`/parties/${partyId}`, data);
  } catch {
    errorMessage.value = t('hostPartyDetail.errorSaveParty');
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
    errorMessage.value = t('hostPartyDetail.errorSaveInvite');
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
    errorMessage.value = t('hostPartyDetail.errorDeleteInvite');
  }
}

async function confirmDeleteParty() {
  try {
    await apiClient.delete(`/parties/${partyId}`);
    router.push('/parties');
  } catch {
    errorMessage.value = t('hostPartyDetail.errorDeleteParty');
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
        to="/parties"
        class="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent hover:underline"
      >
        <IconArrowLeft class="w-4 h-4" />
        {{ t('hostPartyDetail.backToParties') }}
      </router-link>
      <router-link
        :to="`/parties/${partyId}/preview`"
        class="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent hover:underline"
      >
        {{ t('hostPartyDetail.previewGuestPage') }}
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
          class="text-sm text-red-400 underline hover:text-red-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline disabled:hover:text-red-400"
          :disabled="hostAuth.demoMode"
          :title="hostAuth.demoMode ? t('demoMode.disabledHint') : undefined"
          @click="showDeleteParty = true"
        >
          {{ t('hostPartyDetail.deleteParty') }}
        </button>
      </div>
      <PartyForm
        :initial-data="party"
        is-edit-mode
        :disabled="hostAuth.demoMode"
        @submit="handlePartySubmit"
      />
    </section>

    <section
      v-if="party"
      class="bg-black/60 rounded-lg p-6"
    >
      <ImageGallery
        :party-id="partyId"
        :disabled="hostAuth.demoMode"
      />
    </section>

    <section class="bg-black/60 rounded-lg p-6 flex flex-col gap-6">
      <h2 class="text-lg font-semibold">
        {{ editingInvite ? t('hostPartyDetail.editInvite') : t('hostPartyDetail.addInvite') }}
      </h2>
      <InviteForm
        :key="editingInvite?.id ?? `new-${newInviteFormKey}`"
        :initial-data="editingInvite ?? EMPTY_INVITE"
        :is-edit-mode="!!editingInvite"
        :disabled="hostAuth.demoMode"
        @submit="handleInviteSubmit"
        @cancel="handleCancelEditInvite"
      />

      <InviteTable
        :invites="invites"
        :party-expired="isExpired"
        :party-slug="party?.slug ?? ''"
        :disabled="hostAuth.demoMode"
        @edit="handleEditInvite"
        @delete="handleDeleteInviteRequest"
      />
    </section>

    <ConfirmDialog
      :open="!!deleteInviteTarget"
      :title="t('hostPartyDetail.deleteInviteTitle')"
      :message="t('hostPartyDetail.deleteInviteMessage')"
      @confirm="confirmDeleteInvite"
      @cancel="deleteInviteTarget = null"
    />

    <ConfirmDialog
      :open="showDeleteParty"
      :title="t('hostPartyDetail.deletePartyTitle')"
      :message="t('hostPartyDetail.deletePartyMessage')"
      @confirm="confirmDeleteParty"
      @cancel="showDeleteParty = false"
    />
  </main>
</template>
