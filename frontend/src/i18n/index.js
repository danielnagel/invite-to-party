import { createI18n } from 'vue-i18n';

import en from './locales/en.json';
import de from './locales/de.json';

export const SUPPORTED_LOCALES = ['en', 'de'];
const DEFAULT_LOCALE = 'en';
const STORAGE_KEY = 'locale';

function resolveInitialLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (SUPPORTED_LOCALES.includes(stored)) return stored;

  // Baked in at image build time from the DEFAULT_LOCALE env var, see
  // docker-compose.yml / frontend/Dockerfile.
  const buildTimeLocale = import.meta.env.VITE_DEFAULT_LOCALE;
  if (SUPPORTED_LOCALES.includes(buildTimeLocale)) return buildTimeLocale;

  return DEFAULT_LOCALE;
}

const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, de },
});

document.documentElement.lang = i18n.global.locale.value;

export function setLocale(code) {
  if (!SUPPORTED_LOCALES.includes(code)) return;
  i18n.global.locale.value = code;
  localStorage.setItem(STORAGE_KEY, code);
  document.documentElement.lang = code;
}

export default i18n;
