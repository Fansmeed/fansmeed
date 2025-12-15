<!-- App.vue -->
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
                                <Navigation v-if="navigationStore.isVisible && showNavigation" :isScrolled="isScrolled" />
                                <div class="app bg-background text-text" :class="{ 'full-height': !navigationStore.isVisible }">
                                    <router-view />
                                </div>
                                <Footer v-if="navigationStore.isVisible && showNavigation" />
                            </n-notification-provider>
                        </n-loading-bar-provider>
                    </n-message-provider>
                </n-config-provider>
            </div>
        </SiteStatusGuard>
    </NavigationalLoader>
</template>

<script>
import { useNavigationStore } from '@/stores/navigation'
import { useThemeStore } from '@/stores/theme'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute } from 'vue-router'
import { darkTheme } from 'naive-ui'

export default {
    name: 'App',
    
    setup() {
        const navigationStore = useNavigationStore()
        const themeStore = useThemeStore()
        const route = useRoute()
        
        const isScrolled = ref(false)
        const lastScrollY = ref(0)

        const currentNaiveTheme = computed(() => {
            return themeStore.isDark ? darkTheme : null
        })

        const SCROLL_THRESHOLD = 600

        const showNavigation = computed(() => {
            return !route.path.startsWith('/auth')
        })

        const onStatusChecked = (status) => {
            console.log('Site status checked:', status)
        }

        const onSiteStatusError = (error) => {
            console.error('Site status error:', error)
        }

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > SCROLL_THRESHOLD) {
                if (!isScrolled.value) {
                    isScrolled.value = true;
                }
            } else if (currentScrollY < 50) {
                if (isScrolled.value) {
                    isScrolled.value = false;
                }
            }

            lastScrollY.value = currentScrollY;
        };

        onMounted(() => {
            window.addEventListener('scroll', handleScroll, { passive: true });
        });

        onBeforeUnmount(() => {
            window.removeEventListener('scroll', handleScroll);
        });

        return {
            navigationStore,
            isScrolled,
            showNavigation,
            currentNaiveTheme,
            onStatusChecked,
            onSiteStatusError
        }
    }
}
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
</style>