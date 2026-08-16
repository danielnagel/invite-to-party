<script setup>
import { useI18n } from 'vue-i18n';

import { SUPPORTED_LOCALES, setLocale } from '../i18n';

const { t, locale } = useI18n();
</script>

<template>
  <div class="relative inline-flex items-center">
    <select
      :value="locale"
      :aria-label="t('app.language')"
      class="appearance-none bg-transparent text-xs text-primary/60 hover:underline cursor-pointer pr-4 focus:outline-none"
      @change="setLocale($event.target.value)"
    >
      <option
        v-for="code in SUPPORTED_LOCALES"
        :key="code"
        :value="code"
      >
        {{ code }}
      </option>
    </select>
    <svg
      class="pointer-events-none absolute right-0 h-3 w-3"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>
