// Location: auth.fansmeed.com/src/utils/subdomainDetector.js
import { ENV } from '@/config'

/**
 * Detect user type based on URL parameters or referrer
 */
export function detectLoginType() {
    console.log('🔍 Detecting login type...')
    
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
            
            // Check against ENV config
            const adminDomain = ENV.apps.admin.replace('http://', '').replace('https://', '').split('/')[0];
            const userDomain = ENV.apps.user.replace('http://', '').replace('https://', '').split('/')[0];
            
            if (hostname === adminDomain || hostname.includes('cp.')) {
                console.log('✅ Login type from referrer: admin');
                return 'admin';
            }
            
            if (hostname === userDomain) {
                console.log('✅ Login type from referrer: user');
                return 'user';
            }
        } catch (error) {
            console.warn('Error parsing referrer:', error);
        }
    }
    
    // 3. No referrer or type param
    console.log('⚠️ Direct access to auth domain - type unknown');
    return 'unknown';
}

/**
 * Get target domain based on user type
 */
export function getTargetDomain(userType) {
    if (userType === 'admin') return ENV.apps.admin;
    return ENV.apps.user;
}

/**
 * Get redirect URL from query params
 */
export function getRedirectUrlFromParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    
    if (redirectUrl) {
        try {
            const url = new URL(redirectUrl);
            const allowedDomains = [
                ENV.apps.admin.replace('http://', '').replace('https://', '').split('/')[0],
                ENV.apps.user.replace('http://', '').replace('https://', '').split('/')[0]
            ];
            
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
    
    console.log('✅ Using default redirect URL');
    return null;
}