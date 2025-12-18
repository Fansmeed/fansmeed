import { db } from './firebaseInit';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const SESSION_COLLECTION = 'auth_sessions'; // Must match Cloud Function
const SESSION_EXPIRY = 60; // 60 seconds

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
            expiresAt: Date.now() + (SESSION_EXPIRY * 1000),
            createdAt: serverTimestamp(),
            status: 'pending'
        };

        await setDoc(doc(db, SESSION_COLLECTION, sessionId), sessionData);
        
        console.log('✅ Auth session created in collection:', SESSION_COLLECTION);
        console.log('✅ Session data:', sessionData);
        return sessionId;
    } catch (error) {
        console.error('Error creating auth session:', error);
        throw error;
    }
}