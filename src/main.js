import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'

import './assets/css/tailwind.css'
import './assets/css/customs.css'
import "@fortawesome/fontawesome-free/css/all.css";

import PrimeVue from './plugins/primevue';
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice';

import ElementPlus, { ElMessage } from 'element-plus' 
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'

import AOS from 'aos'
import 'aos/dist/aos.css'


// Create the app
const app = createApp(App)

// Create pinia and use it
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)

// Use other plugins
app.use(router)
app.use(PrimeVue)
app.use(ConfirmationService)
app.use(ToastService)
app.use(ElementPlus)

// Initialize AOS
app.AOS = AOS.init({
  duration: 800,
  easing: 'ease-in-out-quad'
})

// IMPORTANT: Initialize theme after pinia is registered but before mounting
// We need to import the store and initialize it
import { useThemeStore } from './stores/theme'

// Initialize theme
const themeStore = useThemeStore()
themeStore.initializeTheme()

// Mount the app
app.mount('#app')