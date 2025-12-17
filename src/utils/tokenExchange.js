import { db } from '@/firebase/firebaseInit'
import { collection, addDoc, getDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'

const TOKEN_COLLECTION = 'crossDomainAuthTokens'

/**
 * Create a cross-domain authentication token
 */
export async function createCrossDomainToken(user, redirectUrl, userRole) {
    try {
        const token = generateToken()
        
        const tokenData = {
            uid: user.uid,
            email: user.email,
            idToken: await user.getIdToken(),
            refreshToken: user.refreshToken,
            userRole: userRole,
            redirectUrl: redirectUrl,
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiration
        }
        
        const docRef = await addDoc(collection(db, TOKEN_COLLECTION), tokenData)
        
        return {
            token: token,
            tokenId: docRef.id
        }
        
    } catch (error) {
        console.error('Failed to create cross-domain token:', error)
        throw error
    }
}

/**
 * Validate and retrieve token data
 */
export async function validateCrossDomainToken(tokenId) {
    try {
        const tokenDoc = await getDoc(doc(db, TOKEN_COLLECTION, tokenId))
        
        if (!tokenDoc.exists()) {
            throw new Error('Token not found or expired')
        }
        
        const tokenData = tokenDoc.data()
        
        // Check expiration
        if (tokenData.expiresAt.toDate() < new Date()) {
            await deleteDoc(doc(db, TOKEN_COLLECTION, tokenId))
            throw new Error('Token expired')
        }
        
        return {
            ...tokenData,
            tokenId: tokenDoc.id
        }
        
    } catch (error) {
        console.error('Token validation failed:', error)
        throw error
    }
}

/**
 * Delete used token
 */
export async function deleteCrossDomainToken(tokenId) {
    try {
        await deleteDoc(doc(db, TOKEN_COLLECTION, tokenId))
    } catch (error) {
        console.error('Failed to delete token:', error)
    }
}

/**
 * Generate random token
 */
function generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}