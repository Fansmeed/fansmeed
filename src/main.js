// Location: auth.fansmeed.com/src/main.js
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

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import AOS from 'aos'
import 'aos/dist/aos.css'

import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'

// Create the app
const app = createApp(App)

// Create pinia and use it
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// Initialize theme before router
import { useThemeStore } from './stores/theme'
const themeStore = useThemeStore()
themeStore.initializeTheme()
console.log('✅ Theme initialized')

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

console.log('✅ All plugins initialized')

// Mount the app
app.mount('#app')
console.log('✅ App mounted successfully')