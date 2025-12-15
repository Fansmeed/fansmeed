/**
 * Cookie utility for cross-domain authentication flow
 * Handles cookie creation, validation, and cleanup
 */

// Cookie configuration
const COOKIE_CONFIG = {
    NAME: 'authIntent',
    MAX_AGE: 1200, // 20 minutes in seconds (20 * 60)
    PATH: '/',
    SECURE: true,
    SAMESITE: 'strict'
};

// Valid user roles
const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin'
};

// Special words for encryption validation (Caesar cipher shift-14)
const VALIDATION_WORDS = [
    'authenticate', 'authorize', 'validate', 'verify', 
    'access', 'secure', 'login', 'session', 'token'
];

/**
 * Caesar cipher encryption (shift 14)
 */
function caesarEncrypt(text) {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) { // Uppercase
            return String.fromCharCode(((code - 65 + 14) % 26) + 65);
        }
        if (code >= 97 && code <= 122) { // Lowercase
            return String.fromCharCode(((code - 97 + 14) % 26) + 97);
        }
        return char;
    }).join('');
}

/**
 * Caesar cipher decryption (shift 14)
 */
function caesarDecrypt(text) {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) { // Uppercase
            return String.fromCharCode(((code - 65 - 14 + 26) % 26) + 65);
        }
        if (code >= 97 && code <= 122) { // Lowercase
            return String.fromCharCode(((code - 97 - 14 + 26) % 26) + 97);
        }
        return char;
    }).join('');
}

/**
 * Generate encrypted validation token
 */
function generateValidationToken() {
    const randomWord = VALIDATION_WORDS[Math.floor(Math.random() * VALIDATION_WORDS.length)];
    const encrypted = caesarEncrypt(randomWord);
    const timestamp = Date.now().toString(36);
    return `${encrypted}_${timestamp}`;
}

/**
 * Validate encrypted token
 */
function validateToken(token) {
    if (!token || typeof token !== 'string') return false;
    
    try {
        const [encryptedWord, timestamp] = token.split('_');
        const decrypted = caesarDecrypt(encryptedWord);
        
        // Check if decrypted word is in our valid list
        if (!VALIDATION_WORDS.includes(decrypted)) {
            return false;
        }
        
        // Check if timestamp is recent (within 20 minutes)
        const tokenTime = parseInt(timestamp, 36);
        const currentTime = Date.now();
        const age = currentTime - tokenTime;
        
        return age <= (COOKIE_CONFIG.MAX_AGE * 1000);
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

/**
 * Create auth intent cookie
 */
// In cookieChecker.js - update the setAuthIntentCookie function

export function setAuthIntentCookie(userRole, redirectUrl) {
    try {
        // ✅ FIRST, check if there's already a valid cookie
        const existingCookie = getAuthIntentCookie()
        
        if (existingCookie.valid) {
            // Keep the existing cookie's redirect URL if it exists
            const finalRedirectUrl = redirectUrl || existingCookie.data.redirectUrl || '/'
            
            console.log('🍪 Preserving existing cookie with redirect:', finalRedirectUrl)
            
            // Don't overwrite - keep the existing cookie
            return true
        }
        
        // Only set new cookie if none exists
        if (!existingCookie.valid) {
            const authData = {
                userRole,
                redirectUrl: redirectUrl || '/',
                loginTimeRequest: Date.now(),
                validationToken: generateValidationToken()
            };

            const encodedData = btoa(JSON.stringify(authData));
            
            document.cookie = `${COOKIE_CONFIG.NAME}=${encodedData}; ` +
                             `path=${COOKIE_CONFIG.PATH}; ` +
                             `max-age=${COOKIE_CONFIG.MAX_AGE}; ` +
                             `secure=${COOKIE_CONFIG.SECURE}; ` +
                             `samesite=${COOKIE_CONFIG.SAMESITE}`;
            
            console.log('🍪 New auth cookie set:', { role: userRole, redirect: redirectUrl || '/' });
        }
        
        return true;
    } catch (error) {
        console.error('Failed to set auth intent cookie:', error);
        return false;
    }
}

/**
 * Read and validate auth intent cookie
 */
export function getAuthIntentCookie() {
    try {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => 
            cookie.trim().startsWith(`${COOKIE_CONFIG.NAME}=`)
        );

        if (!authCookie) {
            return {
                valid: false,
                error: 'No auth intent cookie found'
            };
        }

        const encodedData = authCookie.split('=')[1];
        const authData = JSON.parse(atob(encodedData));
        
        // Validate required fields
        if (!authData.userRole || !authData.loginTimeRequest || !authData.validationToken) {
            return {
                valid: false,
                error: 'Missing required fields in cookie'
            };
        }
        
        // Validate user role
        if (![USER_ROLES.USER, USER_ROLES.ADMIN].includes(authData.userRole)) {
            return {
                valid: false,
                error: 'Invalid user role'
            };
        }
        
        // Check timestamp
        const currentTime = Date.now();
        const cookieAge = currentTime - authData.loginTimeRequest;
        const maxAgeMs = COOKIE_CONFIG.MAX_AGE * 1000;
        
        if (cookieAge > maxAgeMs) {
            // Clean up expired cookie
            clearAuthIntentCookie();
            return {
                valid: false,
                error: 'Login attempt expired',
                expired: true
            };
        }
        
        // Validate encryption token
        if (!validateToken(authData.validationToken)) {
            return {
                valid: false,
                error: 'Invalid or corrupted authentication token'
            };
        }
        
        return {
            valid: true,
            data: {
                userRole: authData.userRole,
                redirectUrl: authData.redirectUrl,
                loginTimeRequest: authData.loginTimeRequest
            }
        };
        
    } catch (error) {
        console.error('Failed to parse auth intent cookie:', error);
        return {
            valid: false,
            error: 'Corrupted authentication data'
        };
    }
}

/**
 * Clear auth intent cookie
 */
export function clearAuthIntentCookie() {
    document.cookie = `${COOKIE_CONFIG.NAME}=; ` +
                     `path=${COOKIE_CONFIG.PATH}; ` +
                     `max-age=0; ` +
                     `expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Check if we're on the auth domain
 */
export function isAuthDomain() {
    return window.location.hostname === 'auth.fansmeed.com';
}

/**
 * Get target domain based on user role
 */
export function getTargetDomain(userRole) {
    switch (userRole) {
        case USER_ROLES.ADMIN:
            return 'cp.fansmeed.com';
        case USER_ROLES.USER:
        default:
            return 'fansmeed.com';
    }
}