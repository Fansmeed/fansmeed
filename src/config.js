// Location: auth.fansmeed.com/src/config.js
const isLocal = window.location.hostname === 'localhost';

export const ENV = {
    // Auth Hub URL
    authHub: isLocal ? 'http://localhost:3002' : 'https://auth.fansmeed.com',

    // App URLs
    apps: {
        admin: isLocal ? 'http://localhost:3000' : 'https://cp.fansmeed.com',
        user: isLocal ? 'http://localhost:3001' : 'https://fansmeed.com'
    },

    // Cloud Function endpoints
    functions: {
        issuePassport: 'https://us-central1-fansmeed-quiz-app.cloudfunctions.net/issuePassport',
        setSessionCookie: 'https://us-central1-fansmeed-quiz-app.cloudfunctions.net/setSessionCookie',
        verifySession: 'https://us-central1-fansmeed-quiz-app.cloudfunctions.net/verifySessionHttp',
        exchangeToken: 'https://us-central1-fansmeed-quiz-app.cloudfunctions.net/exchangeToken'
    }
};

// Helper to identify which site we're on
export const getMyType = () => {
    const hostname = window.location.hostname;

    if (isLocal) {
        const port = window.location.port;
        if (port === '3000') return 'admin';
        if (port === '3001') return 'user';
        return 'auth';
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

// Build redirect URL with proper environment
export const buildRedirectUrl = (type, path = '/') => {
    const baseUrl = getAppUrl(type);
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

// Build auth redirect URL with token (Passport Handoff)
export const buildAuthRedirectWithToken = (type, token, role, redirectPath = '/') => {
    const baseUrl = getAppUrl(type);
    const url = new URL(baseUrl);
    
    // Add token and role as query parameters
    url.searchParams.set('token', token);
    url.searchParams.set('role', role);
    url.searchParams.set('source', 'auth_hub');
    
    // Add redirect path if not root
    if (redirectPath && redirectPath !== '/') {
        url.pathname = redirectPath;
    }
    
    return url.toString();
};