import { db } from './firebaseInit';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const TOKEN_COLLECTION = 'auth_tokens';
const TOKEN_EXPIRY = 60; // 60 seconds

/**
 * Create an authentication session in Firestore
 */
export async function createAuthSession(user, targetDomain) {
    try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const sessionData = {
            userId: user.uid,
            email: user.email,
            userRole: targetDomain.includes('cp.') ? 'admin' : 'user',
            targetDomain: targetDomain,
            expiresAt: new Date(Date.now() + (TOKEN_EXPIRY * 1000)),
            createdAt: serverTimestamp(),
            status: 'pending'
        };

        await setDoc(doc(db, TOKEN_COLLECTION, sessionId), sessionData);
        
        return sessionId;
    } catch (error) {
        console.error('Error creating auth session:', error);
        throw error;
    }
}