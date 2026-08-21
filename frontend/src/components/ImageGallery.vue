<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { apiClient } from '../api/client';

const props = defineProps({
  partyId: { type: String, required: true },
  // Disables upload/delete (e.g. MODE=demo, see stores/hostAuth.js).
  disabled: { type: Boolean, default: false },
});

const { t } = useI18n();

const images = ref([]);
const errorMessage = ref('');
const isUploading = ref(false);
const fileInput = ref(null);

async function loadImages() {
  try {
    images.value = await apiClient.get(`/parties/${props.partyId}/images`);
  } catch {
    errorMessage.value = t('imageGallery.errorLoad');
  }
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  errorMessage.value = '';
  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('image', file);
    await apiClient.post(`/parties/${props.partyId}/images`, formData);
    await loadImages();
  } catch {
    errorMessage.value = t('imageGallery.errorUpload');
  } finally {
    isUploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

async function handleDelete(imageId) {
  errorMessage.value = '';
  try {
    await apiClient.delete(`/parties/${props.partyId}/images/${imageId}`);
    await loadImages();
  } catch {
    errorMessage.value = t('imageGallery.errorDelete');
  }
}

onMounted(loadImages);
</script>

<template>
  <div class="flex flex-col gap-4">
    <h2 class="text-lg font-semibold">
      {{ t('imageGallery.title') }}
    </h2>

    <p
      v-if="errorMessage"
      class="text-red-400 text-sm"
    >
      {{ errorMessage }}
    </p>

    <div class="flex flex-wrap gap-3">
      <div
        v-for="image in images"
        :key="image.id"
        class="relative w-28 h-28"
      >
        <img
          :src="`/api/images/${image.id}/file`"
          :alt="image.filename"
          class="w-full h-full object-cover rounded"
        >
        <button
          type="button"
          class="absolute top-1 right-1 bg-red-600 text-white rounded-full h-6 w-6 text-xs leading-none hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :aria-label="t('imageGallery.deleteImage')"
          :disabled="disabled"
          :title="disabled ? t('demoMode.disabledHint') : undefined"
          @click="handleDelete(image.id)"
        >
          &times;
        </button>
      </div>
      <p
        v-if="images.length === 0"
        class="text-primary/70 text-sm"
      >
        {{ t('imageGallery.empty') }}
      </p>
    </div>

    <label class="self-start">
      <span class="sr-only">{{ t('imageGallery.uploadImage') }}</span>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        :disabled="isUploading || disabled"
        :title="disabled ? t('demoMode.disabledHint') : undefined"
        @change="handleFileChange"
      >
    </label>
  </div>
</template>
