/**
 * Cookie utility for reading auth intent cookies
 * With Caesar cipher decryption for security
 */

export const COOKIE_CONFIG = {
    NAME: 'authIntent',
    MAX_AGE: 1200 // 20 minutes in seconds
};

// Special words for encryption validation (Caesar cipher shift-14)
const VALIDATION_WORDS = [
    'authenticate', 'authorize', 'validate', 'verify', 
    'access', 'secure', 'login', 'session', 'token'
];

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
 * Read and validate auth intent cookie
 */
export function getAuthIntentCookie() {
    try {
        console.log('🍪 [auth] Reading cookies from:', window.location.hostname);
        console.log('🍪 [auth] All cookies:', document.cookie);
        
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => 
            cookie.trim().startsWith(`${COOKIE_CONFIG.NAME}=`)
        );

        if (!authCookie) {
            console.log('🍪 [auth] No auth intent cookie found');
            return {
                valid: false,
                error: 'No auth intent cookie found'
            };
        }

        const encodedData = authCookie.split('=')[1];
        
        try {
            const decodedData = atob(encodedData);
            const authData = JSON.parse(decodedData);
            
            // Validate required fields
            if (!authData.userRole || !authData.loginTimeRequest || !authData.validationToken) {
                console.log('🍪 [auth] Missing required fields');
                return {
                    valid: false,
                    error: 'Missing required fields in cookie'
                };
            }
            
            // Validate user role
            if (!['user', 'admin'].includes(authData.userRole)) {
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
 * Clear auth intent cookie
 */
export function clearAuthIntentCookie() {
    document.cookie = `${COOKIE_CONFIG.NAME}=; ` +
                     `domain=.fansmeed.com; ` +
                     `path=/; ` +
                     `max-age=0; ` +
                     `expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
    
    console.log('🍪 [auth] Auth cookie cleared');
}

/**
 * Get target domain based on user role
 */
export function getTargetDomain(userRole) {
    return userRole === 'admin' ? 'cp.fansmeed.com' : 'fansmeed.com';
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