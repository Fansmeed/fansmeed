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
                        Central Authentication
                    </h1>
                    <p class="text-neutral-600 dark:text-neutral-400">Sign in to access your account</p>
                </div>

                <!-- Cookie Error Display -->
                <div v-if="cookieError" class="mb-6">
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
                                        <button
                                            type="button"
                                            @click="goToMainSite"
                                            class="rounded-md bg-red-50 dark:bg-red-800 px-3 py-1.5 text-sm font-medium text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                                        >
                                            Go to Main Site
                                        </button>
                                        <button
                                            type="button"
                                            @click="refreshAndCheck"
                                            class="rounded-md bg-blue-50 dark:bg-blue-800 px-3 py-1.5 text-sm font-medium text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cookie Debug Info (Remove in production) -->
                <div v-if="debugMode" class="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <h4 class="font-bold mb-2">Debug Info:</h4>
                    <pre class="text-xs">{{ debugInfo }}</pre>
                </div>

                <!-- Render appropriate login component -->
                <div v-if="!cookieError">
                    <AdminLogin v-if="userRole === 'admin'" />
                    <UserLogin v-else-if="userRole === 'user'" />
                    
                    <!-- No cookie but direct access - show options -->
                    <div v-else class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-8 max-w-lg">
                        <div class="text-center mb-6">
                            <h3 class="text-xl font-bold text-neutral-800 dark:text-white mb-2">
                                How would you like to sign in?
                            </h3>
                            <p class="text-neutral-600 dark:text-neutral-400">
                                Please select your account type
                            </p>
                        </div>
                        
                        <div class="space-y-4">
                            <button
                                @click="setUserCookieAndContinue"
                                class="w-full p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-colors"
                            >
                                <div class="flex items-center">
                                    <div class="size-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                                        <i class="pi pi-user text-blue-600 dark:text-blue-400"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-neutral-800 dark:text-white">User Account</h4>
                                        <p class="text-sm text-neutral-600 dark:text-neutral-400">
                                            For regular users to play quizzes and games
                                        </p>
                                    </div>
                                </div>
                            </button>
                            
                            <button
                                @click="setAdminCookieAndContinue"
                                class="w-full p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-colors"
                            >
                                <div class="flex items-center">
                                    <div class="size-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-3">
                                        <i class="pi pi-shield text-red-600 dark:text-red-400"></i>
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-neutral-800 dark:text-white">Admin Account</h4>
                                        <p class="text-sm text-neutral-600 dark:text-neutral-400">
                                            For administrators to manage the platform
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
                        
                        <div class="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                            <p class="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                                For best experience, please access this page through the main application.
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
import { getAuthIntentCookie, clearAuthIntentCookie, setAuthIntentCookie } from '@/utils/cookieChecker'

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
const debugMode = ref(false) // Set to true for debugging
const debugInfo = ref('')

// Methods
const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}

const checkAuthCookie = () => {
    console.log('🔐 [Login.vue] Checking auth cookie on auth.fansmeed.com')
    console.log('🔐 [Login.vue] Current hostname:', window.location.hostname)
    
    const cookieResult = getAuthIntentCookie()
    
    // Debug info
    if (debugMode.value) {
        debugInfo.value = JSON.stringify({
            timestamp: new Date().toISOString(),
            hostname: window.location.hostname,
            referrer: document.referrer,
            cookieResult: cookieResult,
            allCookies: document.cookie
        }, null, 2)
    }
    
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
}

const setUserCookieAndContinue = () => {
    console.log('🔐 Setting user cookie for direct access')
    // Get current URL to redirect back after login
    const currentUrl = new URL(window.location.href)
    const redirectBack = currentUrl.searchParams.get('redirect') || 'https://fansmeed.com'
    
    setAuthIntentCookie('user', redirectBack)
    
    // Refresh to pick up the cookie
    setTimeout(() => {
        window.location.reload()
    }, 500)
}

const setAdminCookieAndContinue = () => {
    console.log('🔐 Setting admin cookie for direct access')
    const currentUrl = new URL(window.location.href)
    const redirectBack = currentUrl.searchParams.get('redirect') || 'https://cp.fansmeed.com'
    
    setAuthIntentCookie('admin', redirectBack)
    
    setTimeout(() => {
        window.location.reload()
    }, 500)
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
    // Clear cookie and retry
    clearAuthIntentCookie()
    cookieError.value = false
    setTimeout(() => {
        window.location.reload()
    }, 300)
}

// Initialize
onMounted(() => {
    getRandomImage()
    checkAuthCookie()
    
    // Enable debug mode if URL has debug param
    const urlParams = new URLSearchParams(window.location.search)
    debugMode.value = urlParams.has('debug')
})
</script>