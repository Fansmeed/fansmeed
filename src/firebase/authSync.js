import { db } from './firebaseInit';
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

const AUTH_SESSIONS_COLLECTION = 'auth_sessions';

/**
 * Create a simple auth session in Firestore
 */
export async function createAuthSession(userUid, targetDomain) {
    try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const sessionData = {
            userId: userUid,
            targetDomain: targetDomain,
            createdAt: serverTimestamp(),
            status: 'active',
            // Simple timestamp-based expiration check
            expiresAt: Date.now() + (60 * 1000) // 60 seconds
        };

        await setDoc(doc(db, AUTH_SESSIONS_COLLECTION, sessionId), sessionData);
        
        console.log('✅ Auth session created:', sessionId);
        return sessionId;
    } catch (error) {
        console.error('Error creating auth session:', error);
        throw error;
    }
}

/**
 * Get and validate auth session
 */
export async function getAuthSession(sessionId) {
    try {
        console.log('🔐 Getting auth session:', sessionId);
        
        const sessionDoc = await getDoc(doc(db, AUTH_SESSIONS_COLLECTION, sessionId));
        
        if (!sessionDoc.exists()) {
            throw new Error('Session not found');
        }
        
        const sessionData = sessionDoc.data();
        
        // Check expiration
        if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
            await deleteDoc(doc(db, AUTH_SESSIONS_COLLECTION, sessionId));
            throw new Error('Session expired');
        }
        
        return sessionData;
    } catch (error) {
        console.error('Error getting auth session:', error);
        throw error;
    }
}