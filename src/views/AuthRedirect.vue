<!-- Location: auth.fansmeed.com/src/views/AuthRedirect.vue -->
<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center">
            <div class="mb-6">
                <ProgressSpinner style="width: 60px; height: 60px" />
            </div>
            <h2 class="text-xl font-semibold text-gray-700 mb-2">Setting up your session...</h2>
            <p class="text-gray-500">Please wait while we authenticate you.</p>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ProgressSpinner from 'primevue/progressspinner'

const route = useRoute()

onMounted(() => {
    // Get token and redirect from query params
    const token = route.query.token
    const redirectUrl = route.query.redirectUrl
    
    if (!token || !redirectUrl) {
        console.error('Missing token or redirect URL')
        window.location.href = '/auth/login?error=invalid_redirect'
        return
    }
    
    console.log('🔗 Redirecting with token to:', redirectUrl)
    
    // Build Cloud Function URL
    const cloudFunctionUrl = `https://us-central1-fansmeed-quiz-app.cloudfunctions.net/setSessionCookie?token=${encodeURIComponent(token)}&redirectUrl=${encodeURIComponent(redirectUrl)}`
    
    // Redirect to Cloud Function after a brief delay
    setTimeout(() => {
        window.location.href = cloudFunctionUrl
    }, 1000)
})
</script>