// functions/setSessionCookie/sessionManager.js
const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

/**
 * Generate a secure session token
 */
function generateSessionToken(userId, role) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const data = `${userId}:${role}:${timestamp}:${random}`;
    const hmac = crypto.createHmac('sha256', SESSION_SECRET);
    hmac.update(data);
    return `${data}:${hmac.digest('hex')}`;
}

/**
 * Validate session token
 */
function validateSessionToken(token) {
    try {
        const parts = token.split(':');
        if (parts.length !== 5) return null;

        const [userId, role, timestamp, random, signature] = parts;
        const data = `${userId}:${role}:${timestamp}:${random}`;
        const hmac = crypto.createHmac('sha256', SESSION_SECRET);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex');

        if (signature !== expectedSignature) return null;

        // Check if session is expired
        const sessionAge = Date.now() - parseInt(timestamp);
        const maxAge = SESSION_DURATION * 1000;

        if (sessionAge > maxAge) return null;

        return { 
            userId, 
            role, 
            timestamp: parseInt(timestamp),
            random 
        };
    } catch (error) {
        console.error('Session validation error:', error);
        return null;
    }
}

/**
 * Build cookie header for cross-subdomain
 */
function buildCookieHeader(sessionToken, maxAge = SESSION_DURATION) {
    // For cross-subdomain: use root domain without leading dot
    return [
        `${COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
        `Domain=fansmeed.com`,  // Root domain for all subdomains
        `Path=/`,
        `Max-Age=${maxAge}`,
        `HttpOnly`,
        `Secure`,                // Requires HTTPS
        `SameSite=None`         // For cross-domain cookies
    ].join('; ');
}

/**
 * Build clear cookie header
 */
function buildClearCookieHeader() {
    return [
        `${COOKIE_NAME}=`,
        `Domain=fansmeed.com`,
        `Path=/`,
        `Max-Age=0`,
        `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        `HttpOnly`,
        `Secure`,
        `SameSite=None`
    ].join('; ');
}

/**
 * Debug helper
 */
function getCookieHeaderForDebug(sessionToken, maxAge = SESSION_DURATION) {
    return {
        name: COOKIE_NAME,
        value: encodeURIComponent(sessionToken),
        domain: 'fansmeed.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: maxAge,
        fullHeader: buildCookieHeader(sessionToken, maxAge)
    };
}

module.exports = {
    generateSessionToken,
    validateSessionToken,
    buildCookieHeader,
    buildClearCookieHeader,
    getCookieHeaderForDebug,
    COOKIE_NAME
};