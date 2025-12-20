const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Gatekeeper Function - Issues Custom Tokens with Role Information
 */
// In functions/issuePassport/index.js
// Add better debugging:
// In functions/issuePassport/index.js - UPDATED VERSION
exports.issuePassport = onCall(
    {
        region: "us-central1",
        cors: true,
        maxInstances: 10,
        timeoutSeconds: 30
    },
    async (request) => {
        console.log("🎫 [Gatekeeper] IssuePassport called");
        
        // Get Firebase Auth UID
        const uid = request.auth?.uid;
        const email = request.auth?.token?.email;
        
        if (!uid) {
            throw new HttpsError("unauthenticated", "Login required to issue passport.");
        }

        // Get target app from request data
        const { targetApp } = request.data;
        console.log(`🎫 Target app: ${targetApp}, UID: ${uid}, Email: ${email}`);
        
        if (!targetApp || !["admin", "user"].includes(targetApp)) {
            throw new HttpsError("invalid-argument", "Invalid target app specified.");
        }

        try {
            let userData = null;
            let collectionName = '';
            let role = '';
            let userDocId = uid; // Default to uid
            
            if (targetApp === "admin") {
                // Try to find admin by UID first
                const adminDocById = await admin.firestore().collection("employees").doc(uid).get();
                
                if (adminDocById.exists) {
                    userData = adminDocById.data();
                    collectionName = "employees";
                    role = "admin";
                    userDocId = uid;
                    console.log(`✅ Admin found by UID: ${uid}`);
                } 
                // If not found by UID, try to find by email
                else if (email) {
                    console.log(`🔍 Admin not found by UID ${uid}, searching by email: ${email}`);
                    const employeesRef = admin.firestore().collection("employees");
                    const querySnapshot = await employeesRef.where('email', '==', email.toLowerCase()).limit(1).get();
                    
                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        userData = doc.data();
                        collectionName = "employees";
                        role = "admin";
                        userDocId = doc.id; // Use the actual document ID
                        console.log(`✅ Admin found by email: ${email}, docId: ${userDocId}`);
                    } else {
                        console.log(`❌ Admin not found by UID or email`);
                        throw new HttpsError("permission-denied", "Access Denied: Not an Employee.");
                    }
                } else {
                    console.log(`❌ No UID or email available for admin lookup`);
                    throw new HttpsError("permission-denied", "Access Denied: Not an Employee.");
                }
                
                // Check if admin is active
                if (userData.isActive === false) {
                    throw new HttpsError("permission-denied", "Account disabled by administrator.");
                }
                
            } else {
                // USER SITE ACCESS
                // Try to find user by UID first
                const userDocById = await admin.firestore().collection("users").doc(uid).get();
                
                if (userDocById.exists) {
                    userData = userDocById.data();
                    collectionName = "users";
                    role = "user";
                    userDocId = uid;
                    console.log(`✅ User found by UID: ${uid}`);
                }
                // If not found by UID, try to find by email
                else if (email) {
                    console.log(`🔍 User not found by UID ${uid}, searching by email: ${email}`);
                    const usersRef = admin.firestore().collection("users");
                    const querySnapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();
                    
                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        userData = doc.data();
                        collectionName = "users";
                        role = "user";
                        userDocId = doc.id; // Use the actual document ID
                        console.log(`✅ User found by email: ${email}, docId: ${userDocId}`);
                    } else {
                        // User not found, check if they're an admin trying to access user site
                        console.log(`🔍 User not found, checking if admin...`);
                        const adminDoc = await admin.firestore().collection("employees").doc(uid).get();
                        
                        if (adminDoc.exists) {
                            userData = adminDoc.data();
                            collectionName = "employees";
                            role = "user"; // Allow admin to access user site
                            userDocId = uid;
                            console.log(`⚠️ Admin accessing user site: ${uid}`);
                        } else {
                            console.log(`❌ User not found by UID, email, or as admin`);
                            throw new HttpsError("permission-denied", "Account not found in our system.");
                        }
                    }
                }
                
                // Check if user is active
                if (userData.isActive === false) {
                    throw new HttpsError("permission-denied", "Account disabled.");
                }
            }

            // Create custom token with the CORRECT userDocId
            const customToken = await admin.auth().createCustomToken(uid, {
                role: role,
                email: userData.email || "",
                collection: collectionName,
                firestoreDocId: userDocId  // Add the actual Firestore document ID
            });

            console.log(`✅ Passport issued for ${uid} with role: ${role}, firestoreDocId: ${userDocId}`);
            
            return {
                token: customToken,
                role: role,
                firestoreDocId: userDocId,
                user: {
                    uid: uid,
                    email: userData.email || "",
                    name: userData.fullName || userData.firstName || ""
                }
            };

        } catch (error) {
            console.error("❌ Error issuing passport:", error);
            console.error("❌ Error details:", {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            if (error instanceof HttpsError) {
                throw error;
            }
            
            throw new HttpsError("internal", "Failed to issue passport.");
        }
    }
);