<!-- Location: auth.fansmeed.com/src/App.vue -->
<template>
    <NavigationalLoader>
        <SiteStatusGuard 
            @status-checked="onStatusChecked" 
            @error="onSiteStatusError"
        >
            <div class="app-case">
                <n-config-provider :theme="currentNaiveTheme">
                    <n-message-provider>
                        <n-loading-bar-provider>
                            <n-notification-provider>
                                <div class="app bg-background text-text full-height">
                                    <router-view />
                                </div>
                            </n-notification-provider>
                        </n-loading-bar-provider>
                    </n-message-provider>
                </n-config-provider>
            </div>
        </SiteStatusGuard>
    </NavigationalLoader>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/authStore'
import { darkTheme } from 'naive-ui'

const themeStore = useThemeStore()
const authStore = useAuthStore()

const currentNaiveTheme = computed(() => {
    return themeStore.isDark ? darkTheme : null
})

const onStatusChecked = (status) => {
    console.log('✅ Site status checked:', status)
}

const onSiteStatusError = (error) => {
    console.error('❌ Site status error:', error)
}

// Initialize auth store on app start
onMounted(async () => {
    console.log('🚀 Auth app starting...')
    
    // Initialize theme
    themeStore.initializeTheme()
    
    // Initialize auth
    await authStore.initialize().catch(error => {
        console.error('Auth initialization error:', error)
    })
})
</script>

<style lang="scss">
@use './assets/css/global.scss';

.app-case {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
}

.app {
    flex: 1;
    overflow: auto;
    position: relative;
    margin-top: 0;
    min-height: 100dvh;
}

.full-height {
    height: 100vh;
}
</style>