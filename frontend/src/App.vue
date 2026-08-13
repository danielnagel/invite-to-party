<script setup>
import BackgroundLayer from './components/BackgroundLayer.vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
</script>

<template>
  <BackgroundLayer />
  <AppHeader />
  <router-view />
  <AppFooter />
</template>
