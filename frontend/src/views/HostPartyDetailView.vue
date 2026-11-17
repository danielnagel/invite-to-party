<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { apiClient } from '../api/client';
import { useHostAuthStore } from '../stores/hostAuth';
import { useToastStore } from '../stores/toast';
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
const toast = useToastStore();

// Stable reference for InviteForm's :initial-data fallback below. A fresh
// `{}` literal there would get a new identity on every re-render of this
// component (e.g. whenever `party` is reassigned after saving party
// settings), which would make InviteForm's initialData watcher fire and
// wipe out whatever the host had already typed into the invite form.
const EMPTY_INVITE = {};

const party = ref(null);
const invites = ref([]);
// Only for load failures (the page can't be used without the data); action
// results (save/delete) are reported as toasts, see stores/toast.js.
const errorMessage = ref('');
const isSavingParty = ref(false);
const isSavingInvite = ref(false);
const isDeleting = ref(false);
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
  isSavingParty.value = true;
  try {
    party.value = await apiClient.put(`/parties/${partyId}`, data);
    toast.success(t('hostPartyDetail.partySaved'));
  } catch (error) {
    toast.error(error.status === 409 ? t('partyForm.errorSlugTaken') : t('hostPartyDetail.errorSaveParty'));
  } finally {
    isSavingParty.value = false;
  }
}

async function handleInviteSubmit(data) {
  isSavingInvite.value = true;
  try {
    if (editingInvite.value) {
      await apiClient.put(`/invites/${editingInvite.value.id}`, data);
      editingInvite.value = null;
      toast.success(t('hostPartyDetail.inviteSaved'));
    } else {
      await apiClient.post(`/parties/${partyId}/invites`, data);
      newInviteFormKey.value += 1;
      toast.success(t('hostPartyDetail.inviteCreated'));
    }
    await loadInvites();
  } catch {
    toast.error(t('hostPartyDetail.errorSaveInvite'));
  } finally {
    isSavingInvite.value = false;
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
  isDeleting.value = true;
  try {
    await apiClient.delete(`/invites/${deleteInviteTarget.value}`);
    deleteInviteTarget.value = null;
    toast.success(t('hostPartyDetail.inviteDeleted'));
    await loadInvites();
  } catch {
    deleteInviteTarget.value = null;
    toast.error(t('hostPartyDetail.errorDeleteInvite'));
  } finally {
    isDeleting.value = false;
  }
}

async function confirmDeleteParty() {
  isDeleting.value = true;
  try {
    await apiClient.delete(`/parties/${partyId}`);
    // The toast store is global, so this message survives the navigation.
    toast.success(t('hostPartyDetail.partyDeleted'));
    router.push('/parties');
  } catch {
    showDeleteParty.value = false;
    toast.error(t('hostPartyDetail.errorDeleteParty'));
  } finally {
    isDeleting.value = false;
  }
}

onMounted(() => {
  loadParty();
  loadInvites();
});
</script>

<template>
  <main class="flex flex-col gap-8 px-4 py-8 max-w-3xl mx-auto w-full">
    <div class="flex items-center justify-between bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3">
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
      class="bg-black/80 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-4"
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
        :busy="isSavingParty"
        @submit="handlePartySubmit"
      />
    </section>

    <section
      v-if="party"
      class="bg-black/80 backdrop-blur-sm rounded-lg p-6"
    >
      <ImageGallery
        :party-id="partyId"
        :disabled="hostAuth.demoMode"
      />
    </section>

    <section class="bg-black/80 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-6">
      <h2 class="text-lg font-semibold">
        {{ editingInvite ? t('hostPartyDetail.editInvite') : t('hostPartyDetail.addInvite') }}
      </h2>
      <InviteForm
        :key="editingInvite?.id ?? `new-${newInviteFormKey}`"
        :initial-data="editingInvite ?? EMPTY_INVITE"
        :is-edit-mode="!!editingInvite"
        :disabled="hostAuth.demoMode"
        :busy="isSavingInvite"
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
      :busy="isDeleting"
      @confirm="confirmDeleteInvite"
      @cancel="deleteInviteTarget = null"
    />

    <ConfirmDialog
      :open="showDeleteParty"
      :title="t('hostPartyDetail.deletePartyTitle')"
      :message="t('hostPartyDetail.deletePartyMessage')"
      :busy="isDeleting"
      @confirm="confirmDeleteParty"
      @cancel="showDeleteParty = false"
    />
  </main>
</template>
