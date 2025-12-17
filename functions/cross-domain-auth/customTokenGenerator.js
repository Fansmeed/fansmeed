const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('../utils/firebaseAdmin');

/**
 * Generate custom token for cross-domain authentication
 */
exports.generateCustomToken = onCall(async (request) => {
    // Authentication is automatically handled by onCall
    const { uid, email, userRole, redirectUrl } = request.data;
    
    if (!uid || !email) {
        throw new HttpsError('invalid-argument', 'UID and email are required');
    }

    // Verify the requesting user is authenticated
    const callerUid = request.auth.uid;
    if (callerUid !== uid) {
        throw new HttpsError('permission-denied', 'Cannot generate token for another user');
    }

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(uid, {
        email: email,
        userRole: userRole,
        redirectUrl: redirectUrl,
        timestamp: Date.now()
    });

    // Store token metadata in Firestore for validation
    const tokenData = {
        uid: uid,
        email: email,
        userRole: userRole,
        redirectUrl: redirectUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    };

    await admin.firestore().collection('crossDomainAuthTokens').doc(customToken).set(tokenData);

    return {
        customToken: customToken,
        expiresIn: 300 // 5 minutes in seconds
    };
});

/**
 * Validate custom token
 */
exports.validateCustomToken = onCall(async (request) => {
    const { customToken } = request.data;
    
    if (!customToken) {
        throw new HttpsError('invalid-argument', 'Custom token is required');
    }

    // Get token data from Firestore
    const tokenDoc = await admin.firestore().collection('crossDomainAuthTokens').doc(customToken).get();
    
    if (!tokenDoc.exists()) {
        throw new HttpsError('not-found', 'Token not found or expired');
    }

    const tokenData = tokenDoc.data();
    
    // Check expiration
    if (tokenData.expiresAt.toDate() < new Date()) {
        await tokenDoc.ref.delete();
        throw new HttpsError('deadline-exceeded', 'Token expired');
    }

    return tokenData;
});

/**
 * Delete used token
 */
exports.deleteCustomToken = onCall(async (request) => {
    const { customToken } = request.data;
    
    if (!customToken) {
        throw new HttpsError('invalid-argument', 'Custom token is required');
    }

    await admin.firestore().collection('crossDomainAuthTokens').doc(customToken).delete();
    
    return { success: true };
});