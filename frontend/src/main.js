import './style.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import i18n from './i18n';

// Older iOS Safari ignores both user-scalable=no and touch-action for pinch
// gestures - its proprietary gesture events are the only way to stop zooming.
document.addEventListener('gesturestart', (event) => event.preventDefault());

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

app.mount('#app');
