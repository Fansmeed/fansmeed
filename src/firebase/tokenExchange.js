import { db } from './firebaseInit';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const TOKEN_COLLECTION = 'auth_tokens';
const TOKEN_EXPIRY = 60; // 60 seconds

/**
 * Create an authentication token in Firestore
 */
export async function createAuthToken(user, targetDomain) {
    try {
        const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const idToken = await user.getIdToken();
        
        const tokenData = {
            userId: user.uid,
            email: user.email,
            idToken: idToken,
            userRole: targetDomain.includes('cp.') ? 'admin' : 'user',
            targetDomain: targetDomain,
            expiresAt: new Date(Date.now() + (TOKEN_EXPIRY * 1000)),
            createdAt: serverTimestamp()
        };

        await setDoc(doc(db, TOKEN_COLLECTION, tokenId), tokenData);
        
        return tokenId;
    } catch (error) {
        console.error('Error creating auth token:', error);
        throw error;
    }
}

/**
 * Get and validate an auth token
 */
export async function getAuthToken(tokenId) {
    try {
        const tokenDoc = await getDoc(doc(db, TOKEN_COLLECTION, tokenId));
        
        if (!tokenDoc.exists()) {
            throw new Error('Token not found');
        }
        
        const tokenData = tokenDoc.data();
        
        // Check if token is expired
        if (new Date() > tokenData.expiresAt.toDate()) {
            await deleteDoc(doc(db, TOKEN_COLLECTION, tokenId));
            throw new Error('Token expired');
        }
        
        // Delete token immediately after reading (one-time use)
        await deleteDoc(doc(db, TOKEN_COLLECTION, tokenId));
        
        return tokenData;
    } catch (error) {
        console.error('Error getting auth token:', error);
        throw error;
    }
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens() {
    // This could be a Cloud Function, but for simplicity we'll clean on read
    console.log('Token cleanup is handled on read');
}