<!-- Location: auth.fansmeed.com/src/views/CompleteSignIn.vue -->
<template>
    <div class="min-h-screen flex flex-col lg:flex-row">
        <!-- Left side background (keep your existing layout) -->
        <div
            class="account-head lg:w-[500px] lg:min-h-screen lg:fixed lg:top-0 lg:left-0 h-70 lg:h-screen relative overflow-hidden">
            <img :src="randomImage" alt="Login Background" class="absolute inset-0 w-full h-full object-cover" />
            <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
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
                    <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" fill="transparent"
                        animationDuration=".5s" />
                    <p class="text-neutral-500 dark:text-neutral-400 mt-4">
                        Completing sign-in...
                    </p>
                </div>

                <!-- Error State -->
                <div v-else-if="uiStore.getError(AUTH_OPERATIONS.COMPLETE_SIGN_IN)"
                    class="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div class="p-4 bg-red-100 dark:bg-red-900/20 mb-4 rounded-full flex">
                        <i class="pi pi-exclamation-triangle text-4xl text-red-600 dark:text-red-400"></i>
                    </div>
                    <h3 class="text-xl font-bold text-neutral-700 dark:text-neutral-300 mb-2">Error Encountered while
                        signing in</h3>
                    <p class="text-neutral-500 dark:text-neutral-400">
                        {{ formatErrorForDisplay(uiStore.getError(AUTH_OPERATIONS.COMPLETE_SIGN_IN)) }}
                    </p>
                    <p class="text-neutral-400 dark:text-neutral-300 mt-2">
                        Please try again
                    </p>
                    <Button label="Retry" icon="pi pi-refresh" @click="handleSignIn" class="mt-4" size="small" outlined
                        severity="info" />
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
                    <div v-if="redirectInfo" class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p class="text-sm text-blue-600 dark:text-blue-400">
                            Redirecting to: {{ redirectInfo.domain }}
                        </p>
                        <p class="text-xs text-blue-500 dark:text-blue-300 mt-1">
                            Using POST method for secure cookie setting
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore, AUTH_OPERATIONS } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { buildRedirectUrl, getRedirectUrlFromParams } from '@/utils/subdomainDetector'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'

const authStore = useAuthStore()
const uiStore = useUiStore()
const signInSuccess = ref(false)
const redirectInfo = ref(null)

// Cloud Function URL
const CLOUD_FUNCTION_URL = 'https://us-central1-fansmeed-quiz-app.cloudfunctions.net/setSessionCookie'

// Format error for display (keep your existing error formatter)
const formatErrorForDisplay = (error) => {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    return 'An unknown error occurred'
}

const handleSignIn = async () => {
    try {
        console.log('🔐 Starting sign-in process...')
        
        const currentUrl = window.location.href
        const user = await authStore.completeSignIn(currentUrl)

        if (!user || !user.uid) {
            throw new Error('No user data received')
        }

        // Get fresh ID token
        const idToken = await user.getIdToken(true)
        console.log('✅ ID token obtained')

        // Determine user role from authStore
        const userRole = authStore.userRole || 'user'
        console.log(`👤 User role: ${userRole}`)
        
        // Get redirect URL from params or use default
        const redirectParam = getRedirectUrlFromParams()
        console.log('🔗 Redirect param:', redirectParam)
        
        // Build secure redirect URL
        const redirectUrl = buildRedirectUrl(userRole, redirectParam)
        
        // Store redirect info for display
        redirectInfo.value = {
            domain: new URL(redirectUrl).hostname,
            url: redirectUrl
        }

        console.log('✅ Sign-in successful')
        console.log('👤 User role:', userRole)
        console.log('🔗 Redirect to:', redirectUrl)

        // Show success state
        signInSuccess.value = true

        // ============================================
        // USE POST METHOD FOR BETTER COOKIE SETTING
        // ============================================
        console.log('📨 Using POST method for secure cookie setting...')
        
        // Create a hidden form to POST to Cloud Function
        // This ensures cookies are properly set
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = CLOUD_FUNCTION_URL
        form.style.display = 'none'
        
        // Add token
        const tokenInput = document.createElement('input')
        tokenInput.type = 'hidden'
        tokenInput.name = 'token'
        tokenInput.value = idToken
        form.appendChild(tokenInput)
        
        // Add redirect URL
        const redirectInput = document.createElement('input')
        redirectInput.type = 'hidden'
        redirectInput.name = 'redirectUrl'
        redirectInput.value = redirectUrl
        form.appendChild(redirectInput)
        
        // Add user role (optional, Cloud Function will get from Firestore)
        const roleInput = document.createElement('input')
        roleInput.type = 'hidden'
        roleInput.name = 'userRole'
        roleInput.value = userRole
        form.appendChild(roleInput)
        
        // Add CSRF protection token (optional but good practice)
        const csrfInput = document.createElement('input')
        csrfInput.type = 'hidden'
        csrfInput.name = 'csrf'
        csrfInput.value = Math.random().toString(36).substring(2)
        form.appendChild(csrfInput)
        
        // Add to page and submit
        document.body.appendChild(form)
        
        // Submit after a brief delay to show success message
        setTimeout(() => {
            console.log('🚀 Submitting POST form to Cloud Function...')
            form.submit()
        }, 1500)

    } catch (error) {
        console.error('❌ Sign-in error:', error)
        uiStore.setError(AUTH_OPERATIONS.COMPLETE_SIGN_IN, error.message || 'Sign-in failed')
    }
}

onMounted(() => {
    handleSignIn()
})
</script>