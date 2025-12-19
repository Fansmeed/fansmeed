// Location: auth.fansmeed.com/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/auth/login'
        },
        {
            path: '/our-terms',
            name: 'Terms',
            component: () => import('@/views/Terms.vue'),
            meta: {
                title: "Terms and Conditions",
                public: true
            }
        },
        {
            path: '/auth/login',
            name: 'Login',
            component: () => import('@/views/Login.vue'),
            meta: {
                title: "Login",
                hideNavigation: true,
                requiresAuthContext: true // ✅ Needs type parameter or referrer
            }
        },
        {
            path: '/auth/register',
            name: 'Register',
            component: () => import('@/views/Register.vue'),
            meta: {
                title: "Register",
                hideNavigation: true,
                public: true
            }
        },
        {
            path: '/auth/reset-password',
            name: 'ResetPassword',
            component: () => import('@/views/ResetPassword.vue'),
            meta: {
                title: "Reset Password",
                hideNavigation: true,
                public: true
            }
        },
        {
            path: '/auth/complete-signin',
            name: 'CompleteSignIn',
            component: () => import('@/views/CompleteSignIn.vue'),
            meta: {
                title: "Completing Sign In",
                hideNavigation: true,
                public: true
            }
        },
        {
            path: '/auth/verify-email',
            name: 'VerifyEmail',
            component: () => import('@/views/VerifyEmail.vue'),
            meta: {
                title: "Verify Email",
                hideNavigation: true,
                public: true
            }
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'NotFound',
            component: () => import('@/components/NotFound.vue'),
            meta: {
                title: '404 | Page Not Found',
                hideNavigation: true,
                public: true
            }
        }
    ],
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition
        } else {
            return { top: 0 }
        }
    }
})

/**
 * Set document title
 */
function setDocumentTitle(to) {
    let title = to.meta.title || 'Authentication'
    document.title = `${title} | Fansmeed Auth`
}

/**
 * Check if URL has required auth context (type parameter)
 */
function hasAuthContext() {
    const urlParams = new URLSearchParams(window.location.search)
    const typeParam = urlParams.get('type')
    
    // Check if we have a valid type parameter
    if (typeParam === 'admin' || typeParam === 'user') {
        return true
    }
    
    // Check if we have a referrer from main sites
    const referrer = document.referrer
    if (referrer) {
        try {
            const referrerUrl = new URL(referrer)
            const hostname = referrerUrl.hostname
            
            if (hostname === 'cp.fansmeed.com' || hostname.startsWith('cp.')) {
                return true
            }
            
            if (hostname === 'fansmeed.com') {
                return true
            }
        } catch (error) {
            console.warn('Error parsing referrer:', error)
        }
    }
    
    return false
}

/**
 * Get login type from URL or referrer
 */
function getLoginType() {
    // First check URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    const typeParam = urlParams.get('type')
    
    if (typeParam === 'admin' || typeParam === 'user') {
        return typeParam
    }
    
    // Check referrer
    const referrer = document.referrer
    if (referrer) {
        try {
            const referrerUrl = new URL(referrer)
            const hostname = referrerUrl.hostname
            
            if (hostname === 'cp.fansmeed.com' || hostname.startsWith('cp.')) {
                return 'admin'
            }
            
            if (hostname === 'fansmeed.com') {
                return 'user'
            }
        } catch (error) {
            console.warn('Error parsing referrer:', error)
        }
    }
    
    return null
}

/**
 * Redirect to appropriate main site
 */
function redirectToMainSite(loginType = null) {
    let targetUrl = 'https://fansmeed.com/'
    
    if (loginType === 'admin') {
        targetUrl = 'https://cp.fansmeed.com/'
    }
    
    console.log(`🔄 Redirecting to main site: ${targetUrl}`)
    window.location.href = targetUrl
}

router.beforeEach(async (to, from, next) => {
    console.log(`🛣️ [Auth Router] Navigating to: ${to.name}`)
    
    // Set document title
    setDocumentTitle(to)
    
    const authStore = useAuthStore()
    
    // ✅ PUBLIC ROUTES: Allow access without any checks
    if (to.meta.public === true) {
        console.log('✅ Public route, allowing access')
        next()
        return
    }
    
    // ✅ LOGIN PAGE: Needs auth context (type parameter or referrer)
    if (to.name === 'Login') {
        if (to.meta.requiresAuthContext) {
            const hasContext = hasAuthContext()
            
            if (!hasContext) {
                console.warn('⚠️ Login page accessed without auth context')
                
                // Show error on the login page itself instead of redirecting
                // The Login.vue component will handle showing the error message
                next()
                return
            }
            
            console.log('✅ Login page has auth context')
        }
        
        next()
        return
    }
    
    // Initialize auth store if needed
    if (!authStore.authChecked) {
        console.log('🔐 Initializing auth store...')
        await authStore.initialize()
    }
    
    // If user is already authenticated via Firebase, redirect to target app
    if (authStore.isAuthenticated) {
        console.log('✅ User already authenticated, redirecting to target app')
        
        // Don't let authenticated users access auth pages
        if (['Login', 'Register', 'ResetPassword', 'VerifyEmail'].includes(to.name)) {
            // Determine where to redirect based on user role
            const loginType = authStore.userRole || 'user'
            redirectToMainSite(loginType)
            return
        }
    }
    
    next()
})

// Handle navigation errors
router.onError((error, to, from) => {
    console.error('❌ [Auth Router] Navigation error:', error)
    console.error('❌ [Auth Router] To:', to)
    console.error('❌ [Auth Router] From:', from)
    
    // If it's a chunk load error, try reloading
    if (error && error.message && error.message.includes('Failed to fetch dynamically imported module')) {
        console.log('🔄 [Auth Router] Chunk load error detected, reloading page...')
        window.location.reload()
    }
})

// Initialize after router is ready
router.isReady().then(() => {
    console.log('✅ [Auth Router] Router is ready')
    
    // Set initial title
    if (router.currentRoute.value.meta?.title) {
        setDocumentTitle(router.currentRoute.value)
    }
})

export default router