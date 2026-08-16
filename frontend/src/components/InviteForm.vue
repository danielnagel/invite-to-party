<script setup>
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import FormField from './FormField.vue';
import IconPlus from './icons/IconPlus.vue';
import IconSave from './icons/IconSave.vue';

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
  };
}

const form = reactive({ ...emptyForm(), ...props.initialData });

watch(
  () => props.initialData,
  (newData) => {
    Object.assign(form, emptyForm(), newData);
  },
);

function handleSubmit() {
  emit('submit', { ...form });
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
