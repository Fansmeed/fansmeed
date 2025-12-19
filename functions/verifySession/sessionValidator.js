const { validateSessionToken } = require("../setSessionCookie/sessionManager");

/**
 * Validate session from client-side (for AJAX calls)
 */
async function validateSessionForClient(sessionToken) {
    try {
        if (!sessionToken) return null;

        const decodedToken = decodeURIComponent(sessionToken);
        const sessionData = validateSessionToken(decodedToken);

        return sessionData;
    } catch (error) {
        console.error("Client session validation error:", error);
        return null;
    }
}

module.exports = {
    validateSessionForClient
};