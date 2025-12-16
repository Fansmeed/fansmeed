<template>
    <div class="page-wraper min-h-screen flex flex-col lg:flex-row">
        <div
            class="account-head lg:w-[500px] lg:min-h-screen lg:fixed lg:top-0 lg:left-0 h-70 lg:h-screen relative overflow-hidden">
            <img :src="randomImage" alt="Reset Password Background"
                class="absolute inset-0 w-full h-full object-cover" />
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

        <!-- Content Section - Takes remaining space with left margin on desktop -->
        <div class="account-form-inner items-center flex-1 lg:ml-[550px]">
            <div class="account-container max-w-4xl w-full p-5 lg:p-10">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-neutral-800 dark:text-white mb-2">
                        <span class="text-primary border-l-7 mr-2 rounded-md"></span>
                        Reset Password
                    </h1>
                    <p class="text-neutral-600 dark:text-neutral-400">We'll send you a link to reset your password</p>
                    <p class="text-neutral-600 dark:text-neutral-400">
                        Remember your password?
                        <router-link :to="{ name: 'Login' }" class="underline text-primary font-bold">
                            Back to login
                        </router-link>
                    </p>
                </div>

                <!-- Scrollable Form Container -->
                <div
                    class="form-container max-h-[calc(100vh-200px)] overflow-y-auto shadow-lg border-2 border-gray-500 dark:border-gray-400 rounded-xl max-w-lg">

                    <!-- Step 1: Email Input -->
                    <div v-show="currentStep === 0" class="mt-1">
                        <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-5">
                            <div class="mb-6">
                                <h3 class="text-xl font-bold text-neutral-800 dark:text-white">Enter Your Email</h3>
                                <p class="text-neutral-600 dark:text-neutral-400 mt-1">
                                    We'll send a password reset link to your email
                                </p>
                            </div>

                            <n-form ref="resetFormRef" :model="resetForm" :rules="resetRules" label-placement="top">
                                <!-- Email -->
                                <n-form-item label="Email Address" path="email">
                                    <n-input 
                                        v-model:value="resetForm.email" 
                                        type="email"
                                        placeholder="Enter your email address" 
                                        :disabled="uiStore.isLoading(AUTH_OPERATIONS.USER_RESET_PASSWORD)"
                                    />
                                </n-form-item>

                                <div
                                    class="flex justify-end mt-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                    <Button 
                                        label="Send Reset Link" 
                                        icon="pi pi-envelope" 
                                        @click="validateEmail"
                                        class="w-full"
                                        :loading="uiStore.isLoading(AUTH_OPERATIONS.USER_RESET_PASSWORD)"
                                        :disabled="uiStore.isLoading(AUTH_OPERATIONS.USER_RESET_PASSWORD)"
                                    />
                                </div>
                            </n-form>
                        </div>
                    </div>

                    <!-- Step 2: Success Message -->
                    <div v-show="currentStep === 1">
                        <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg py-5 px-3 text-center">
                            <div class="flex justify-center mb-6">
                                <div
                                    class="size-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <i class="pi pi-check text-3xl text-green-600 dark:text-green-400"></i>
                                </div>
                            </div>

                            <div class="mb-6">
                                <h3 class="text-2xl font-bold text-neutral-800 dark:text-white">Check Your Email</h3>
                                <p class="text-neutral-600 dark:text-neutral-400 mt-1">
                                    Reset link sent successfully
                                </p>
                            </div>

                            <p class="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                                We've sent a password reset link to <strong class="text-primary">{{ resetForm.email
                                    }}</strong>.
                                Please check your email and click the link to reset your password.
                            </p>

                            <div class="space-y-4">
                                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                                    Didn't receive the email? Check your spam folder or
                                    <button @click="resendEmail" class="text-primary hover:underline">
                                        click here to resend
                                    </button>.
                                </p>

                                <div class="flex gap-4 justify-center">
                                    <Button 
                                        label="Back to Login" 
                                        icon="pi pi-sign-in" 
                                        severity="contrast"
                                        @click="goToLogin" 
                                    />
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
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firebaseInit'
import Button from 'primevue/button'
import { useAuthStore, AUTH_OPERATIONS } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { formatAnyErrorForDisplay, isFormValidationError } from '@/utils/errorFormatter' // Updated import

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const uiStore = useUiStore()

// Random background images
const images = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoQNwBVEvy0ww5JGRPoYshfGDaxkFgUzrCI4wOcmqWT_BJeoDW-LXdiHj4VF01-UREo6WyAp_dl6UZpizqwJ1m_Xhvj9wxl3dvN-xn_htfgs67iixvGPJoxt04r7kk7mFxzbnxmKNKVtrHpqmSxELTN_J9PRh0TFErf8CyekCCYEwVgK47H2kNSehWs5bOURHQl1KVDyLvYXYBPW6gMKnNS_6Dks0zrW75p_IBqXVb7kluPTpC5mfONvwd6teoTywBpeiue6Y2u_dR',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA2XJy7JRPHkDV4YDiJt6drHq9HnNfLw08zlPrCZV9hf4VaNERVG2zr63VsYgVqAOKDowJWxaEfkFLV1YWxpSIIHc0vaGBHCPUhHzChx-pdxBMZLwAzWlL1OeIVEkLRJOHLs2NU90O-hees9lCWF1t-VcERyd0-1XcB1GIzEj5I3eYcsO_ZEQMywhnsyitjp7pjKWx6JIdZqUTAD82hdBnn9nJ8D6OW-c4mguQ_AFrJzEp-O0K8EQ9Bc4JeJsdtZbqTxoiW'
]

const randomImage = ref('')
const resetFormRef = ref(null)
const currentStep = ref(0)

// Reset Form
const resetForm = ref({
    email: ''
})

// Validation Rules (keep this)
const resetRules = {
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
    }
}

// Methods
const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}

const nextStep = () => {
    if (currentStep.value < 1) {
        currentStep.value++
    }
}

const validateEmail = async () => {
    try {
        // First validate the form
        await resetFormRef.value?.validate()
        
        // If validation passes, proceed with password reset
        await authStore.userResetPassword(resetForm.value.email)
        
        // Show success message
        message.success('Password reset email sent! Check your inbox.')
        nextStep()
    } catch (error) {
        console.error('Password reset error:', error)
        
        // Check if it's a form validation error using the helper function
        if (isFormValidationError(error)) {
            // Show generic form validation error message
            message.error('Please ensure all form requirements are met')
        } else {
            // Use the centralized error formatter for other errors
            const formattedError = formatAnyErrorForDisplay(error)
            message.error(formattedError || 'Failed to send reset link')
        }
    }
}

const resendEmail = () => {
    validateEmail()
}

const goToLogin = () => {
    router.push({ name: 'Login' })
}

// Initialize
onMounted(() => {
    getRandomImage()
})
</script>