// Location: auth.fansmeed.com/src/utils/subdomainDetector.js

/**
 * Detect user type based on URL parameters or referrer
 * @returns {string} 'admin', 'user', or 'unknown'
 */
export function detectLoginType() {
    console.log('🔍 Detecting login type...');
    
    // 1. First check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    
    console.log('🔍 URL type parameter:', typeParam);
    
    if (typeParam === 'admin' || typeParam === 'user') {
        console.log(`✅ Login type from URL: ${typeParam}`);
        return typeParam;
    }
    
    // 2. Check referrer if available
    const referrer = document.referrer;
    console.log('🔍 Document referrer:', referrer);
    
    if (referrer) {
        try {
            const referrerUrl = new URL(referrer);
            const hostname = referrerUrl.hostname;
            
            console.log('🔍 Referrer hostname:', hostname);
            
            if (hostname === 'cp.fansmeed.com' || hostname.startsWith('cp.')) {
                console.log('✅ Login type from referrer: admin');
                return 'admin';
            }
            
            if (hostname === 'fansmeed.com') {
                console.log('✅ Login type from referrer: user');
                return 'user';
            }
        } catch (error) {
            console.warn('Error parsing referrer:', error);
        }
    }
    
    // 3. No referrer or type param - direct access to auth.fansmeed.com
    console.log('⚠️ Direct access to auth domain - type unknown');
    return 'unknown';
}

/**
 * Get target domain based on user type
 */
export function getTargetDomain(userType) {
    return userType === 'admin' ? 'cp.fansmeed.com' : 'fansmeed.com';
}

/**
 * Build redirect URL after auth
 */
export function buildRedirectUrl(userType, redirectParam = null) {
    let redirectUrl = redirectParam || `https://${getTargetDomain(userType)}/`;
    
    console.log(`🔗 Building redirect URL for ${userType}:`, redirectParam);
    
    // Validate URL for security
    try {
        const url = new URL(redirectUrl);
        const allowedDomains = ['cp.fansmeed.com', 'fansmeed.com'];
        
        if (!allowedDomains.some(domain => 
            url.hostname === domain || url.hostname.endsWith(`.${domain}`)
        )) {
            console.warn('⚠️ Invalid redirect domain, using default');
            redirectUrl = `https://${getTargetDomain(userType)}/`;
        }
    } catch (error) {
        console.warn('⚠️ Invalid redirect URL:', error);
        redirectUrl = `https://${getTargetDomain(userType)}/`;
    }
    
    console.log(`✅ Final redirect URL: ${redirectUrl}`);
    return redirectUrl;
}

/**
 * Get redirect URL from query params with fallback
 */
export function getRedirectUrlFromParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    
    if (redirectUrl) {
        try {
            const url = new URL(redirectUrl);
            const allowedDomains = ['cp.fansmeed.com', 'fansmeed.com'];
            
            if (allowedDomains.some(domain => 
                url.hostname === domain || url.hostname.endsWith(`.${domain}`)
            )) {
                console.log('✅ Using redirect URL from params:', redirectUrl);
                return redirectUrl;
            }
        } catch (error) {
            console.warn('Invalid redirect URL in params:', error);
        }
    }
    
    // Default to home page
    console.log('✅ Using default redirect URL');
    return null;
}