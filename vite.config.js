import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'


import tailwindcss from '@tailwindcss/vite'
import webfontDownload from 'vite-plugin-webfont-dl';



// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 3002,
    watch: {
      ignored: ['**/*.md']
    }
  },
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': [
            'useDialog',
            'useMessage',
            'useNotification',
            'useLoadingBar',
          ],
        },
      ],
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [
        PrimeVueResolver(),
        NaiveUiResolver(),
        ElementPlusResolver(),
      ],
    }),
    webfontDownload([
      'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap'
    ], {
      timeout: 10000,
      cache: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
