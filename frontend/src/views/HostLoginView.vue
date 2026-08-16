<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { useHostAuthStore } from '../stores/hostAuth';
import FormField from '../components/FormField.vue';

const hostAuth = useHostAuthStore();
const router = useRouter();
const { t } = useI18n();

const form = reactive({
  username: '',
  password: '',
});

const errorMessage = ref('');
const isSubmitting = ref(false);

async function handleSubmit() {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await hostAuth.login(form.username, form.password);
    router.push('/invite/parties');
  } catch {
    errorMessage.value = t('hostLogin.error');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="flex flex-col items-center justify-center px-4 py-10">
    <div class="w-full max-w-sm bg-black/60 rounded-lg p-6">
      <h1 class="text-2xl font-semibold mb-6">
        {{ t('hostLogin.title') }}
      </h1>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="handleSubmit"
      >
        <FormField
          id="username"
          v-model="form.username"
          :label="t('hostLogin.username')"
          type="text"
          required
        />
        <FormField
          id="password"
          v-model="form.password"
          :label="t('hostLogin.password')"
          type="password"
          required
        />

        <p
          v-if="errorMessage"
          class="text-red-400 text-sm"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="bg-primary text-secondary rounded px-4 py-2 hover:bg-primary/90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          :disabled="isSubmitting"
        >
          {{ t('hostLogin.submit') }}
        </button>
      </form>
    </div>
  </main>
</template>
