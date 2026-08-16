<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
});

defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click.self="$emit('cancel')"
  >
    <div class="bg-secondary text-primary rounded-lg p-6 w-full max-w-sm flex flex-col gap-4">
      <h2 class="text-lg font-semibold">
        {{ props.title || t('confirmDialog.defaultTitle') }}
      </h2>
      <p class="text-sm">
        {{ props.message || t('confirmDialog.defaultMessage') }}
      </p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2 rounded border border-primary/30 hover:bg-primary/10 cursor-pointer"
          @click="$emit('cancel')"
        >
          {{ t('confirmDialog.cancel') }}
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer"
          @click="$emit('confirm')"
        >
          {{ t('confirmDialog.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
