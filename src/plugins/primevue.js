import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';


export default {
  install(app) {
    app.use(PrimeVue, {
      ripple: true,
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark-mode',
          // darkModeSelector: '.my-app-dark', // original
          cssLayer: {
            name: 'primevue',
            order: 'theme, base, primevue'
          }
        }
      }
    });
  }
};