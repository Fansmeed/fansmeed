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
                    <p class="text-neutral-600 dark:text-neutral-400">Sign in to access your accounts</p>
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
                                    <div class="-mx-2 -my-1.5 flex">
                                        <button
                                            type="button"
                                            @click="goToMainSite"
                                            class="rounded-md bg-red-50 dark:bg-red-800 px-3 py-1.5 text-sm font-medium text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                                        >
                                            Go Back
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Render appropriate login component -->
                <div v-if="!cookieError">
                    <AdminLogin v-if="userRole === 'admin'" />
                    <UserLogin v-else />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import AdminLogin from '@/components/AdminLogin.vue'
import UserLogin from '@/components/UserLogin.vue'
import { getAuthIntentCookie, clearAuthIntentCookie, setAuthIntentCookie } from '@/utils/cookieChecker'

const router = useRouter()
const message = useMessage()

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
const directAccess = ref(false)

// Methods
const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}

const checkAuthCookie = () => {
    const cookieResult = getAuthIntentCookie()
    
    if (!cookieResult.valid) {
        // Check if this is direct access
        const referrer = document.referrer
        const allowedDomains = ['fansmeed.com', 'cp.fansmeed.com']
        const isFromAllowedDomain = allowedDomains.some(domain => referrer.includes(domain))
        
        if (!isFromAllowedDomain && referrer) {
            // Came from somewhere else (like Google search)
            directAccess.value = true
            return
        }
        
        cookieError.value = true
        cookieErrorTitle.value = cookieResult.expired ? 'Login Attempt Expired' : 'Authentication Required'
        cookieErrorMessage.value = cookieResult.error || 'Please access this page through the main application.'
        
        if (cookieResult.expired) {
            clearAuthIntentCookie()
        }
    } else {
        // ✅ PRESERVE the existing cookie - don't overwrite it!
        userRole.value = cookieResult.data.userRole
        console.log(`🔐 Detected user role from existing cookie: ${userRole.value}`)
        console.log(`🔐 Redirect URL from cookie: ${cookieResult.data.redirectUrl}`)
    }
}

const setUserCookieAndContinue = () => {
    // Set user cookie and refresh
    setAuthIntentCookie('user', '/')
    window.location.reload()
}

const setAdminCookieAndContinue = () => {
    // Set admin cookie and refresh
    setAuthIntentCookie('admin', '/')
    window.location.reload()
}

const goToMainSite = () => {
    let targetDomain = 'fansmeed.com'
    if (userRole.value === 'admin') {
        targetDomain = 'cp.fansmeed.com'
    }
    window.location.href = `https://${targetDomain}`
}

// Initialize
onMounted(() => {
    getRandomImage()
    checkAuthCookie()
})
</script>