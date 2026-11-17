<script setup>
import { useI18n } from 'vue-i18n';

import { useToastStore } from '../stores/toast';
import IconCheck from './icons/IconCheck.vue';
import IconX from './icons/IconX.vue';

const toast = useToastStore();
const { t } = useI18n();
</script>

<template>
  <!-- pointer-events-none on the wrapper so the (invisible) full-width strip
       never blocks clicks on the page underneath; only the toasts react. -->
  <div
    class="fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0"
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-200"
    >
      <div
        v-for="item in toast.toasts"
        :key="item.id"
        :role="item.type === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex items-center gap-3 w-full max-w-sm rounded-lg px-4 py-3 shadow-lg backdrop-blur-sm text-sm text-white"
        :class="item.type === 'error' ? 'bg-red-700/95' : 'bg-green-700/95'"
      >
        <IconCheck
          v-if="item.type === 'success'"
          class="w-4 h-4 shrink-0"
        />
        <span class="flex-1">{{ item.message }}</span>
        <button
          type="button"
          class="p-1 rounded hover:bg-white/20 cursor-pointer"
          :aria-label="t('toast.dismiss')"
          @click="toast.dismiss(item.id)"
        >
          <IconX class="w-3.5 h-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
