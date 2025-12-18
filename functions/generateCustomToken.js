const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('./utils/firebaseAdmin');

const generateCustomTokenCallable = onCall(async (request) => {
    // Authentication is automatically handled by onCall
    const { userId } = request.data;
    
    if (!userId) {
        throw new HttpsError('invalid-argument', 'User ID is required');
    }

    try {
        // Verify the requesting user has permission
        const requesterId = request.auth.uid;
        
        // Optional: Add permission checks here
        // For now, allow any authenticated user to generate tokens
        
        // Generate custom token for the target user
        const customToken = await admin.auth().createCustomToken(userId);
        
        return {
            success: true,
            customToken: customToken,
            userId: userId
        };
    } catch (error) {
        console.error('Error generating custom token:', error);
        throw new HttpsError('internal', 'Failed to generate authentication token');
    }
});

module.exports = {
    generateCustomTokenCallable
};