import { db } from './firebaseInit';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const SESSION_COLLECTION = 'auth_sessions'; // Fixed collection name
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
            expiresAt: Date.now() + (SESSION_EXPIRY * 1000), // Using timestamp
            createdAt: serverTimestamp(),
            status: 'pending'
        };

        await setDoc(doc(db, SESSION_COLLECTION, sessionId), sessionData);
        
        console.log('✅ Auth session created:', sessionId);
        return sessionId;
    } catch (error) {
        console.error('Error creating auth session:', error);
        throw error;
    }
}