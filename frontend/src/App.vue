<script setup>
import BackgroundLayer from './components/BackgroundLayer.vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import ToastContainer from './components/ToastContainer.vue';
</script>

<template>
  <BackgroundLayer />
  <!-- overflow-x-clip: the page itself must never scroll sideways on mobile
       (only inner containers like InviteTable's overflow-x-auto may). clip
       instead of hidden so this doesn't become a scroll container itself. -->
  <div class="min-h-screen flex flex-col overflow-x-clip">
    <AppHeader />
    <router-view class="flex-1" />
    <AppFooter />
  </div>
  <ToastContainer />
</template>
