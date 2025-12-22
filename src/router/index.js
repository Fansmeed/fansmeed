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
                requiresAuthContext: true
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
 * Check if URL has required auth context
 */
function hasAuthContext() {
    const urlParams = new URLSearchParams(window.location.search)
    const typeParam = urlParams.get('type')
    
    if (typeParam === 'admin' || typeParam === 'user') {
        return true
    }
    
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
            // Handle post-login redirect
            await authStore.handlePostLoginRedirect()
            return
        }
    }
    
    next()
})

// Handle navigation errors
router.onError((error, to, from) => {
    console.error('❌ [Auth Router] Navigation error:', error)
    
    if (error && error.message && error.message.includes('Failed to fetch dynamically imported module')) {
        console.log('🔄 [Auth Router] Chunk load error detected, reloading page...')
        window.location.reload()
    }
})

// Initialize after router is ready
router.isReady().then(() => {
    console.log('✅ [Auth Router] Router is ready')
    
    if (router.currentRoute.value.meta?.title) {
        setDocumentTitle(router.currentRoute.value)
    }
})

export default router