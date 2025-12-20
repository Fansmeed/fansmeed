// Location: ALL SITES/src/config.js
// Environment-aware configuration - USING YOUR PORTS
const isLocal = window.location.hostname === 'localhost';

export const ENV = {
    // Auth Hub URL
    authHub: isLocal ? 'http://localhost:3002' : 'https://auth.fansmeed.com',

    // App URLs - USING YOUR PORTS
    apps: {
        admin: isLocal ? 'http://localhost:3000' : 'https://cp.fansmeed.com',
        user: isLocal ? 'http://localhost:3001' : 'https://fansmeed.com'
    },

    // Cloud Function endpoints
    functions: {
        issuePassport: 'https://us-central1-fansmeed-quiz-app.cloudfunctions.net/issuePassport',
        setSessionCookie: 'https://us-central1-fansmeed-quiz-app.cloudfunctions.net/setSessionCookie',
        verifySession: 'https://us-central1-fansmeed-quiz-app.cloudfunctions.net/verifySessionHttp'
    }
};

// Helper to identify which site we're on - USING YOUR PORTS
export const getMyType = () => {
    const hostname = window.location.hostname;

    if (isLocal) {
        // Local development - USING YOUR PORTS
        const port = window.location.port;
        if (port === '3000') return 'admin';
        if (port === '3001') return 'user';
        return 'auth'; // auth hub (port 3002)
    }

    // Production
    if (hostname.includes('cp.') || hostname === 'cp.fansmeed.com') return 'admin';
    if (hostname.includes('auth.')) return 'auth';
    return 'user';
};

// Get the appropriate URL for current environment
export const getAppUrl = (type) => {
    if (type === 'admin') return ENV.apps.admin;
    if (type === 'user') return ENV.apps.user;
    return ENV.authHub;
};

// Get current app URL
export const getCurrentAppUrl = () => {
    const myType = getMyType();
    return getAppUrl(myType);
};

// Check if we're on the auth hub
export const isAuthHub = () => getMyType() === 'auth';

// Check if we're on an admin site
export const isAdminSite = () => getMyType() === 'admin';

// Check if we're on a user site
export const isUserSite = () => getMyType() === 'user';

// Build redirect URL with proper environment
export const buildRedirectUrl = (type, path = '/') => {
    const baseUrl = getAppUrl(type);
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};