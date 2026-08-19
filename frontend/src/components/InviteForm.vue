<script setup>
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import FormField from './FormField.vue';
import IconPlus from './icons/IconPlus.vue';
import IconSave from './icons/IconSave.vue';
import IconX from './icons/IconX.vue';

const props = defineProps({
  initialData: { type: Object, default: () => ({}) },
  isEditMode: { type: Boolean, default: false },
});

const emit = defineEmits(['submit', 'cancel']);
const { t } = useI18n();

function emptyForm() {
  return {
    guest_name: '',
    greeting_text: '',
    allow_companion: false,
    additional_guests: [],
  };
}

function toAdditionalGuests(guests) {
  return (guests ?? []).map((guest) => ({ id: guest.id, name: guest.name }));
}

const form = reactive({
  ...emptyForm(),
  ...props.initialData,
  additional_guests: toAdditionalGuests(props.initialData.guests),
});

watch(
  () => props.initialData,
  (newData) => {
    Object.assign(form, emptyForm(), newData, { additional_guests: toAdditionalGuests(newData.guests) });
  },
);

function addAdditionalGuest() {
  form.additional_guests.push({ id: null, name: '' });
}

function removeAdditionalGuest(index) {
  form.additional_guests.splice(index, 1);
}

function handleSubmit() {
  emit('submit', {
    ...form,
    additional_guests: form.additional_guests.filter((guest) => guest.name.trim()),
  });
}
</script>

<template>
  <form
    class="flex flex-col gap-4"
    @submit.prevent="handleSubmit"
  >
    <FormField
      id="guest_name"
      v-model="form.guest_name"
      :label="t('inviteForm.guestName')"
      required
    />
    <FormField
      id="greeting_text"
      v-model="form.greeting_text"
      :label="t('inviteForm.greetingText')"
      type="textarea"
    />
    <FormField
      id="allow_companion"
      v-model="form.allow_companion"
      :label="t('inviteForm.allowCompanion')"
      type="checkbox"
    />

    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">{{ t('inviteForm.additionalGuests') }}</span>
      <div
        v-for="(guest, index) in form.additional_guests"
        :key="index"
        class="flex items-center gap-2"
      >
        <input
          v-model="guest.name"
          type="text"
          :aria-label="t('inviteForm.additionalGuestName', { position: index + 1 })"
          class="flex-1 bg-secondary text-primary border border-primary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        >
        <button
          type="button"
          :aria-label="t('inviteForm.removeGuest')"
          class="p-2 rounded hover:bg-primary/10 cursor-pointer"
          @click="removeAdditionalGuest(index)"
        >
          <IconX class="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 self-start text-sm underline hover:text-accent cursor-pointer"
        @click="addAdditionalGuest"
      >
        <IconPlus class="w-3.5 h-3.5" />
        {{ t('inviteForm.addAdditionalGuest') }}
      </button>
    </div>

    <div class="flex gap-3">
      <button
        type="submit"
        class="flex items-center gap-2 bg-accent text-primary rounded px-4 py-2 hover:bg-accent/90 cursor-pointer"
      >
        <IconSave
          v-if="isEditMode"
          class="w-4 h-4"
        />
        <IconPlus
          v-else
          class="w-4 h-4"
        />
        {{ isEditMode ? t('inviteForm.save') : t('inviteForm.add') }}
      </button>
      <button
        v-if="isEditMode"
        type="button"
        class="rounded px-4 py-2 border border-primary/30 hover:bg-primary/10 cursor-pointer"
        @click="$emit('cancel')"
      >
        {{ t('inviteForm.cancel') }}
      </button>
    </div>
  </form>
</template>
