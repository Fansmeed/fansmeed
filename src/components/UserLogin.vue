<template>
    <div class="flex flex-col lg:flex-row">
        <div class="items-center flex-1">
            <div>
                <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 max-w-lg border-2 border-gray-500 dark:border-gray-400">
                    <n-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-placement="top">
                        <div class="space-y-3">
                            <!-- Email Input -->
                            <n-form-item label="Email Address" path="email">
                                <n-input v-model:value="loginForm.email" placeholder="Enter your email address"
                                    type="email" :disabled="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)"
                                    @keyup.enter="handleLogin">
                                    <template #prefix>
                                        <i class="pi pi-envelope text-gray-400"></i>
                                    </template>
                                </n-input>
                            </n-form-item>

                            <!-- Password -->
                            <n-form-item label="Password" path="password">
                                <n-input v-model:value="loginForm.password" type="password"
                                    placeholder="Enter your password" show-password-on="click"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)"
                                    @keyup.enter="handleLogin">
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
                                <Button label="Sign In" icon="pi pi-sign-in" class="w-full" @click="handleLogin"
                                    :loading="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.USER_LOGIN)" />
                            </div>

                            <!-- Divider -->
                            <div class="relative flex items-center py-4">
                                <div class="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
                                <span class="flex-shrink mx-4 text-neutral-500 text-sm">Or continue with</span>
                                <div class="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
                            </div>

                            <!-- Social Login Options -->
                            <div class="grid grid-cols-2 gap-4">
                                <Button label="Google" icon="pi pi-google" severity="secondary" class="w-full"
                                    @click="loginWithGoogle" :disabled="uiStore.isLoading(AUTH_OPERATIONS.SOCIAL_LOGIN)"
                                    :loading="uiStore.isLoading(AUTH_OPERATIONS.SOCIAL_LOGIN) && socialProvider === 'google'" />
                                <Button label="Facebook" icon="pi pi-facebook" severity="secondary" class="w-full"
                                    @click="loginWithFacebook"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.SOCIAL_LOGIN)"
                                    :loading="uiStore.isLoading(AUTH_OPERATIONS.SOCIAL_LOGIN) && socialProvider === 'facebook'" />
                            </div>
                            <p class="text-neutral-600 dark:text-neutral-400 text-center pt-2">
                                Don't have an account?
                                <router-link :to="{ name: 'Register' }" class="underline text-primary font-bold">
                                    Create account
                                </router-link>
                            </p>
                        </div>
                    </n-form>
                </div>

                <!-- Keep showVerificationNotice, remove displayError -->
                <!-- Email Verification Notice -->
                <div v-if="showVerificationNotice" class="mt-6">
                    <div
                        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
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
                                        <button @click="resendVerificationEmail"
                                            class="underline text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200">
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import Button from 'primevue/button'
import { useAuthStore, AUTH_OPERATIONS } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { formatAnyErrorForDisplay, isErrorType, isFormValidationError } from '@/utils/errorFormatter'


const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const uiStore = useUiStore()

// Random background images
const images = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoQNwBVEvy0ww5JGRPoYshfGDaxkFgUzrCI4wOcmqWT_BJeoDW-LXdiHj4VF01-UREo6WyAp_dl6UZpizqwJ1m_Xhvj9wxl3dvN-xn_htfgs67iixvGPJoxt04r7kk7mFxzbnxmKNKVtrHpqmSxELTN_J9PRh0TFErf8CyekCCYEwVgK47H2kNSehWs5bOURHQl1KVDyLvYXYBPW6gMKnNS_6Dks0zrW75p_IBqXVb7kluPTpC5mfONvwd6teoTywBpeiue6Y2u_dR',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA2XJy7JRPHkDV4YDiJt6adrHq9HnNfLw08zlPrCZV9hf4VaNERVG2zr63VsYgVqAOKDowJWxaEfkFLV1YWxpSIIHc0vaGBHCPUhHzChx-pdxBMZLwAzWlL1OeIVEkLRJOHLs2NU90O-hees9lCWF1t-VcERyd0-1XcB1GIzEj5I3eYcsUwCEpRuSO_ZEQMywhnsyitjp7pjKWx6JIdZqUTAD82hdBnn9nJ8D6OW-c4mguQ_AFrJzEp-O0K8EQ9Bc4JeJsdtZbqTxoiW'
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

// Methods
const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}


// handleLogin method - updated
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
        
        // Check if it's a form validation error
        if (isFormValidationError(error)) {
            message.error('Please ensure all form requirements are met')
        } else {
            // Check for specific error types
            if (isErrorType(error, 'USER_EMAIL_NOT_VERIFIED')) {
                showVerificationNotice.value = true
                message.error('Please verify your email before logging in.')
            } else if (isErrorType(error, 'auth/invalid-credential')) {
                message.error('Invalid email or password')
            } else {
                // Use the formatter for all other errors
                const formattedError = formatAnyErrorForDisplay(error)
                message.error(formattedError || 'Login failed')
            }
        }
    }
}

const loginWithGoogle = async () => {
    try {
        socialProvider.value = 'google'
        await authStore.socialLogin('google')
    } catch (error) {
        console.error('Google login error:', error)
        const formattedError = formatAnyErrorForDisplay(error)
        message.error(formattedError || 'Google login failed')
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
        const formattedError = formatAnyErrorForDisplay(error)
        message.error(formattedError || 'Facebook login failed')
    } finally {
        socialProvider.value = ''
    }
}

const resendVerificationEmail = async () => {
    try {
        // This would need to be implemented in the authStore
        // For now, show a message
        message.info('Verification email resend functionality to be implemented')
        showVerificationNotice.value = false
    } catch (error) {
        console.error('Resend verification error:', error)
        const formattedError = formatAnyErrorForDisplay(error)
        message.error(formattedError || 'Failed to resend verification email')
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