<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: [String, Number, Boolean], default: '' },
  type: { type: String, default: 'text' },
  required: { type: Boolean, default: false },
  pattern: { type: String, default: undefined },
  hint: { type: String, default: undefined },
});

defineEmits(['update:modelValue']);
</script>

<template>
  <div
    v-if="type === 'checkbox'"
    class="flex items-center gap-2"
  >
    <input
      :id="id"
      type="checkbox"
      :checked="modelValue"
      class="h-4 w-4"
      @change="$emit('update:modelValue', $event.target.checked)"
    >
    <label
      :for="id"
      class="text-sm font-medium"
    >{{ label }}</label>
  </div>
  <div
    v-else
    class="flex flex-col gap-1"
  >
    <label
      :for="id"
      class="text-sm font-medium"
    >
      {{ label }}<span
        v-if="required"
        class="text-accent"
      > *</span>
    </label>
    <textarea
      v-if="type === 'textarea'"
      :id="id"
      :required="required"
      :value="modelValue"
      rows="4"
      class="bg-secondary text-primary border border-primary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <input
      v-else
      :id="id"
      :type="type"
      :required="required"
      :pattern="pattern"
      :value="modelValue"
      class="bg-secondary text-primary border border-primary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <span
      v-if="hint"
      class="text-xs text-primary/60"
    >{{ hint }}</span>
  </div>
</template>
