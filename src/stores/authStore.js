import { defineStore } from 'pinia';
import { useUiStore } from './uiStore';
import {
    auth,
    db
} from '@/firebase/firebaseInit';
import {
    sendSignInLinkToEmail,
    signInWithEmailLink,
    isSignInWithEmailLink,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithPopup
} from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    serverTimestamp,
    query,
    where,
    setDoc,
    deleteDoc
} from "firebase/firestore";
import { collectDeviceInfo } from '@/utils/deviceInfo';
import { getAuthIntentCookie, clearAuthIntentCookie, getTargetDomain } from '@/utils/cookieChecker';

// Authentication operations
export const AUTH_OPERATIONS = {
    // User operations
    USER_LOGIN: 'USER_LOGIN',
    USER_REGISTER: 'USER_REGISTER',
    USER_RESET_PASSWORD: 'USER_RESET_PASSWORD',
    USER_VERIFY_EMAIL: 'USER_VERIFY_EMAIL',

    // Admin operations
    ADMIN_LOGIN: 'ADMIN_LOGIN',
    ADMIN_SEND_LINK: 'ADMIN_SEND_LINK',

    // Common operations
    COMPLETE_SIGN_IN: 'COMPLETE_SIGN_IN',
    CHECK_AUTH: 'CHECK_AUTH',
    LOGOUT: 'LOGOUT',
    FETCH_USER_PROFILE: 'FETCH_USER_PROFILE',
    SOCIAL_LOGIN: 'SOCIAL_LOGIN'
};

// User roles
const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin'
};

// Collections
const COLLECTIONS = {
    USERS: 'users',
    EMPLOYEES: 'employees'
};

/**
 * Extract email from sign-in link
 */
function extractEmailFromSignInLink(url) {
    try {
        const urlObj = new URL(url);
        let email = urlObj.searchParams.get("email");

        if (!email && urlObj.searchParams.has("continueUrl")) {
            const continueUrl = urlObj.searchParams.get("continueUrl");
            const decodedUrl = decodeURIComponent(continueUrl);
            const continueParams = new URLSearchParams(decodedUrl.split('?')[1]);
            email = continueParams.get("email");
        }

        return email ? decodeURIComponent(email) : null;
    } catch (e) {
        console.error("URL parsing error:", e);
        return null;
    }
}

/**
 * Migrate from temporary UID to real Firebase Auth UID
 */
async function migrateToRealUid(temporaryUid, realUid, collectionName) {
    try {
        const oldDocRef = doc(db, collectionName, temporaryUid);
        const oldDoc = await getDoc(oldDocRef);

        if (!oldDoc.exists()) {
            throw new Error(`Temporary document not found in ${collectionName}`);
        }

        const data = oldDoc.data();

        // Create new document with real UID
        const updatedData = {
            ...data,
            id: realUid,
            uid: realUid,
            requiresUidMigration: false,
            migratedAt: serverTimestamp()
        };

        await setDoc(doc(db, collectionName, realUid), updatedData);

        // Delete the temporary document
        await deleteDoc(oldDocRef);

        console.log(`✅ Migrated from ${temporaryUid} to ${realUid} in ${collectionName}`);
        return updatedData;

    } catch (error) {
        console.error('Error migrating to real UID:', error);
        throw error;
    }
}

/**
 * Find user by email
 */
async function findUserByEmail(email, collectionName) {
    try {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, where('email', '==', email.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        return querySnapshot.docs[0];
    } catch (error) {
        console.error(`❌ Error finding user in ${collectionName}:`, error);
        return null;
    }
}

/**
 * Update login history
 */
async function updateLoginHistory(uid, userData, deviceInfo) {
    try {
        console.log('🔄 Updating login history for UID:', uid);

        const loginHistory = {
            timestamp: serverTimestamp(),
            deviceInfo: deviceInfo,
            ipAddress: deviceInfo.ipAddress,
            location: deviceInfo.location,
            userAgent: deviceInfo.userAgent
        };

        const userDocRef = doc(db, userData.role === USER_ROLES.ADMIN ? COLLECTIONS.EMPLOYEES : COLLECTIONS.USERS, uid);
        await updateDoc(userDocRef, {
            lastLogin: serverTimestamp(),
            lastLoginIp: deviceInfo.ipAddress,
            lastLoginLocation: deviceInfo.location,
            loginHistory: {
                ...(userData.loginHistory || {}),
                [Date.now().toString()]: loginHistory
            }
        });

        console.log('✅ Login history updated for UID:', uid);
        return loginHistory;

    } catch (error) {
        console.error('❌ Failed to update login history:', error);
        // Don't throw - allow login to continue
    }
}

/**
 * Get redirect URL from cookie or default
 */
function getRedirectUrl() {
    const cookieResult = getAuthIntentCookie();
    if (cookieResult.valid) {
        return cookieResult.data.redirectUrl;
    }
    return '/';
}


// REPLACE the existing writeAuthToFirestore function with this:
async function writeAuthToFirestore(user, userRole) {
    try {
        const currentTime = Date.now();
        const expiresAt = currentTime + (5 * 60 * 1000); // 5 minutes expiration

        // Get fresh tokens
        const idToken = await user.getIdToken(true);
        const refreshToken = user.refreshToken;

        // Get redirect URL from cookie
        const cookieResult = getAuthIntentCookie();
        let redirectUrl = 'https://' + (userRole === 'admin' ? 'cp.fansmeed.com' : 'fansmeed.com');
        let targetDomain = userRole === 'admin' ? 'cp.fansmeed.com' : 'fansmeed.com';

        if (cookieResult.valid && cookieResult.data.redirectUrl) {
            try {
                const url = new URL(cookieResult.data.redirectUrl);
                // Use the original redirect URL
                redirectUrl = cookieResult.data.redirectUrl;
            } catch (error) {
                console.log('Using default redirect URL');
            }
        }

        // Create auth document in Firestore
        const authData = {
            idToken,
            refreshToken,
            userRole,
            redirectUrl,
            source: 'auth.fansmeed.com',
            targetDomain,
            expiresAt: new Date(expiresAt),
            createdAt: new Date(),
            used: false,
            uid: user.uid
        };

        // Write to Firestore with user's UID as document ID
        await setDoc(doc(db, 'crossDomainAuth', user.uid), authData);

        console.log('✅ Auth data written to Firestore for cross-domain access');
        console.log('📄 Auth data:', {
            uid: user.uid,
            redirectUrl,
            targetDomain
        });

        return {
            uid: user.uid,
            redirectUrl,
            targetDomain
        };

    } catch (error) {
        console.error('❌ Failed to write auth to Firestore:', error);
        throw error;
    }
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        currentUser: null,
        userProfile: null,
        authChecked: false,
        userRole: null,
        unsubscribeAuthListener: null
    }),

    getters: {
        isAuthenticated: (state) => !!state.currentUser,
        currentUserData: (state) => state.currentUser,
        userProfileData: (state) => state.userProfile,
        isAdmin: (state) => state.userRole === USER_ROLES.ADMIN,
        isUser: (state) => state.userRole === USER_ROLES.USER
    },

    actions: {
        /**
         * Initialize authentication - check cookies and setup listener
         */
        async initialize() {
            const uiStore = useUiStore();

            return new Promise((resolve) => {
                uiStore.setLoading('AUTH_INIT', true);

                const unsubscribe = onAuthStateChanged(auth, async (user) => {
                    console.log('🔐 Auth state changed:', user ? 'User found' : 'No user');

                    if (user) {
                        this.currentUser = user;

                        // Check if email is verified for regular users
                        const cookieResult = getAuthIntentCookie();
                        if (cookieResult.valid && cookieResult.data.userRole === USER_ROLES.USER) {
                            if (!user.emailVerified) {
                                console.log('⚠️ User email not verified');
                                // We'll handle this in the login flow
                            }
                        }

                        // Determine user role from cookie or fetch profile
                        await this.determineUserRole(user);

                    } else {
                        this.currentUser = null;
                        this.userProfile = null;
                        this.userRole = null;
                    }

                    this.authChecked = true;
                    uiStore.setLoading('AUTH_INIT', false);
                    resolve(user);
                    unsubscribe();
                });
            });
        },

        /**
         * Determine user role based on cookie or fetch from DB
         */
        async determineUserRole(user) {
            const cookieResult = getAuthIntentCookie();

            if (cookieResult.valid) {
                this.userRole = cookieResult.data.userRole;
                console.log(`🔐 User role determined from cookie: ${this.userRole}`);
            } else {
                // Try to determine role from database
                try {
                    // Check if user is admin
                    const employeeDoc = await findUserByEmail(user.email, COLLECTIONS.EMPLOYEES);
                    if (employeeDoc) {
                        this.userRole = USER_ROLES.ADMIN;
                        this.userProfile = employeeDoc.data();
                    } else {
                        // Check if user is regular user
                        const userDoc = await findUserByEmail(user.email, COLLECTIONS.USERS);
                        if (userDoc) {
                            this.userRole = USER_ROLES.USER;
                            this.userProfile = userDoc.data();
                        } else {
                            console.log('⚠️ User not found in any collection');
                            this.userRole = null;
                        }
                    }
                    console.log(`🔐 User role determined from DB: ${this.userRole}`);
                } catch (error) {
                    console.error('Error determining user role:', error);
                    this.userRole = null;
                }
            }
        },

        /**
         * USER: Login with email and password
         */
        async userLogin(email, password) {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.USER_LOGIN;

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        const result = await signInWithEmailAndPassword(auth, email, password);

                        if (!result.user.emailVerified) {
                            // User needs to verify email
                            throw new Error('USER_EMAIL_NOT_VERIFIED:Please verify your email before logging in.');
                        }

                        // Update login history
                        const deviceInfo = await collectDeviceInfo();
                        await updateLoginHistory(result.user.uid, { role: USER_ROLES.USER }, deviceInfo);

                        // Fetch user profile
                        await this.fetchUserProfile(result.user.uid, USER_ROLES.USER);

                        // Return success data
                        return {
                            user: result.user,
                            success: true
                        };

                    } catch (error) {
                        console.error('User login error:', error);

                        // ✅ NO Firebase error mapping needed!
                        // Error formatter will handle: 'auth/user-not-found', 'auth/wrong-password', etc.

                        throw error; // Just re-throw
                    }
                }
            );
        },

        /**
         * USER: Register new account
         */
        async userRegister(userData) {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.USER_REGISTER;

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        // 1. Create user in Firebase Auth
                        const result = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
                        const userUid = result.user.uid;

                        // 2. Generate temporary UID for Firestore
                        const temporaryUid = `temp_${Date.now()}_${userData.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

                        // 3. Create user document with temporary UID
                        const userDoc = {
                            id: temporaryUid,
                            uid: temporaryUid,
                            email: userData.email.toLowerCase(),
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            userName: userData.userName,
                            dateOfBirth: userData.dob,
                            gender: userData.gender,
                            country: userData.country,
                            state: userData.state,
                            favoriteClubs: userData.userClub || [],
                            profilePicture: userData.profilePicture || '',
                            phoneNumber: userData.phoneNumber || '',
                            transactionPin: userData.transactionPin || '',
                            role: USER_ROLES.USER,
                            isActive: true,
                            emailVerified: false,
                            createdAt: serverTimestamp(),
                            lastLogin: null,
                            requiresUidMigration: true,
                            // Additional fields
                            balance: 0,
                            totalWinnings: 0,
                            quizHistory: [],
                            transactionHistory: []
                        };

                        await setDoc(doc(db, COLLECTIONS.USERS, temporaryUid), userDoc);

                        // 4. Send verification email
                        await sendEmailVerification(result.user, {
                            url: `${window.location.origin}/auth/verify-email?email=${encodeURIComponent(userData.email)}`,
                            handleCodeInApp: true
                        });

                        // 5. Sign out the user (they need to verify email first)
                        await signOut(auth);

                        console.log('✅ User registered successfully, verification email sent');
                        return {
                            email: userData.email,
                            temporaryUid: temporaryUid
                        };

                    } catch (error) {
                        console.error('User registration error:', error);

                        // ✅ NO Firebase error mapping needed!
                        // Error formatter will handle: 'auth/email-already-in-use', 'auth/weak-password', etc.

                        throw error; // Just re-throw
                    }
                }
            );
        },

        /**
         * Social login
         */
        async socialLogin(providerType) {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.SOCIAL_LOGIN;

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        let provider;
                        if (providerType === 'google') {
                            provider = new GoogleAuthProvider();
                        } else if (providerType === 'facebook') {
                            provider = new FacebookAuthProvider();
                        } else {
                            throw new Error('Unsupported social provider');
                        }

                        const result = await signInWithPopup(auth, provider);
                        const userUid = result.user.uid;
                        const email = result.user.email;

                        // Check if user exists
                        let userDoc = await findUserByEmail(email, COLLECTIONS.USERS);

                        if (!userDoc) {
                            // Create new user document
                            const userData = {
                                id: userUid,
                                uid: userUid,
                                email: email.toLowerCase(),
                                firstName: result.user.displayName?.split(' ')[0] || '',
                                lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
                                userName: result.user.displayName?.replace(/\s+/g, '').toLowerCase() || '',
                                profilePicture: result.user.photoURL || '',
                                provider: providerType,
                                role: USER_ROLES.USER,
                                isActive: true,
                                emailVerified: true,
                                createdAt: serverTimestamp(),
                                lastLogin: serverTimestamp()
                            };

                            await setDoc(doc(db, COLLECTIONS.USERS, userUid), userData);
                            this.userProfile = userData;
                        } else {
                            // Update existing user
                            const userDocRef = doc(db, COLLECTIONS.USERS, userUid);
                            await updateDoc(userDocRef, {
                                lastLogin: serverTimestamp()
                            });

                            this.userProfile = userDoc.data();
                        }

                        this.currentUser = result.user;
                        this.userRole = USER_ROLES.USER;
                        this.authChecked = true;

                        // Update login history
                        const deviceInfo = await collectDeviceInfo();
                        await updateLoginHistory(userUid, { role: USER_ROLES.USER }, deviceInfo);

                        // Return success
                        return {
                            user: result.user,
                            success: true
                        };

                    } catch (error) {
                        console.error('Social login error:', error);

                        // ✅ NO Firebase error mapping needed!
                        // Error formatter already handles: 'auth/popup-closed-by-user', etc.

                        throw error; // Just re-throw
                    }
                }
            );
        },

        /**
         * USER: Reset password
         */
        async userResetPassword(email) {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.USER_RESET_PASSWORD;

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        // First check if user exists in our database
                        const userDoc = await findUserByEmail(email, COLLECTIONS.USERS);
                        if (!userDoc) {
                            throw new Error('No account found with this email address.');
                        }

                        // Check if user account is active
                        const userData = userDoc.data();
                        if (userData.isActive === false) {
                            throw new Error('This account has been disabled.');
                        }

                        await sendPasswordResetEmail(auth, email, {
                            url: `${window.location.origin}/auth/login`,
                            handleCodeInApp: false
                        });

                        // Return success
                        return {
                            success: true,
                            email: email
                        };

                    } catch (error) {
                        console.error('Password reset error:', error);
                        throw error;
                    }
                }
            );
        },

        /**
         * ADMIN: Send login link
         */
        async adminSendLoginLink(userId) {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.ADMIN_SEND_LINK;

            return await uiStore.withOperation(
                key,
                async () => {
                    const email = `${userId.trim().toLowerCase()}@gmail.com`;

                    // Check if admin exists
                    const employeeDoc = await findUserByEmail(email, COLLECTIONS.EMPLOYEES);
                    if (!employeeDoc) {
                        throw new Error('No admin account found with this user ID.');
                    }

                    const employeeData = employeeDoc.data();

                    // Check if admin is active
                    if (!employeeData.isActive) {
                        throw new Error('This admin account is disabled.');
                    }

                    const actionCodeSettings = {
                        url: `${window.location.origin}/auth/complete-signin?email=${encodeURIComponent(email)}`,
                        handleCodeInApp: true
                    };

                    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

                    return {
                        message: 'Login link sent to your email!',
                        email: email
                    };
                }
            );
        },

        /**
         * Complete sign-in (for email link authentication)
         */
        async completeSignIn(url) {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.COMPLETE_SIGN_IN;

            return await uiStore.withOperation(
                key,
                async () => {
                    console.log('🔐 Starting completeSignIn with URL:', url);

                    if (!isSignInWithEmailLink(auth, url)) {
                        throw new Error("Invalid or expired sign-in link");
                    }

                    const email = extractEmailFromSignInLink(url);
                    console.log('🔐 Extracted email:', email);

                    if (!email) {
                        throw new Error("Email not found in the link. Please request a new sign-in link.");
                    }

                    try {
                        const result = await signInWithEmailLink(auth, email, url);
                        if (!result.user) {
                            throw new Error("Sign-in failed: No user data received");
                        }

                        const userUid = result.user.uid;
                        console.log('🔐 User signed in with UID:', userUid);

                        // Determine if this is a user or admin
                        let userDoc = await findUserByEmail(email, COLLECTIONS.USERS);
                        let collectionName = COLLECTIONS.USERS;
                        let userRole = USER_ROLES.USER;

                        if (!userDoc) {
                            userDoc = await findUserByEmail(email, COLLECTIONS.EMPLOYEES);
                            collectionName = COLLECTIONS.EMPLOYEES;
                            userRole = USER_ROLES.ADMIN;
                        }

                        if (!userDoc) {
                            throw new Error("User profile not found");
                        }

                        const userData = userDoc.data();

                        // Migrate if needed
                        if (userData.requiresUidMigration) {
                            console.log('🔄 Migrating from temporary UID to real UID...');
                            await migrateToRealUid(userDoc.id, userUid, collectionName);
                        }

                        // Update login history
                        const deviceInfo = await collectDeviceInfo();
                        await updateLoginHistory(userUid, { role: userRole }, deviceInfo);

                        // Update last login
                        const finalDocRef = doc(db, collectionName, userUid);
                        await updateDoc(finalDocRef, {
                            lastLogin: serverTimestamp(),
                            lastLoginIp: deviceInfo.ipAddress,
                            lastLoginLocation: deviceInfo.location
                        });

                        // Set auth state
                        this.currentUser = result.user;
                        this.userRole = userRole;
                        this.authChecked = true;

                        // Fetch user profile
                        this.userProfile = {
                            ...userData,
                            id: userUid,
                            uid: userUid
                        };

                        console.log(`🔐 ${userRole.toUpperCase()} sign-in completed successfully`);

                        // Redirect based on role
                        setTimeout(() => {
                            this.redirectToTargetApp();
                        }, 1500);

                        return result.user;

                    } catch (firebaseError) {
                        console.error('🔐 Firebase sign-in error:', firebaseError);
                        throw firebaseError;
                    }
                }
            );
        },

        /**
         * Verify email (for new user registrations)
         */
        async verifyEmail(url) {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.USER_VERIFY_EMAIL;

            return await uiStore.withOperation(
                key,
                async () => {
                    console.log('🔐 Starting email verification with URL:', url);

                    if (!isSignInWithEmailLink(auth, url)) {
                        throw new Error("Invalid or expired verification link");
                    }

                    const email = extractEmailFromSignInLink(url);
                    console.log('🔐 Extracted email for verification:', email);

                    if (!email) {
                        throw new Error("Email not found in the verification link.");
                    }

                    try {
                        const result = await signInWithEmailLink(auth, email, url);
                        if (!result.user) {
                            throw new Error("Verification failed: No user data received");
                        }

                        const userUid = result.user.uid;
                        console.log('🔐 User verified with UID:', userUid);

                        // Find and migrate user
                        const userDoc = await findUserByEmail(email, COLLECTIONS.USERS);
                        if (!userDoc) {
                            throw new Error("User profile not found");
                        }

                        const userData = userDoc.data();

                        // Migrate if needed
                        if (userData.requiresUidMigration) {
                            console.log('🔄 Migrating verified user...');
                            await migrateToRealUid(userDoc.id, userUid, COLLECTIONS.USERS);
                        }

                        // Update user as verified
                        const finalDocRef = doc(db, COLLECTIONS.USERS, userUid);
                        await updateDoc(finalDocRef, {
                            emailVerified: true,
                            verifiedAt: serverTimestamp()
                        });

                        // Set auth state
                        this.currentUser = result.user;
                        this.userRole = USER_ROLES.USER;
                        this.authChecked = true;

                        // Fetch user profile
                        this.userProfile = {
                            ...userData,
                            id: userUid,
                            uid: userUid,
                            emailVerified: true
                        };

                        console.log('✅ Email verification completed successfully');

                        // Redirect to main app
                        setTimeout(() => {
                            this.redirectToTargetApp();
                        }, 1500);

                        return result.user;

                    } catch (error) {
                        console.error('🔐 Email verification error:', error);
                        throw error;
                    }
                }
            );
        },

        /**
         * Social login
         */
        // async socialLogin(providerType) {
        //     const uiStore = useUiStore();
        //     const key = AUTH_OPERATIONS.SOCIAL_LOGIN;

        //     return await uiStore.withOperation(
        //         key,
        //         async () => {
        //             try {
        //                 let provider;
        //                 if (providerType === 'google') {
        //                     provider = new GoogleAuthProvider();
        //                 } else if (providerType === 'facebook') {
        //                     provider = new FacebookAuthProvider();
        //                 } else {
        //                     throw new Error('Unsupported social provider');
        //                 }

        //                 const result = await signInWithPopup(auth, provider);
        //                 const userUid = result.user.uid;
        //                 const email = result.user.email;

        //                 // Check if user exists
        //                 let userDoc = await findUserByEmail(email, COLLECTIONS.USERS);

        //                 if (!userDoc) {
        //                     // Create new user document
        //                     const userData = {
        //                         id: userUid,
        //                         uid: userUid,
        //                         email: email.toLowerCase(),
        //                         firstName: result.user.displayName?.split(' ')[0] || '',
        //                         lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
        //                         userName: result.user.displayName?.replace(/\s+/g, '').toLowerCase() || '',
        //                         profilePicture: result.user.photoURL || '',
        //                         provider: providerType,
        //                         role: USER_ROLES.USER,
        //                         isActive: true,
        //                         emailVerified: true,
        //                         createdAt: serverTimestamp(),
        //                         lastLogin: serverTimestamp()
        //                     };

        //                     await setDoc(doc(db, COLLECTIONS.USERS, userUid), userData);
        //                     this.userProfile = userData;
        //                 } else {
        //                     // Update existing user
        //                     const userDocRef = doc(db, COLLECTIONS.USERS, userUid);
        //                     await updateDoc(userDocRef, {
        //                         lastLogin: serverTimestamp()
        //                     });

        //                     this.userProfile = userDoc.data();
        //                 }

        //                 this.currentUser = result.user;
        //                 this.userRole = USER_ROLES.USER;
        //                 this.authChecked = true;

        //                 // Update login history
        //                 const deviceInfo = await collectDeviceInfo();
        //                 await updateLoginHistory(userUid, { role: USER_ROLES.USER }, deviceInfo);

        //                 // Return success - NO MESSAGE HERE
        //                 return {
        //                     user: result.user,
        //                     success: true
        //                 };

        //             } catch (error) {
        //                 console.error('Social login error:', error);

        //                 if (error.code === 'auth/popup-closed-by-user') {
        //                     throw new Error('POPUP_CLOSED:Login popup was closed.');
        //                 } else if (error.code === 'auth/popup-blocked') {
        //                     throw new Error('POPUP_BLOCKED:Login popup was blocked by browser.');
        //                 } else if (error.code === 'auth/account-exists-with-different-credential') {
        //                     throw new Error('ACCOUNT_EXISTS:An account already exists with this email using a different login method.');
        //                 }

        //                 throw error;
        //             }
        //         }
        //     );
        // },

        /**
         * Fetch user profile
         */
        async fetchUserProfile(uid, role) {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.FETCH_USER_PROFILE;

            return await uiStore.withOperation(
                key,
                async () => {
                    const collectionName = role === USER_ROLES.ADMIN ? COLLECTIONS.EMPLOYEES : COLLECTIONS.USERS;
                    const userDoc = await getDoc(doc(db, collectionName, uid));

                    if (!userDoc.exists()) {
                        throw new Error("User profile not found");
                    }

                    const userData = userDoc.data();
                    this.userProfile = {
                        id: userDoc.id,
                        ...userData
                    };

                    return this.userProfile;
                }
            );
        },

        /**
         * Check authentication state
         */
        async checkAuth() {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.CHECK_AUTH;

            return await uiStore.withOperation(
                key,
                async () => {
                    return new Promise((resolve) => {
                        const unsubscribe = onAuthStateChanged(auth, async (user) => {
                            if (user) {
                                this.currentUser = user;
                                await this.determineUserRole(user);
                            } else {
                                this.currentUser = null;
                                this.userProfile = null;
                                this.userRole = null;
                            }

                            this.authChecked = true;
                            resolve(user);
                            unsubscribe();
                        });
                    });
                }
            );
        },

        /**
         * Logout
         */
        async logout() {
            const uiStore = useUiStore();
            const key = AUTH_OPERATIONS.LOGOUT;

            return await uiStore.withOperation(
                key,
                async () => {
                    await signOut(auth);
                    this.currentUser = null;
                    this.userProfile = null;
                    this.userRole = null;
                    this.authChecked = false;

                    // Clear cookie
                    clearAuthIntentCookie();

                    sessionStorage.clear();
                    localStorage.clear();

                    return { message: 'Logged out successfully' };
                }
            );
        },

        /**
         * Redirect to target application based on user role
         */


        // REPLACE the redirectToTargetApp method with this:
        async redirectToTargetApp() {
            if (!this.userRole || !this.currentUser) {
                console.error('Cannot redirect: No user role or user determined');
                return;
            }

            try {
                // Write auth data to Firestore
                const { uid, redirectUrl } = await writeAuthToFirestore(
                    this.currentUser,
                    this.userRole
                );

                // Clear cookie
                clearAuthIntentCookie();

                // Build redirect URL with UID parameter
                const finalUrl = new URL(redirectUrl);
                finalUrl.searchParams.set('authRequestId', uid);
                finalUrl.searchParams.set('source', 'auth.fansmeed.com');

                console.log(`🔄 [auth] Redirecting ${this.userRole} to: ${finalUrl.toString()}`);

                // Redirect
                window.location.href = finalUrl.toString();

            } catch (error) {
                console.error('❌ Failed to prepare cross-domain redirect:', error);
                // Fallback to cookie-based method
                const fallbackResult = getAuthIntentCookie();
                let fallbackUrl = `https://${this.userRole === 'admin' ? 'cp.fansmeed.com' : 'fansmeed.com'}/`;

                if (fallbackResult.valid) {
                    fallbackUrl = fallbackResult.data.redirectUrl;
                }

                clearAuthIntentCookie();
                window.location.href = fallbackUrl;
            }
        },

        /**
         * Cleanup
         */
        cleanup() {
            if (this.unsubscribeAuthListener) {
                this.unsubscribeAuthListener();
                this.unsubscribeAuthListener = null;
            }

            this.currentUser = null;
            this.userProfile = null;
            this.authChecked = false;
            this.userRole = null;

            sessionStorage.clear();
            console.log('🔐 Auth store cleaned up');
        }
    },

    persist: {
        key: 'auth-store',
        storage: sessionStorage,
        paths: ['currentUser', 'userProfile', 'authChecked', 'userRole']
    }
});