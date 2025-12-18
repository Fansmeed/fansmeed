const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('./utils/firebaseAdmin');

const verifySessionCallable = onCall(async (request) => {
    const { sessionId } = request.data;
    
    if (!sessionId) {
        throw new HttpsError('invalid-argument', 'Session ID is required');
    }

    try {
        const db = admin.firestore();
        const sessionDoc = await db.collection('auth_sessions').doc(sessionId).get();
        
        if (!sessionDoc.exists()) {
            throw new HttpsError('not-found', 'Session not found or expired');
        }
        
        const sessionData = sessionDoc.data();
        
        // Check expiration (using timestamp)
        if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
            // Delete expired session
            await db.collection('auth_sessions').doc(sessionId).delete();
            throw new HttpsError('deadline-exceeded', 'Session expired');
        }
        
        // Check status
        if (sessionData.status !== 'pending') {
            throw new HttpsError('failed-precondition', 'Session already used');
        }
        
        // Generate custom token for the user
        const customToken = await admin.auth().createCustomToken(sessionData.userId);
        
        // Mark session as used immediately
        await db.collection('auth_sessions').doc(sessionId).delete();
        
        return {
            success: true,
            customToken: customToken,
            userId: sessionData.userId,
            email: sessionData.email,
            userRole: sessionData.userRole
        };
        
    } catch (error) {
        console.error('Session verification error:', error);
        
        // Clean up session on error
        try {
            await admin.firestore().collection('auth_sessions').doc(sessionId).delete();
        } catch (deleteError) {
            console.warn('Failed to delete session:', deleteError);
        }
        
        throw new HttpsError('internal', error.message || 'Session verification failed');
    }
});

module.exports = {
    verifySessionCallable
};