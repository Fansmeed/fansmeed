const admin = require('firebase-admin');
const crypto = require('crypto');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 3600; // 1 hour in seconds

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

        return { userId, role, timestamp: parseInt(timestamp) };
    } catch (error) {
        console.error('Session validation error:', error);
        return null;
    }
}

/**
 * Determine user role from Firestore
 */
async function getUserRole(userId) {
    try {
        // First check if user is an admin
        const adminDoc = await db.collection('employees').doc(userId).get();
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            if (adminData.isActive !== false) {
                return 'admin';
            }
        }

        // Check if user is a regular user
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.isActive !== false) {
                return 'user';
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}

/**
 * Build the Set-Cookie header string
 */
function buildCookieHeader(sessionToken, maxAge = SESSION_DURATION) {
    // CRITICAL: Include ALL required attributes
    return [
        `${COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
        `Domain=.fansmeed.com`,  // Leading dot for all subdomains
        `Path=/`,
        `HttpOnly`,              // ✅ Prevent JS access (good for security)
        `Secure`,                // ✅ HTTPS only
        `SameSite=Lax`,          // ✅ Changed from None to Lax for same-domain
        `Max-Age=${maxAge}`
    ].join('; ');
}

// Also add this helper function for debugging:
function getCookieHeaderForDebug(sessionToken, maxAge = SESSION_DURATION) {
    return {
        name: COOKIE_NAME,
        value: encodeURIComponent(sessionToken),
        domain: '.fansmeed.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: maxAge,
        fullHeader: buildCookieHeader(sessionToken, maxAge)
    };
}

/**
 * Clear session cookie
 */
function buildClearCookieHeader() {
    return [
        `${COOKIE_NAME}=`,
        `Domain=.fansmeed.com`,
        `Path=/`,
        `HttpOnly`,
        `Secure`,
        `SameSite=Lax`,
        `Max-Age=0`,
        `Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    ].join('; ');
}

module.exports = {
    generateSessionToken,
    validateSessionToken,
    getUserRole,
    buildCookieHeader,
    buildClearCookieHeader,
    getCookieHeaderForDebug,  // Add this
    COOKIE_NAME
};