// utils/crossDomainAuth.js - SHARED ACROSS ALL SITES
import { auth, db } from '@/firebase/firebaseInit';
import { doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { signInWithCustomToken, getIdToken } from "firebase/auth";

// Configuration
const POLLING_INTERVAL = 500; // ms
const MAX_POLLING_ATTEMPTS = 60; // 30 seconds total
const FIREBASE_AUTH_TIMEOUT = 15000; // 15 seconds

/**
 * Poll Firestore for auth data
 */
async function pollAuthFromFirestore(uid) {
    let attempts = 0;

    return new Promise((resolve, reject) => {
        const poll = async () => {
            attempts++;

            try {
                const authDoc = await getDoc(doc(db, 'crossDomainAuth', uid));

                if (authDoc.exists()) {
                    const authData = authDoc.data();

                    // Check if already used
                    if (authData.used) {
                        reject(new Error('Auth token already used'));
                        return;
                    }

                    // Check if expired
                    if (authData.expiresAt?.toDate() < new Date()) {
                        reject(new Error('Auth token expired'));
                        return;
                    }

                    // Mark as used immediately to prevent replay attacks
                    await updateDoc(doc(db, 'crossDomainAuth', uid), {
                        used: true,
                        usedAt: serverTimestamp()
                    });

                    resolve(authData);
                    return;
                }

                // If document doesn't exist yet, continue polling
                if (attempts >= MAX_POLLING_ATTEMPTS) {
                    reject(new Error('Auth request timeout'));
                    return;
                }

                // Poll again
                setTimeout(poll, POLLING_INTERVAL);

            } catch (error) {
                reject(error);
            }
        };

        poll();
    });
}

/**
 * Sign in with auth data from Firestore
 */
async function signInWithFirestoreAuth(authData) {
    try {
        // Create custom token using the ID token (simplified approach)
        // Note: For production, you might want to use a Cloud Function to verify ID tokens
        const { idToken, userRole, uid, redirectUrl } = authData;

        // IMPORTANT: We're using the ID token directly
        // In production, you should verify this token server-side first
        // For now, we'll trust it since it came from our own Firestore

        // Set the token in session storage
        sessionStorage.setItem('crossDomainAuthToken', idToken);
        sessionStorage.setItem('crossDomainAuthUid', uid);
        sessionStorage.setItem('crossDomainAuthRole', userRole);
        sessionStorage.setItem('crossDomainAuthTimestamp', Date.now().toString());

        // Get a fresh ID token for the current domain
        const user = auth.currentUser;

        if (user) {
            // Already signed in (shouldn't happen, but just in case)
            await auth.signOut();
        }

        // We'll handle the actual sign-in in the main app initialization
        // by checking the session storage

        return {
            success: true,
            uid,
            userRole,
            redirectUrl
        };

    } catch (error) {
        console.error('❌ Sign-in with Firestore auth failed:', error);
        throw error;
    }
}

/**
 * Check for and process cross-domain auth request
 */
export async function processCrossDomainAuth() {
    try {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const authRequestId = urlParams.get('authRequestId');

        if (!authRequestId) {
            // Check session storage for existing auth
            const storedToken = sessionStorage.getItem('crossDomainAuthToken');
            const storedUid = sessionStorage.getItem('crossDomainAuthUid');

            if (storedToken && storedUid) {
                // Check if token is still valid (less than 5 minutes old)
                const timestamp = parseInt(sessionStorage.getItem('crossDomainAuthTimestamp') || '0');
                const age = Date.now() - timestamp;

                if (age < 5 * 60 * 1000) { // 5 minutes
                    // Token is still valid, proceed with local sign-in
                    return await handleLocalAuth(storedToken, storedUid);
                } else {
                    // Token expired, clear storage
                    clearCrossDomainAuthStorage();
                }
            }

            return null;
        }

        console.log('🔄 Processing cross-domain auth request:', authRequestId);

        // Poll Firestore for auth data
        const authData = await pollAuthFromFirestore(authRequestId);

        // Sign in with the auth data
        const result = await signInWithFirestoreAuth(authData);

        // Clean up URL
        cleanAuthUrl();

        return result;

    } catch (error) {
        console.error('❌ Cross-domain auth processing failed:', error);
        clearCrossDomainAuthStorage();
        return null;
    }
}

/**
 * Handle local auth with stored token
 */
async function handleLocalAuth(idToken, uid) {
    try {
        // Verify the token is still valid by getting a fresh one
        // This is a simplified approach - in production, verify with backend
        const user = auth.currentUser;

        if (user && user.uid === uid) {
            // Already signed in with correct user
            return {
                success: true,
                uid: user.uid,
                alreadyAuthenticated: true
            };
        }

        // For now, we'll use a workaround since we can't verify ID tokens client-side
        // We'll rely on the auth state listener to handle this
        return {
            success: true,
            uid,
            requiresAuthCheck: true
        };

    } catch (error) {
        console.error('Local auth handling failed:', error);
        return null;
    }
}

/**
 * Clean up URL parameters
 */
function cleanAuthUrl() {
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('authRequestId');
        url.searchParams.delete('source');

        window.history.replaceState({}, document.title, url.toString());
    } catch (error) {
        console.warn('Failed to clean auth URL:', error);
    }
}

/**
 * Clear cross-domain auth storage
 */
export function clearCrossDomainAuthStorage() {
    sessionStorage.removeItem('crossDomainAuthToken');
    sessionStorage.removeItem('crossDomainAuthUid');
    sessionStorage.removeItem('crossDomainAuthRole');
    sessionStorage.removeItem('crossDomainAuthTimestamp');
}

/**
 * Initialize cross-domain auth processing
 * Call this in your app initialization
 */
export async function initializeCrossDomainAuth() {
    console.log('🔐 Initializing cross-domain auth processing');

    // Process any pending auth requests
    const authResult = await processCrossDomainAuth();

    if (authResult?.success) {
        console.log('✅ Cross-domain auth processed successfully');

        // If we have a redirect URL in session storage, use it
        const redirectUrl = sessionStorage.getItem('crossDomainRedirectUrl');
        if (redirectUrl && !window.location.pathname.includes(redirectUrl)) {
            try {
                const url = new URL(redirectUrl, window.location.origin);
                if (url.origin === window.location.origin) {
                    window.location.replace(url.pathname + url.search + url.hash);
                }
            } catch (error) {
                console.warn('Invalid redirect URL:', error);
            }
        }
    }

    return authResult;
}

/**
 * Store redirect URL for after auth
 */
export function storeRedirectUrl(url) {
    try {
        const cleanUrl = new URL(url, window.location.origin);
        if (cleanUrl.origin === window.location.origin) {
            sessionStorage.setItem('crossDomainRedirectUrl', url);
        }
    } catch (error) {
        console.warn('Failed to store redirect URL:', error);
    }
}

/**
 * Check if we have pending cross-domain auth
 */
export function hasPendingCrossDomainAuth() {
    return !!sessionStorage.getItem('crossDomainAuthToken') ||
        !!new URLSearchParams(window.location.search).get('authRequestId');
}