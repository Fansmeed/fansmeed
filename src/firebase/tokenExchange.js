import { db } from './firebaseInit';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const TOKEN_COLLECTION = 'auth_tokens';
const TOKEN_EXPIRY = 60; // 60 seconds

/**
 * Get and validate an auth token
 */
export async function getAuthToken(tokenId) {
    try {
        console.log('🔐 Getting auth token:', tokenId);
        
        const tokenDoc = await getDoc(doc(db, TOKEN_COLLECTION, tokenId));
        
        if (!tokenDoc.exists()) {
            throw new Error('Token not found');
        }
        
        const tokenData = tokenDoc.data();
        console.log('🔐 Token data retrieved:', { 
            userId: tokenData.userId,
            targetDomain: tokenData.targetDomain 
        });
        
        // Check if token is expired
        if (tokenData.expiresAt && new Date() > tokenData.expiresAt.toDate()) {
            await deleteDoc(doc(db, TOKEN_COLLECTION, tokenId));
            throw new Error('Token expired');
        }
        
        // Delete token immediately after reading (one-time use)
        try {
            await deleteDoc(doc(db, TOKEN_COLLECTION, tokenId));
            console.log('✅ Token deleted after use');
        } catch (deleteError) {
            console.warn('Could not delete token (may already be deleted):', deleteError);
        }
        
        return tokenData;
    } catch (error) {
        console.error('❌ Error getting auth token:', error);
        throw error;
    }
}