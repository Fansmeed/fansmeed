<template>
    <div class="min-h-screen flex flex-col lg:flex-row">
        <div
            class="account-head lg:w-[500px] lg:min-h-screen lg:fixed lg:top-0 lg:left-0 h-70 lg:h-screen relative overflow-hidden">
            <img :src="randomImage" alt="Login Background" class="absolute inset-0 w-full h-full object-cover" />
            <!-- Dark Overlay -->
            <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

            <!-- Logo Centered Perfectly -->
            <div class="relative z-10 h-full flex items-center justify-center p-8">
                <div class="text-center">
                    <div class="size-16 bg-primary rounded-lg flex items-center justify-center">
                        <i class="pi pi-users text-white text-2xl"></i>
                    </div>
                    <p class="text-white/80 mt-2 text-sm lg:text-base">Connect • Play • Win</p>
                </div>
            </div>
        </div>

        <!-- Content Section - Takes remaining space with left margin on desktop -->
        <div class="items-center flex-1 lg:ml-[550px] pt-10">
            <div class="account-container max-w-4xl w-full p-5 lg:p-10">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-neutral-800 dark:text-white mb-2">
                        <span class="text-primary border-l-7 mr-2 rounded-md"></span>
                        Admin Access
                    </h1>
                    <p class="text-neutral-600 dark:text-neutral-400">Sign in with your admin credentials</p>
                </div>

                <!-- Login Form -->
                <div
                    class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 max-w-lg">
                    <n-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-placement="top">
                        <div class="space-y-6">
                            <!-- User ID Input -->
                            <n-form-item label="Admin ID" path="userId">
                                <n-input 
                                    v-model:value="loginForm.userId" 
                                    placeholder="Enter your admin ID" 
                                    size="large"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.ADMIN_SEND_LINK)"
                                    @keyup.enter="handleLogin"
                                >
                                    <template #prefix>
                                        <i class="pi pi-id-card text-gray-400"></i>
                                    </template>
                                </n-input>
                                <template #feedback>
                                    <div class="text-xs text-gray-500 mt-1">
                                        Enter your admin ID (e.g., admin123)
                                    </div>
                                </template>
                            </n-form-item>

                            <!-- Submit Button -->
                            <div>
                                <Button 
                                    label="Send Login Link" 
                                    icon="pi pi-send" 
                                    class="w-full" 
                                    @click="handleLogin"
                                    :loading="uiStore.isLoading(AUTH_OPERATIONS.ADMIN_SEND_LINK)"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.ADMIN_SEND_LINK)"
                                    severity="info"
                                />
                            </div>

                            <!-- Info Box -->
                            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
                                <div class="flex items-start">
                                    <div class="flex-shrink-0">
                                        <i class="pi pi-info-circle text-blue-600 dark:text-blue-400"></i>
                                    </div>
                                    <div class="ml-3">
                                        <h3 class="text-sm font-medium text-blue-800 dark:text-blue-300">
                                            Admin Authentication
                                        </h3>
                                        <div class="mt-2 text-sm text-blue-700 dark:text-blue-400">
                                            <p>• Login links are sent to your registered email</p>
                                            <p>• Links expire after 20 minutes</p>
                                            <p>• Check your spam folder if you don't see the email</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </n-form>
                </div>

                <!-- Success Message -->
                <div v-if="successMessage" class="mt-6">
                    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <i class="pi pi-check-circle text-green-600 dark:text-green-400"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-green-800 dark:text-green-300">
                                    Login Link Sent!
                                </h3>
                                <div class="mt-2 text-sm text-green-700 dark:text-green-400">
                                    <p>{{ successMessage }}</p>
                                </div>
                                <div class="mt-3">
                                    <div class="-mx-2 -my-1.5 flex">
                                        <button
                                            type="button"
                                            @click="successMessage = ''"
                                            class="rounded-md bg-green-50 dark:bg-green-800 px-3 py-1.5 text-sm font-medium text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error Display -->
                <div v-if="displayError" class="mt-6">
                    <ErrorDisplay 
                        :error="displayError" 
                        @retry="handleLogin"
                        :isLoading="uiStore.isLoading(AUTH_OPERATIONS.ADMIN_SEND_LINK)"
                        customTitle="Admin Login"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { ElMessage } from 'element-plus'
import Button from 'primevue/button'
import { useAuthStore, AUTH_OPERATIONS } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import ErrorDisplay from '@/components/ErrorDisplay.vue'
import { formatFirebaseErrorForDisplay } from '@/utils/errorHelper'

const message = useMessage()
const authStore = useAuthStore()
const uiStore = useUiStore()

// Random background images
const images = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoQNwBVEvy0ww5JGRPoYshfGDaxkFgUzrCI4wOcmqWT_BJeoDW-LXdiHj4VF01-UREo6WyAp_dl6UZpizqwJ1m_Xhvj9wxl3dvN-xn_htfgs67iixvGPJoxt04r7kk7mFxzbnxmKNKVtrHpqmSxELTN_J9PRh0TFErf8CyekCCYEwVgK47H2kNSehWs5bOURHQl1KVDyLvYXYBPW6gMKnNS_6Dks0zrW75p_IBqXVb7kluPTpC5mfONvwd6teoTywBpeiue6Y2u_dR',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA2XJy7JRPHkDV4YDiJt6drHq9HnNfLw08zlPrCZV9hf4VaNERVG2zr63VsYgVqAOKDowJWxaEfkFLV1YWxpSIIHc0vaGBHCPUhHzChx-pdxBMZLwAzWlL1OeIVEkLRJOHLs2NU90O-hees9lCWF1t-VcERyd0-1XcB1GIzEj5I3eYcssO_ZEQMywhnsyitjp7pjKWx6JIdZqUTAD82hdBnn9nJ8D6OW-c4mguQ_AFrJzEp-O0K8EQ9Bc4JeJsdtZbqTxoiW'
]

const randomImage = ref('')
const loginFormRef = ref(null)
const successMessage = ref('')

// Login Form
const loginForm = ref({
    userId: ''
})

// Validation Rules
const loginRules = {
    userId: {
        required: true,
        message: 'Please enter your admin ID',
        trigger: ['blur', 'input']
    }
}

// Computed
const displayError = computed(() => {
    const error = uiStore.getError(AUTH_OPERATIONS.ADMIN_SEND_LINK)
    if (!error) return null
    
    return {
        message: formatFirebaseErrorForDisplay(error.message || error.toString()),
        isTimeout: error.isTimeout,
        operation: AUTH_OPERATIONS.ADMIN_SEND_LINK,
        code: error.code
    }
})

// Methods
const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}

const handleLogin = async () => {
    try {
        await loginFormRef.value?.validate()

        const result = await authStore.adminSendLoginLink(loginForm.value.userId)
        
        // Show success message
        successMessage.value = result.message || 'Login link sent successfully! Check your email.'
        
        // Clear form after successful submission
        loginForm.value.userId = ''

        // Clear any previous errors
        uiStore.clearError(AUTH_OPERATIONS.ADMIN_SEND_LINK)

    } catch (error) {
        console.error('Admin login error:', error)
        
        // Format the error before displaying
        const formattedError = formatFirebaseErrorForDisplay(error.message || error.toString())
        
        // Show error message
        ElMessage.error(formattedError || 'Failed to send login link')
        
        // Clear success message
        successMessage.value = ''
    }
}

// Initialize
onMounted(() => {
    getRandomImage()
    
    // Clear any existing errors on mount
    uiStore.clearError(AUTH_OPERATIONS.ADMIN_SEND_LINK)
})
</script>