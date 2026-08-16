<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useHostAuthStore } from '../stores/hostAuth';
import FormField from '../components/FormField.vue';

const hostAuth = useHostAuthStore();
const router = useRouter();

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
    errorMessage.value = 'Login failed. Please check your credentials.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="flex flex-col items-center justify-center px-4 py-10">
    <div class="w-full max-w-sm bg-black/60 rounded-lg p-6">
      <h1 class="text-2xl font-semibold mb-6">
        Host login
      </h1>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="handleSubmit"
      >
        <FormField
          id="username"
          v-model="form.username"
          label="Username"
          type="text"
          required
        />
        <FormField
          id="password"
          v-model="form.password"
          label="Password"
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
          class="bg-primary text-secondary rounded px-4 py-2 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          Log in
        </button>
      </form>
    </div>
  </main>
</template>
