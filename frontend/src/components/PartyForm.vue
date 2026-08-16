<script setup>
import { reactive, watch } from 'vue';

import FormField from './FormField.vue';
import IconPlus from './icons/IconPlus.vue';
import IconSave from './icons/IconSave.vue';

const props = defineProps({
  initialData: { type: Object, default: () => ({}) },
  isEditMode: { type: Boolean, default: false },
});

const emit = defineEmits(['submit']);

function emptyForm() {
  return {
    name: '',
    slug: '',
    event_date: '',
    accept_label: 'Yes, I will be there',
    decline_label: "No, I can't make it",
    companion_field_label: 'Bringing a plus one?',
    companion_field_visible: false,
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
      id="name"
      v-model="form.name"
      label="Name"
      required
    />
    <!-- Pattern mirrors the backend's SLUG_PATTERN (see
         backend/src/routes/parties.js) - lowercase, digits, single hyphens. -->
    <FormField
      id="slug"
      v-model="form.slug"
      label="Slug"
      pattern="[a-z0-9]+(-[a-z0-9]+)*"
      hint="Vanity URL, e.g. 'wedding'. Lowercase letters, digits and hyphens only."
      required
    />
    <FormField
      id="event_date"
      v-model="form.event_date"
      label="Event date"
      type="date"
      required
    />
    <FormField
      id="accept_label"
      v-model="form.accept_label"
      label="Accept label"
    />
    <FormField
      id="decline_label"
      v-model="form.decline_label"
      label="Decline label"
    />
    <FormField
      id="companion_field_label"
      v-model="form.companion_field_label"
      label="Companion field label"
    />
    <FormField
      id="companion_field_visible"
      v-model="form.companion_field_visible"
      label="Companion field visible"
      type="checkbox"
    />

    <button
      type="submit"
      class="flex items-center gap-2 bg-accent text-primary rounded px-4 py-2 self-start hover:bg-accent/90 cursor-pointer"
    >
      <IconSave
        v-if="isEditMode"
        class="w-4 h-4"
      />
      <IconPlus
        v-else
        class="w-4 h-4"
      />
      {{ isEditMode ? 'Save' : 'Create party' }}
    </button>
  </form>
</template>
