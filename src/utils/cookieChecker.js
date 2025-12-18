/**
 * Cookie utility for cross-domain authentication flow
 * Handles cookie creation, validation, and cleanup
 */

// Cookie configuration - FIXED FOR CROSS-DOMAIN
const COOKIE_CONFIG = {
    NAME: 'authIntent',
    MAX_AGE: 1200, // 20 minutes in seconds (20 * 60)
    PATH: '/',
    SECURE: true,
    SAMESITE: 'none', // Changed to 'none' for cross-domain
    DOMAIN: '.fansmeed.com' // Added domain for cross-subdomain sharing
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
 * Create auth intent cookie - FIXED VERSION
 */
export function setAuthIntentCookie(userRole, redirectUrl) {
    try {
        console.log('🍪 [auth] Setting auth cookie for role:', userRole);
        console.log('🍪 [auth] Redirect URL:', redirectUrl);
        
        const authData = {
            userRole,
            redirectUrl: redirectUrl || window.location.origin,
            loginTimeRequest: Date.now(),
            validationToken: generateValidationToken(),
            source: 'auth.fansmeed.com',
            timestamp: Date.now()
        };

        const encodedData = btoa(JSON.stringify(authData));
        
        // CRITICAL: Must include domain for cross-subdomain access
        const cookieString = `${COOKIE_CONFIG.NAME}=${encodedData}; ` +
                           `domain=${COOKIE_CONFIG.DOMAIN}; ` +
                           `path=${COOKIE_CONFIG.PATH}; ` +
                           `max-age=${COOKIE_CONFIG.MAX_AGE}; ` +
                           `secure=${COOKIE_CONFIG.SECURE}; ` +
                           `samesite=${COOKIE_CONFIG.SAMESITE}`;
        
        console.log('🍪 [auth] Setting cookie:', cookieString);
        document.cookie = cookieString;
        
        // Debug: Verify cookie was set
        console.log('🍪 [auth] Current cookies after set:', document.cookie);
        
        return true;
    } catch (error) {
        console.error('Failed to set auth intent cookie:', error);
        return false;
    }
}

/**
 * Read and validate auth intent cookie - FIXED VERSION
 */
export function getAuthIntentCookie() {
    try {
        console.log('🍪 [auth] Reading cookies from:', window.location.hostname);
        console.log('🍪 [auth] All cookies:', document.cookie);
        
        const cookies = document.cookie.split(';');
        console.log('🍪 [auth] Split cookies:', cookies);
        
        const authCookie = cookies.find(cookie => 
            cookie.trim().startsWith(`${COOKIE_CONFIG.NAME}=`)
        );

        console.log('🍪 [auth] Found auth cookie:', authCookie);

        if (!authCookie) {
            console.log('🍪 [auth] No auth intent cookie found');
            return {
                valid: false,
                error: 'No auth intent cookie found'
            };
        }

        const encodedData = authCookie.split('=')[1];
        console.log('🍪 [auth] Encoded data:', encodedData);
        
        try {
            // Decode with padding fix
            const decodedData = atob(encodedData.replace(/\s/g, ''));
            console.log('🍪 [auth] Decoded data:', decodedData);
            
            const authData = JSON.parse(decodedData);
            console.log('🍪 [auth] Parsed auth data:', authData);
            
            // Validate required fields
            if (!authData.userRole || !authData.loginTimeRequest || !authData.validationToken) {
                console.log('🍪 [auth] Missing required fields');
                return {
                    valid: false,
                    error: 'Missing required fields in cookie'
                };
            }
            
            // Validate user role
            if (![USER_ROLES.USER, USER_ROLES.ADMIN].includes(authData.userRole)) {
                console.log('🍪 [auth] Invalid user role:', authData.userRole);
                return {
                    valid: false,
                    error: 'Invalid user role'
                };
            }
            
            // Check timestamp
            const currentTime = Date.now();
            const cookieAge = currentTime - authData.loginTimeRequest;
            const maxAgeMs = COOKIE_CONFIG.MAX_AGE * 1000;
            
            console.log('🍪 [auth] Cookie age:', cookieAge, 'ms, Max age:', maxAgeMs, 'ms');
            
            if (cookieAge > maxAgeMs) {
                console.log('🍪 [auth] Cookie expired');
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
                console.log('🍪 [auth] Invalid validation token');
                return {
                    valid: false,
                    error: 'Invalid or corrupted authentication token'
                };
            }
            
            console.log('🍪 [auth] Cookie is valid, role:', authData.userRole);
            console.log('🍪 [auth] Redirect URL:', authData.redirectUrl);
            
            return {
                valid: true,
                data: {
                    userRole: authData.userRole,
                    redirectUrl: authData.redirectUrl,
                    loginTimeRequest: authData.loginTimeRequest,
                    source: authData.source
                }
            };
            
        } catch (parseError) {
            console.error('🍪 [auth] Cookie parse error:', parseError);
            return {
                valid: false,
                error: 'Corrupted authentication data'
            };
        }
        
    } catch (error) {
        console.error('Failed to parse auth intent cookie:', error);
        return {
            valid: false,
            error: 'Corrupted authentication data'
        };
    }
}

/**
 * Clear auth intent cookie - FIXED VERSION
 */
export function clearAuthIntentCookie() {
    document.cookie = `${COOKIE_CONFIG.NAME}=; ` +
                     `domain=${COOKIE_CONFIG.DOMAIN}; ` +
                     `path=${COOKIE_CONFIG.PATH}; ` +
                     `max-age=0; ` +
                     `expires=Thu, 01 Jan 1970 00:00:00 GMT; ` +
                     `samesite=${COOKIE_CONFIG.SAMESITE}`;
    
    console.log('🍪 [auth] Auth cookie cleared');
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

/**
 * Build redirect URL after authentication
 */
export function buildRedirectUrl(userRole, redirectFromCookie = null) {
    const targetDomain = getTargetDomain(userRole);
    let redirectPath = '/';
    
    // Use the redirect URL from cookie if available and valid
    if (redirectFromCookie) {
        try {
            const url = new URL(redirectFromCookie);
            // Only use if it's from the target domain
            if (url.hostname.includes(targetDomain)) {
                redirectPath = url.pathname + url.search;
            }
        } catch (error) {
            console.log('Invalid redirect URL in cookie:', error);
        }
    }
    
    return `https://${targetDomain}${redirectPath}`;
}


export function buildCrossDomainRedirectUrl(userRole, authRequestId) {
    const targetDomain = getTargetDomain(userRole);
    const baseUrl = `https://${targetDomain}/`;
    
    // Add auth request ID to URL
    const url = new URL(baseUrl);
    url.searchParams.set('authRequestId', authRequestId);
    url.searchParams.set('source', 'auth.fansmeed.com');
    
    return url.toString();
}