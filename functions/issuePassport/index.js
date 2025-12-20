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
        if (!uid) {
            throw new HttpsError("unauthenticated", "Login required to issue passport.");
        }

        // Get target app from request data
        const { targetApp } = request.data;
        console.log(`🎫 Target app: ${targetApp}, UID: ${uid}`);
        
        if (!targetApp || !["admin", "user"].includes(targetApp)) {
            throw new HttpsError("invalid-argument", "Invalid target app specified.");
        }

        try {
            let userData = null;
            let collectionName = '';
            let role = '';
            
            // Try to find user in both collections
            if (targetApp === "admin") {
                // First check employees collection
                const adminDoc = await admin.firestore().collection("employees").doc(uid).get();
                
                if (adminDoc.exists) {
                    userData = adminDoc.data();
                    collectionName = "employees";
                    role = "admin";
                    
                    // Check if admin is active
                    if (userData.isActive === false) {
                        throw new HttpsError("permission-denied", "Account disabled by administrator.");
                    }
                    
                    console.log(`✅ ${uid} found in employees collection as admin`);
                } else {
                    // Admin not found in employees, check if they're a user trying to access admin
                    const userDoc = await admin.firestore().collection("users").doc(uid).get();
                    
                    if (userDoc.exists) {
                        console.log(`⚠️ ${uid} is a user, not an admin. Denying admin access.`);
                        throw new HttpsError("permission-denied", "Access Denied: Not an Employee.");
                    } else {
                        console.log(`❌ ${uid} not found in any collection`);
                        throw new HttpsError("permission-denied", "Account not found in our system.");
                    }
                }
                
            } else {
                // Check users collection
                const userDoc = await admin.firestore().collection("users").doc(uid).get();
                
                if (userDoc.exists) {
                    userData = userDoc.data();
                    collectionName = "users";
                    role = "user";
                    
                    // Check if user is active
                    if (userData.isActive === false) {
                        throw new HttpsError("permission-denied", "Account disabled.");
                    }
                    
                    console.log(`✅ ${uid} found in users collection as user`);
                } else {
                    // User not found, check if they're an admin trying to access user site
                    const adminDoc = await admin.firestore().collection("employees").doc(uid).get();
                    
                    if (adminDoc.exists) {
                        console.log(`⚠️ ${uid} is an admin. Admins can access user site.`);
                        userData = adminDoc.data();
                        collectionName = "employees";
                        role = "user"; // Allow admin to access user site
                        
                        if (userData.isActive === false) {
                            throw new HttpsError("permission-denied", "Account disabled by administrator.");
                        }
                    } else {
                        console.log(`❌ ${uid} not found in any collection`);
                        throw new HttpsError("permission-denied", "Account not found in our system.");
                    }
                }
            }

            // Create custom token
            const customToken = await admin.auth().createCustomToken(uid, {
                role: role,
                email: userData.email || "",
                collection: collectionName
            });

            console.log(`✅ Passport issued for ${uid} with role: ${role}`);
            
            return {
                token: customToken,
                role: role,
                user: {
                    uid: uid,
                    email: userData.email || "",
                    name: userData.fullName || userData.firstName || ""
                }
            };

        } catch (error) {
            console.error("❌ Error issuing passport:", error);
            
            if (error instanceof HttpsError) {
                throw error;
            }
            
            throw new HttpsError("internal", "Failed to issue passport.");
        }
    }
);