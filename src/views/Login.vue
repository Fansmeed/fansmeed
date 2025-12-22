<!-- Location: auth.fansmeed.com/src/views/Login.vue -->
<template>
    <div class="min-h-screen flex flex-col lg:flex-row">
        <div class="account-head lg:w-[500px] lg:min-h-screen lg:fixed lg:top-0 lg:left-0 h-70 lg:h-screen relative overflow-hidden">
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
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-neutral-800 dark:text-white mb-2">
                        <span class="text-primary border-l-7 mr-2 rounded-md"></span>
                        {{ headerTitle }}
                    </h1>
                    <p class="text-neutral-600 dark:text-neutral-400">{{ headerSubtitle }}</p>
                </div>

                <!-- Loading State -->
                <div v-if="checking" class="mb-6">
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <i class="pi pi-spin pi-spinner text-blue-600 dark:text-blue-400 text-xl"></i>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-blue-700 dark:text-blue-400">
                                    Detecting login type...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error State -->
                <div v-else-if="loginType === 'unknown'" class="mb-6">
                    <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div class="flex items-start">
                            <div class="flex-shrink-0">
                                <i class="pi pi-exclamation-triangle text-amber-600 dark:text-amber-400 text-xl"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Invalid Access
                                </h3>
                                <div class="mt-2 text-sm text-amber-700 dark:text-amber-400">
                                    <p>Please access this page through the main application.</p>
                                </div>
                                <div class="mt-3">
                                    <div class="-mx-2 -my-1.5 flex space-x-2">
                                        <Button label="Go to Admin Site" severity="warn" @click="goToAdminSite"
                                            icon="pi pi-external-link" size="small" />
                                        <Button label="Go to User Site" severity="help" @click="goToUserSite"
                                            icon="pi pi-external-link" size="small" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Render appropriate login component -->
                <div v-else>
                    <AdminLogin v-if="loginType === 'admin'" />
                    <UserLogin v-else-if="loginType === 'user'" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AdminLogin from '@/components/AdminLogin.vue'
import UserLogin from '@/components/UserLogin.vue'
import Button from 'primevue/button'
import { detectLoginType } from '@/utils/subdomainDetector'

// Random background images
const images = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoQNwBVEvy0ww5JGRPoYshfGDaxkFgUzrCI4wOcmqWT_BJeoDW-LXdiHj4VF01-UREo6WyAp_dl6UZpizqwJ1m_Xhvj9wxl3dvN-xn_htfgs67iixvGPJoxt04r7kk7mFxzbnxmKNKVtrHpqmSxELTN_J9PRh0TFErf8CyekCCYEwVgK47H2kNSehWs5bOURHQl1KVDyLvYXYBPW6gMKnNS_6Dks0zrW75p_IBqXVb7kluPTpC5mfONvwd6teoTywBpeiue6Y2u_dR',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA2XJy7JRPHkDV4YDiJt6drHq9HnNfLw08zlPrCZV9hf4VaNERVG2zr63VsYgVqAOKDowJWxaEfkFLV1YWxpSIIHc0vaGBHCPUhHzChx-pdxBMZLwAzWlL1OeIVEkLRJOHLs2NU90O-hees9lCWF1t-VcERyd0-1XcB1GIzEj5I3eYcsO_ZEQMywhnsyitjp7pjKWx6JIdZqUTAD82hdBnn9nJ8D6OW-c4mguQ_AFrJzEp-O0K8EQ9Bc4JeJsdtZbqTxoiW'
]

const randomImage = ref('')
const loginType = ref('')
const checking = ref(true)

// Computed properties for dynamic headers
const headerTitle = computed(() => {
    switch (loginType.value) {
        case 'admin': return 'Admin Portal';
        case 'user': return 'FansMeed';
        default: return 'Authentication';
    }
})

const headerSubtitle = computed(() => {
    switch (loginType.value) {
        case 'admin': return 'Sign in to access admin dashboard';
        case 'user': return 'Sign in to your account';
        default: return 'Authentication portal';
    }
})

// Methods
const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}

const detectUserType = () => {
    checking.value = true
    
    // First check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    
    if (typeParam === 'admin' || typeParam === 'user') {
        loginType.value = typeParam;
        console.log(`✅ Login type from URL: ${typeParam}`);
    } else {
        // Use subdomain detector as fallback
        const type = detectLoginType();
        loginType.value = type;
        console.log(`✅ Login type detected: ${type}`);
    }
    
    checking.value = false;
}

const goToAdminSite = () => {
    window.location.href = 'https://cp.fansmeed.com'
}

const goToUserSite = () => {
    window.location.href = 'https://fansmeed.com'
}

// Initialize
onMounted(() => {
    getRandomImage()
    detectUserType()
})
</script>