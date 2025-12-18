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
import { useMessage } from 'naive-ui'
import { useAuthStore, AUTH_OPERATIONS } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { formatFirebaseErrorForDisplay } from '@/utils/errorHelper'
import { getAuthIntentCookie, clearAuthIntentCookie, getTargetDomain } from '@/utils/cookieChecker'
import { createAuthToken } from '@/firebase/tokenExchange';

const authStore = useAuthStore()
const uiStore = useUiStore()
const message = useMessage()

const signInSuccess = ref(false)
const storeError = ref(null)

const handleSignIn = async () => {
    try {
        const currentUrl = window.location.href;
        const user = await authStore.completeSignIn(currentUrl);
        
        // Get the target domain from cookie
        const cookieResult = getAuthIntentCookie();
        let targetDomain;
        
        if (cookieResult.valid) {
            const redirectUrl = new URL(cookieResult.data.redirectUrl);
            targetDomain = redirectUrl.hostname;
        } else {
            targetDomain = authStore.userRole === 'admin' ? 'cp.fansmeed.com' : 'fansmeed.com';
        }
        
        // Create token in Firestore
        const tokenId = await createAuthToken(user, targetDomain);
        
        // Build redirect URL with token
        let redirectUrl = cookieResult.valid ? cookieResult.data.redirectUrl : `https://${targetDomain}/`;
        
        const finalUrl = new URL(redirectUrl);
        finalUrl.searchParams.set('authToken', tokenId);
        finalUrl.searchParams.set('source', 'auth.fansmeed.com');
        finalUrl.searchParams.set('timestamp', Date.now().toString());
        
        // Clear cookie
        clearAuthIntentCookie();
        
        console.log('✅ Redirecting with token:', tokenId);
        window.location.href = finalUrl.toString();
        
    } catch (error) {
        console.error('Sign-in error:', error);
        uiStore.setError(AUTH_OPERATIONS.COMPLETE_SIGN_IN, error.message || 'Sign-in failed');
    }
}

/**
 * Store auth session in Firestore - FIXED VERSION
 */
async function storeAuthSession(sessionId, sessionData) {
    try {
        console.log('🔄 Storing session in Firestore...')
        
        // Import Firebase modules
        const { db } = await import('@/firebase/firebaseInit')
        const { doc, setDoc } = await import('firebase/firestore')
        
        console.log('🔄 Firestore import successful')
        
        // Store in Firestore
        await setDoc(doc(db, 'crossDomainAuth', sessionId), sessionData)
        
        console.log('✅ Auth session stored in Firestore:', sessionId)
        console.log('✅ Collection: crossDomainAuth, Document ID:', sessionId)
        
        return true
        
    } catch (error) {
        console.error('❌ Firestore storage failed:', error)
        console.error('❌ Error details:', error.code, error.message)
        throw error
    }
}

/**
 * LocalStorage fallback if Firestore fails
 */
async function localStorageFallback(user, redirectUrl) {
    try {
        // Create a simpler session
        const fallbackSession = {
            uid: user.uid,
            email: user.email,
            userRole: authStore.userRole,
            timestamp: Date.now(),
            fallback: true
        }
        
        // Store in localStorage with unique key
        const fallbackKey = `fallback_auth_${Date.now()}`
        localStorage.setItem(fallbackKey, JSON.stringify(fallbackSession))
        
        // Build URL with fallback key
        const finalUrl = new URL(redirectUrl)
        finalUrl.searchParams.set('fallbackKey', fallbackKey)
        finalUrl.searchParams.set('source', 'auth.fansmeed.com')
        
        clearAuthIntentCookie()
        
        // Redirect immediately
        console.log('🔄 Using localStorage fallback, redirecting...')
        window.location.href = finalUrl.toString()
        
    } catch (error) {
        console.error('❌ LocalStorage fallback also failed:', error)
        uiStore.setError(AUTH_OPERATIONS.COMPLETE_SIGN_IN, 
            new Error('Failed to store authentication session. Please try again.'))
    }
}

const formatErrorForDisplay = (error) => {
    if (!error) return ''
    return formatFirebaseErrorForDisplay(error.message || error.toString())
}

// Initialize
onMounted(() => {
    handleSignIn()
})
</script>