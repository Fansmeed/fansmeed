<template>
    <div class="page-wraper min-h-screen flex flex-col lg:flex-row">
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

        <!-- for push purposes -->

        <!-- Content Section - Takes remaining space with left margin on desktop -->
        <div class="account-form-inner items-center flex-1 lg:ml-[550px]">
            <div class="account-container max-w-4xl w-full p-5 lg:p-10">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-neutral-800 dark:text-white mb-2">
                        <span class="text-primary border-l-7 mr-2 rounded-md"></span>
                        User Login
                    </h1>
                    <p class="text-neutral-600 dark:text-neutral-400">Sign in to your account</p>
                    <p class="text-neutral-600 dark:text-neutral-400">
                        Don't have an account?
                        <router-link :to="{ name: 'Register' }" class="underline text-primary font-bold">
                            Create account
                        </router-link>
                    </p>
                </div>

                <!-- Login Form -->
                <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 max-w-lg border-2 border-gray-500 dark:border-gray-400">
                    <n-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-placement="top">
                        <div class="space-y-3">
                            <!-- Email Input -->
                            <n-form-item label="Email Address" path="email">
                                <n-input 
                                    v-model:value="loginForm.email"
                                    placeholder="Enter your email address" 
                                    type="email"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)"
                                    @keyup.enter="handleLogin"
                                >
                                    <template #prefix>
                                        <i class="pi pi-envelope text-gray-400"></i>
                                    </template>
                                </n-input>
                            </n-form-item>

                            <!-- Password -->
                            <n-form-item label="Password" path="password">
                                <n-input 
                                    v-model:value="loginForm.password" 
                                    type="password"
                                    placeholder="Enter your password" 
                                    show-password-on="click"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)"
                                    @keyup.enter="handleLogin"
                                >
                                    <template #prefix>
                                        <i class="pi pi-lock text-gray-400"></i>
                                    </template>
                                </n-input>
                            </n-form-item>

                            <!-- Remember Me & Forgot Password -->
                            <div class="flex items-center justify-between">
                                <n-checkbox v-model:checked="rememberMe">
                                    Remember me
                                </n-checkbox>
                                <router-link :to="{ name: 'ResetPassword' }"
                                    class="text-primary hover:underline text-sm">
                                    Forgot password?
                                </router-link>
                            </div>

                            <!-- Submit Button -->
                            <div class="pt-4">
                                <Button 
                                    label="Sign In" 
                                    icon="pi pi-sign-in" 
                                    class="w-full" 
                                    @click="handleLogin"
                                    :loading="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)"
                                />
                            </div>

                            <!-- Divider -->
                            <div class="relative flex items-center py-4">
                                <div class="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
                                <span class="flex-shrink mx-4 text-neutral-500 text-sm">Or continue with</span>
                                <div class="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
                            </div>

                            <!-- Social Login Options -->
                            <div class="grid grid-cols-2 gap-4">
                                <Button 
                                    label="Google" 
                                    icon="pi pi-google" 
                                    severity="secondary" 
                                    class="w-full"
                                    @click="loginWithGoogle"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.SOCIAL_LOGIN)"
                                    :loading="uiStore.isLoading(AUTH_OPERATIONS.SOCIAL_LOGIN) && socialProvider === 'google'"
                                />
                                <Button 
                                    label="Facebook" 
                                    icon="pi pi-facebook" 
                                    severity="secondary" 
                                    class="w-full"
                                    @click="loginWithFacebook"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.SOCIAL_LOGIN)"
                                    :loading="uiStore.isLoading(AUTH_OPERATIONS.SOCIAL_LOGIN) && socialProvider === 'facebook'"
                                />
                            </div>
                        </div>
                    </n-form>
                </div>

                <!-- Error Display -->
                <div v-if="displayError" class="mt-6">
                    <ErrorDisplay 
                        :error="displayError" 
                        @retry="handleLogin"
                        :isLoading="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)"
                        customTitle="User Login"
                    />
                </div>

                <!-- Email Verification Notice -->
                <div v-if="showVerificationNotice" class="mt-6">
                    <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <i class="pi pi-exclamation-triangle text-amber-600 dark:text-amber-400"></i>
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Email Verification Required
                                </h3>
                                <div class="mt-2 text-sm text-amber-700 dark:text-amber-400">
                                    <p>Please verify your email address before logging in.</p>
                                    <p class="mt-1">
                                        <button 
                                            @click="resendVerificationEmail"
                                            class="underline text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200"
                                        >
                                            Click here to resend verification email
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ElMessage } from 'element-plus'
import Button from 'primevue/button'
import { useAuthStore, AUTH_OPERATIONS } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import ErrorDisplay from '@/components/ErrorDisplay.vue'
import { formatFirebaseErrorForDisplay } from '@/utils/errorHelper'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const uiStore = useUiStore()

// Random background images
const images = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoQNwBVEvy0ww5JGRPoYshfGDaxkFgUzrCI4wOcmqWT_BJeoDW-LXdiHj4VF01-UREo6WyAp_dl6UZpizqwJ1m_Xhvj9wxl3dvN-xn_htfgs67iixvGPJoxt04r7kk7mFxzbnxmKNKVtrHpqmSxELTN_J9PRh0TFErf8CyekCCYEwVgK47H2kNSehWs5bOURHQl1KVDyLvYXYBPW6gMKnNS_6Dks0zrW75p_IBqXVb7kluPTpC5mfONvwd6teoTywBpeiue6Y2u_dR',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA2XJy7JRPHkDV4YDiJt6drHq9HnNfLw08zlPrCZV9hf4VaNERVG2zr63VsYgVqAOKDowJWxaEfkFLV1YWxpSIIHc0vaGBHCPUhHzChx-pdxBMZLwAzWlL1OeIVEkLRJOHLs2NU90O-hees9lCWF1t-VcERyd0-1XcB1GIzEj5I3eYcsUwCEpRuSO_ZEQMywhnsyitjp7pjKWx6JIdZqUTAD82hdBnn9nJ8D6OW-c4mguQ_AFrJzEp-O0K8EQ9Bc4JeJsdtZbqTxoiW'
]

const randomImage = ref('')
const loginFormRef = ref(null)
const rememberMe = ref(false)
const showVerificationNotice = ref(false)
const socialProvider = ref('')

// Login Form
const loginForm = ref({
    email: '',
    password: ''
})

// Validation Rules
const loginRules = {
    email: {
        required: true,
        validator: (rule, value) => {
            if (!value) {
                return new Error('Please enter your email address')
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return new Error('Please enter a valid email address')
            }
            return true
        },
        trigger: ['blur', 'input']
    },
    password: {
        required: true,
        message: 'Please enter your password',
        trigger: ['blur', 'input']
    }
}

// Computed
const displayError = computed(() => {
    const error = uiStore.getError(AUTH_OPERATIONS.USER_LOGIN)
    if (!error) return null
    
    // Check if it's an email verification error
    if (error.message?.includes('verify your email')) {
        showVerificationNotice.value = true
    } else {
        showVerificationNotice.value = false
    }
    
    return {
        message: formatFirebaseErrorForDisplay(error.message || error.toString()),
        isTimeout: error.isTimeout,
        operation: AUTH_OPERATIONS.USER_LOGIN,
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

        await authStore.userLogin(loginForm.value.email, loginForm.value.password)
        
        // Clear form
        loginForm.value.email = ''
        loginForm.value.password = ''
        
        // Clear any previous errors
        uiStore.clearError(AUTH_OPERATIONS.USER_LOGIN)
        showVerificationNotice.value = false

    } catch (error) {
        console.error('User login error:', error)
        
        // Format the error before displaying
        const formattedError = formatFirebaseErrorForDisplay(error.message || error.toString())
        
        // Show error message
        ElMessage.error(formattedError || 'Login failed')
    }
}

const loginWithGoogle = async () => {
    try {
        socialProvider.value = 'google'
        await authStore.socialLogin('google')
    } catch (error) {
        console.error('Google login error:', error)
        const formattedError = formatFirebaseErrorForDisplay(error.message || error.toString())
        ElMessage.error(formattedError || 'Google login failed')
    } finally {
        socialProvider.value = ''
    }
}

const loginWithFacebook = async () => {
    try {
        socialProvider.value = 'facebook'
        await authStore.socialLogin('facebook')
    } catch (error) {
        console.error('Facebook login error:', error)
        const formattedError = formatFirebaseErrorForDisplay(error.message || error.toString())
        ElMessage.error(formattedError || 'Facebook login failed')
    } finally {
        socialProvider.value = ''
    }
}

const resendVerificationEmail = async () => {
    try {
        // This would need to be implemented in the authStore
        // For now, show a message
        ElMessage.info('Verification email resend functionality to be implemented')
        showVerificationNotice.value = false
    } catch (error) {
        console.error('Resend verification error:', error)
        ElMessage.error('Failed to resend verification email')
    }
}

// Initialize
onMounted(() => {
    getRandomImage()
    
    // Clear any existing errors on mount
    uiStore.clearError(AUTH_OPERATIONS.USER_LOGIN)
    showVerificationNotice.value = false
})
</script>