<template>
    <div class="flex flex-col lg:flex-row">
        <!-- Content Section - Takes remaining space with left margin on desktop -->
        <div class="items-center flex-1">
            <div> <!-- Login Form -->
                <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 max-w-lg">
                    <n-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-placement="top">
                        <div class="space-y-6">
                            <!-- User ID Input -->
                            <n-form-item label="Admin ID" path="userId">
                                <n-input v-model:value="loginForm.userId" placeholder="Enter your admin ID" size="large"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.ADMIN_SEND_LINK)"
                                    @keyup.enter="handleLogin">
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
                                <Button label="Sign In" icon="pi pi-send" class="w-full" @click="handleLogin"
                                    :loading="uiStore.isLoading(AUTH_OPERATIONS.ADMIN_SEND_LINK)"
                                    :disabled="uiStore.isLoading(AUTH_OPERATIONS.ADMIN_SEND_LINK)" severity="info" />
                            </div>
                        </div>
                    </n-form>
                </div>

                <!-- Error Display will be handled by message system -->
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import Button from 'primevue/button'
import { useAuthStore, AUTH_OPERATIONS } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { formatAnyErrorForDisplay, isFormValidationError } from '@/utils/errorFormatter'

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

// Methods
const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}

const handleLogin = async () => {
    try {
        // First validate the form
        await loginFormRef.value?.validate()

        // If validation passes, proceed with sending login link
        const result = await authStore.adminSendLoginLink(loginForm.value.userId)
        
        // Use Naive UI message instead of successMessage div
        message.success(result.message || 'Login link sent successfully! Check your email.')

        // Clear form after successful submission
        loginForm.value.userId = ''

    } catch (error) {
        console.error('Admin login error:', error)

        // Check if it's a form validation error
        if (isFormValidationError(error)) {
            // Show generic form validation error message
            message.error('Please ensure all form requirements are met')
        } else {
            // Use the centralized error formatter for other errors
            const formattedError = formatAnyErrorForDisplay(error)
            message.error(formattedError || 'Failed to send login link')
        }
    }
}

// Initialize
onMounted(() => {
    getRandomImage()
    // Clear any existing errors on mount
    uiStore.clearError(AUTH_OPERATIONS.ADMIN_SEND_LINK)
})
</script>