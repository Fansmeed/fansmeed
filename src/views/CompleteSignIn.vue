<template>
    <div class="min-h-screen flex flex-col lg:flex-row">
        <div
            class="account-head lg:w-[500px] lg:min-h-screen lg:fixed lg:top-0 lg:left-0 h-70 lg:h-screen relative overflow-hidden">
            <img :src="randomImage" alt="Login Background" class="absolute inset-0 w-full h-full object-cover" />
            <!-- Dark Overlay -->
            <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

            <!-- Logo Centered Perfectly -->
            <div class="relative z-10 h-full flex items-center justify-center p-8">
                <div class="flex justify-center flex-col text-center">
                    <div class="size-16 bg-primary rounded-lg flex items-center justify-center">
                        <i class="pi pi-users text-white text-2xl"></i>
                    </div>
                    <p class="text-white/80 mt-2 text-sm lg:text-base">Connect • Play • Win</p>
                </div>
            </div>
        </div>

        <!-- Content Section -->
        <div class="items-center flex-1 lg:ml-[550px] pt-10">
            <div class="account-container max-w-4xl w-full p-5 lg:p-10">
                <!-- Loading State -->
                <div v-if="uiStore.isLoading(AUTH_OPERATIONS.COMPLETE_SIGN_IN)"
                    class="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" fill="transparent" animationDuration=".5s" aria-label="Custom ProgressSpinner" />
                    <p class="text-neutral-500 dark:text-neutral-400 mt-4">
                        Verifying your sign-in link...
                    </p>
                </div>

                <!-- Error State -->
                <div v-else-if="uiStore.getError(AUTH_OPERATIONS.COMPLETE_SIGN_IN)"
                    class="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div class="p-4 bg-red-100 dark:bg-red-900/20 mb-4 rounded-full flex">
                        <i class="pi pi-exclamation-triangle text-4xl text-red-600 dark:text-red-400"></i>
                    </div>
                    <h3 class="text-xl font-bold text-neutral-700 dark:text-neutral-300 mb-2">Error Encountered while signing in</h3>
                    <p class="text-neutral-500 dark:text-neutral-400">
                        {{ formatErrorForDisplay(uiStore.getError(AUTH_OPERATIONS.COMPLETE_SIGN_IN)) }}
                    </p>
                    <p class="text-neutral-400 dark:text-neutral-300 mt-2">
                        Please try again
                    </p>
                    <Button label="Retry" icon="pi pi-refresh" @click="handleSignIn" class="mt-4" size="small" outlined severity="info" />
                </div>

                <!-- Success State -->
                <div v-else-if="signInSuccess"
                    class="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div class="p-4 bg-green-100 dark:bg-green-900/20 mb-4 rounded-full flex">
                        <i class="pi pi-check-circle text-4xl text-green-600 dark:text-green-400"></i>
                    </div>
                    <h3 class="text-xl font-bold text-neutral-700 dark:text-neutral-300 mb-2">Sign-in Successful!</h3>
                    <p class="text-neutral-500 dark:text-neutral-400">
                        Redirecting you to the application...
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore, AUTH_OPERATIONS } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { createAuthSession } from '@/firebase/authSync'
import { getAuthIntentCookie, clearAuthIntentCookie } from '@/utils/cookieChecker'

const authStore = useAuthStore()
const uiStore = useUiStore()
const signInSuccess = ref(false)

const handleSignIn = async () => {
    try {
        const currentUrl = window.location.href;
        
        // Temporarily disable the auth store's redirect
        const originalRedirect = authStore.redirectToTargetApp;
        authStore.redirectToTargetApp = () => {
            console.log('⚠️ Auth store redirect disabled');
        };
        
        const user = await authStore.completeSignIn(currentUrl);
        
        // Restore original method
        authStore.redirectToTargetApp = originalRedirect;
        
        if (!user || !user.uid) {
            throw new Error('No user data received');
        }
        
        // Get target domain from cookie
        const cookieResult = getAuthIntentCookie();
        let targetDomain = 'fansmeed.com';
        
        if (cookieResult.valid && cookieResult.data.userRole === 'admin') {
            targetDomain = 'cp.fansmeed.com';
        }
        
        // Create session in Firestore
        const sessionId = await createAuthSession(user, targetDomain);
        
        // Build redirect URL WITH SESSION PARAMETERS
        const finalUrl = `https://${targetDomain}/?sessionId=${sessionId}&source=auth.fansmeed.com`;
        
        // Clear cookie
        clearAuthIntentCookie();
        
        console.log('✅ Redirecting to:', finalUrl);
        console.log('✅ Session ID:', sessionId);
        
        // Set success state and redirect immediately
        signInSuccess.value = true;
        
        // Redirect immediately (no delay)
        window.location.href = finalUrl;
        
    } catch (error) {
        console.error('Sign-in error:', error);
        uiStore.setError(AUTH_OPERATIONS.COMPLETE_SIGN_IN, error.message || 'Sign-in failed');
    }
}

onMounted(() => {
    handleSignIn();
})
</script>