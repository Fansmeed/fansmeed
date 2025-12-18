// utils/crossDomainAuth.js - SHARED ACROSS ALL SITES
import { auth, db } from '@/firebase/firebaseInit';
import { doc, getDoc, deleteDoc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

// Configuration
const FIREBASE_AUTH_TIMEOUT = 15000; // 15 seconds

/**
 * Read auth data from Firestore and sign in
 */
export async function readAuthFromFirestoreAndSignIn(authRequestId) {
  try {
    console.log('🔄 Reading auth from Firestore with ID:', authRequestId);
    
    const authDocRef = doc(db, 'crossDomainAuth', authRequestId);
    
    // Use a promise with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Auth request timeout'));
      }, FIREBASE_AUTH_TIMEOUT);
      
      // Use real-time listener for faster response
      const unsubscribe = onSnapshot(authDocRef, async (docSnapshot) => {
        if (!docSnapshot.exists()) {
          console.log('⚠️ Auth document not found yet, waiting...');
          return;
        }
        
        const authData = docSnapshot.data();
        console.log('📄 Auth data received:', { 
          uid: authData.uid, 
          userRole: authData.userRole,
          used: authData.used 
        });
        
        // Check if already used
        if (authData.used) {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error('Auth token already used'));
          return;
        }
        
        // Check if expired
        if (authData.expiresAt?.toDate() < new Date()) {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error('Auth token expired'));
          return;
        }
        
        try {
          // Mark as used immediately
          await updateDoc(authDocRef, {
            used: true,
            usedAt: serverTimestamp()
          });
          
          clearTimeout(timeout);
          unsubscribe();
          
          // Store the auth data in session storage
          const authSessionData = {
            idToken: authData.idToken,
            refreshToken: authData.refreshToken,
            uid: authData.uid,
            userRole: authData.userRole,
            redirectUrl: authData.redirectUrl,
            timestamp: Date.now()
          };
          
          sessionStorage.setItem('crossDomainAuthData', JSON.stringify(authSessionData));
          
          console.log('✅ Auth data stored in session, UID:', authData.uid);
          
          resolve({
            success: true,
            uid: authData.uid,
            userRole: authData.userRole,
            redirectUrl: authData.redirectUrl
          });
          
        } catch (error) {
          clearTimeout(timeout);
          unsubscribe();
          reject(error);
        }
      }, (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to read auth from Firestore:', error);
    throw error;
  }
}

/**
 * Process cross-domain auth request
 */
export async function processCrossDomainAuth() {
  try {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const authRequestId = urlParams.get('authRequestId');
    
    if (!authRequestId) {
      console.log('🔍 No authRequestId in URL');
      return null;
    }
    
    console.log('🔄 Processing cross-domain auth request:', authRequestId);
    
    // Process the auth request
    const result = await readAuthFromFirestoreAndSignIn(authRequestId);
    
    // Clean up URL
    cleanAuthUrl();
    
    console.log('✅ Cross-domain auth processed:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Cross-domain auth processing failed:', error);
    clearCrossDomainAuthStorage();
    return null;
  }
}

/**
 * Clean up URL parameters
 */
function cleanAuthUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('authRequestId');
    url.searchParams.delete('source');
    
    window.history.replaceState({}, document.title, url.toString());
    console.log('🧹 Cleaned auth URL parameters');
  } catch (error) {
    console.warn('Failed to clean auth URL:', error);
  }
}

/**
 * Clear cross-domain auth storage
 */
export function clearCrossDomainAuthStorage() {
  sessionStorage.removeItem('crossDomainAuthData');
  console.log('🧹 Cleared cross-domain auth storage');
}

/**
 * Get stored auth data from session
 */
export function getStoredAuthData() {
  try {
    const storedData = sessionStorage.getItem('crossDomainAuthData');
    if (!storedData) return null;
    
    const data = JSON.parse(storedData);
    
    // Check if data is still valid (less than 5 minutes old)
    const age = Date.now() - data.timestamp;
    if (age > 5 * 60 * 1000) { // 5 minutes
      clearCrossDomainAuthStorage();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get stored auth data:', error);
    return null;
  }
}

/**
 * Check if we should attempt cross-domain auth
 */
export function shouldAttemptCrossDomainAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  return !!urlParams.get('authRequestId') || !!getStoredAuthData();
}