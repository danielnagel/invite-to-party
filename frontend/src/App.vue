<script setup>
import BackgroundLayer from './components/BackgroundLayer.vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
</script>

<template>
  <BackgroundLayer />
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <router-view class="flex-1" />
    <AppFooter />
  </div>
</template>
