// functions/verifySession/sessionValidator.js
const { validateSessionToken } = require("../setSessionCookie/sessionManager");
const admin = require("firebase-admin");

/**
 * Validate session from client-side
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

/**
 * Exchange ID token for custom token
 */
async function exchangeIdTokenForCustomToken(idToken) {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Create custom token with user claims
        const customToken = await admin.auth().createCustomToken(decodedToken.uid, {
            role: decodedToken.role || 'user',
            email: decodedToken.email || '',
            firestoreDocId: decodedToken.firestoreDocId || decodedToken.uid
        });
        
        return customToken;
    } catch (error) {
        console.error("Token exchange error:", error);
        throw error;
    }
}

module.exports = {
    validateSessionForClient,
    exchangeIdTokenForCustomToken
};