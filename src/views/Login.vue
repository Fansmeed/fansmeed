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
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-neutral-800 dark:text-white mb-2">
                        <span class="text-primary border-l-7 mr-2 rounded-md"></span>
                        Auth Central
                    </h1>
                    <p class="text-neutral-600 dark:text-neutral-400">Sign in to access your account</p>
                </div>

                <!-- Loading State -->
                <div v-if="checking" class="mb-6">
                    <div
                        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="pi pi-spin pi-spinner text-blue-600 dark:text-blue-400 text-xl"></i>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-blue-700 dark:text-blue-400">
                                    Checking authentication...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cookie Error Display -->
                <div v-else-if="cookieError" class="mb-6">
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div class="flex items-start">
                            <div class="flex-shrink-0">
                                <i class="pi pi-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
                                    {{ cookieErrorTitle }}
                                </h3>
                                <div class="mt-2 text-sm text-red-700 dark:text-red-400">
                                    <p>{{ cookieErrorMessage }}</p>
                                </div>
                                <div class="mt-3">
                                    <div class="-mx-2 -my-1.5 flex space-x-2">
                                        <Button label="Go to Main Site" severity="warn" @click="goToMainSite"
                                            icon="pi pi-external-link" size="small" />
                                        <Button label="Retry" severity="help" @click="refreshAndCheck"
                                            icon="pi pi-refresh" size="small" :loading="checking" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Render appropriate login component -->
                <div v-else-if="!checking">
                    <AdminLogin v-if="userRole === 'admin'" />
                    <UserLogin v-else-if="userRole === 'user'" />

                    <!-- No cookie found - show error message -->
                    <div v-else class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-8 max-w-lg text-center">
                        <div class="mb-6">
                            <div class="flex justify-center mb-4">
                                <div
                                    class="size-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                    <i
                                        class="pi pi-exclamation-triangle text-amber-600 dark:text-amber-400 text-2xl"></i>
                                </div>
                            </div>
                            <h3 class="text-xl font-bold text-neutral-800 dark:text-white mb-2">
                                Authentication Required
                            </h3>
                            <p class="text-neutral-600 dark:text-neutral-400">
                                Please access this page through the main application.
                            </p>
                        </div>

                        <div class="space-y-4">
                            <div class="flex gap-4 justify-center">
                                <Button label="Go to Main Site" severity="warn" @click="goToMainSite"
                                    icon="pi pi-external-link" size="small" />
                                <Button label="Retry" severity="help" @click="refreshAndCheck" icon="pi pi-refresh"
                                    size="small" :loading="checking" />
                            </div>
                        </div>

                        <div class="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                            <p class="text-sm text-neutral-500 dark:text-neutral-400">
                                If you believe this is an error, please contact support.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLogin from '@/components/AdminLogin.vue'
import UserLogin from '@/components/UserLogin.vue'
import { getAuthIntentCookie, clearAuthIntentCookie } from '@/utils/cookieChecker'

const router = useRouter()

// Random background images
const images = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoQNwBVEvy0ww5JGRPoYshfGDaxkFgUzrCI4wOcmqWT_BJeoDW-LXdiHj4VF01-UREo6WyAp_dl6UZpizqwJ1m_Xhvj9wxl3dvN-xn_htfgs67iixvGPJoxt04r7kk7mFxzbnxmKNKVtrHpqmSxELTN_J9PRh0TFErf8CyekCCYEwVgK47H2kNSehWs5bOURHQl1KVDyLvYXYBPW6gMKnNS_6Dks0zrW75p_IBqXVb7kluPTpC5mfONvwd6teoTywBpeiue6Y2u_dR',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA2XJy7JRPHkDV4YDiJt6drHq9HnNfLw08zlPrCZV9hf4VaNERVG2zr63VsYgVqAOKDowJWxaEfkFLV1YWxpSIIHc0vaGBHCPUhHzChx-pdxBMZLwAzWlL1OeIVEkLRJOHLs2NU90O-hees9lCWF1t-VcERyd0-1XcB1GIzEj5I3eYcsO_ZEQMywhnsyitjp7pjKWx6JIdZqUTAD82hdBnn9nJ8D6OW-c4mguQ_AFrJzEp-O0K8EQ9Bc4JeJsdtZbqTxoiW'
]

const randomImage = ref('')
const userRole = ref(null)
const cookieError = ref(false)
const cookieErrorTitle = ref('')
const cookieErrorMessage = ref('')
const checking = ref(false) // Loading state for retry

// Methods
const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}

const checkAuthCookie = () => {
    checking.value = true
    console.log('🔐 [Login.vue] Checking auth cookie on auth.fansmeed.com')
    console.log('🔐 [Login.vue] Current hostname:', window.location.hostname)

    const cookieResult = getAuthIntentCookie()

    if (!cookieResult.valid) {
        cookieError.value = true
        cookieErrorTitle.value = cookieResult.expired ? 'Login Attempt Expired' : 'Authentication Required'
        cookieErrorMessage.value = cookieResult.error || 'Please access this page through the main application.'

        if (cookieResult.expired) {
            clearAuthIntentCookie()
        }
    } else {
        userRole.value = cookieResult.data.userRole
        console.log(`🔐 [Login.vue] Detected user role: ${userRole.value}`)
        console.log(`🔐 [Login.vue] Redirect URL: ${cookieResult.data.redirectUrl}`)

        // Store in session for later redirect
        if (cookieResult.data.redirectUrl) {
            sessionStorage.setItem('authRedirectUrl', cookieResult.data.redirectUrl)
        }

        // Clear error state
        cookieError.value = false
    }

    checking.value = false
}

const goToMainSite = () => {
    // Redirect to appropriate main site based on role if known
    if (userRole.value === 'admin') {
        window.location.href = 'https://cp.fansmeed.com'
    } else {
        window.location.href = 'https://fansmeed.com'
    }
}

const refreshAndCheck = () => {
    // Clear any expired cookie
    clearAuthIntentCookie()

    // Reset error state
    cookieError.value = false
    userRole.value = null

    // Re-check for cookie without refreshing the page
    checkAuthCookie()
}

// Initialize
onMounted(() => {
    getRandomImage()
    checkAuthCookie()
})
</script>