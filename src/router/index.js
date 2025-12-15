import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { getAuthIntentCookie, clearAuthIntentCookie, setAuthIntentCookie } from '@/utils/cookieChecker'

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
			component: () => import('../views/Terms.vue'),
			meta: {
				title: "Terms and Conditions",
                public: true // ✅ NO cookie needed - public registration

			},
		},
        {
            path: '/auth/login',
            name: 'Login',
            component: () => import('@/views/Login.vue'),
            meta: {
                title: "Login",
                hideNavigation: true,
                requiresAuthCookie: true // ✅ NEEDS cookie to know user vs admin
            }
        },
        {
            path: '/auth/register',
            name: 'Register',
            component: () => import('@/views/Register.vue'),
            meta: {
                title: "Register",
                hideNavigation: true,
                public: true // ✅ NO cookie needed - public registration
            }
        },
        {
            path: '/auth/reset-password',
            name: 'ResetPassword',
            component: () => import('@/views/ResetPassword.vue'),
            meta: {
                title: "Reset Password",
                hideNavigation: true,
                public: true // ✅ NO cookie needed - public reset
            }
        },
        {
            path: '/auth/complete-signin',
            name: 'CompleteSignIn',
            component: () => import('@/views/CompleteSignIn.vue'),
            meta: {
                title: "Completing Sign In",
                hideNavigation: true,
                public: true // ✅ Public - handles email link auth
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
            path: '/:pathMatch(.*)',
            name: 'NotFound',
            component: () => import('@/components/NotFound.vue'),
            meta: {
                title: '404 | Page Not Found',
                description: '404 | Page not found.',
                hideNavigation: true
            }
        }
    ]
})

function setDocumentTitle(to) {
    let title = to.meta.title || 'Fansmeed Auth'
    document.title = `${title} | Fansmeed Auth`
}

router.beforeEach(async (to, from, next) => {
    setDocumentTitle(to)
    
    const authStore = useAuthStore()
    
    // ✅ PUBLIC ROUTES: Allow access without any checks
    if (to.meta.public) {
        // For register route, we can optionally set a user cookie
        // so after registration they can login as user
        if (to.name === 'Register') {
            // Check if there's already a cookie
            const cookieResult = getAuthIntentCookie()
            if (!cookieResult.valid) {
                // Set a temporary user cookie for smooth flow
                setAuthIntentCookie('user', '/')
            }
        }
        
        next()
        return
    }
    
    // ✅ LOGIN PAGE: Needs auth cookie
    if (to.name === 'Login') {
        const cookieResult = getAuthIntentCookie()
        
        if (!cookieResult.valid) {
            // No valid cookie - user accessed login page directly
            // We'll let them in but show a warning/instructions
            console.warn('Login page accessed without valid auth cookie')
            // We can set a default user cookie or show options
        }
        
        next()
        return
    }
    
    // Check if already authenticated via Firebase
    if (!authStore.authChecked) {
        await authStore.initialize()
    }
    
    // If user is already authenticated, redirect them to target app
    if (authStore.isAuthenticated) {
        // Don't let authenticated users access auth pages
        if (to.name === 'Login' || to.name === 'Register' || to.name === 'ResetPassword') {
            authStore.redirectToTargetApp()
            return
        }
    }
    
    next()
})

export default router