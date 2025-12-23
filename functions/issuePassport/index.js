// functions/issuePassport/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

exports.issuePassport = onCall(
    {
        region: "us-central1",
        cors: true,
        maxInstances: 10,
        timeoutSeconds: 90
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
            let userDocId = uid;

            // Determine role and collection based on target app
            if (targetApp === "admin") {
                // Admin passport request
                collectionName = "employees";
                role = "admin";
                
                // First check by UID
                const adminDocById = await admin.firestore().collection(collectionName).doc(uid).get();
                
                if (adminDocById.exists) {
                    userData = adminDocById.data();
                    userDocId = uid;
                    console.log(`✅ Admin found by UID: ${uid}`);
                } 
                // If not found by UID, try email
                else if (email) {
                    console.log(`🔍 Admin not found by UID ${uid}, searching by email: ${email}`);
                    const querySnapshot = await admin.firestore()
                        .collection(collectionName)
                        .where('email', '==', email.toLowerCase())
                        .limit(1)
                        .get();
                    
                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        userData = doc.data();
                        userDocId = doc.id;
                        console.log(`✅ Admin found by email: ${email}, docId: ${userDocId}`);
                    } else {
                        throw new HttpsError("permission-denied", "Access Denied: Not an Employee.");
                    }
                } else {
                    throw new HttpsError("permission-denied", "Access Denied: Not an Employee.");
                }
                
                // Check if admin is active
                if (userData.isActive === false) {
                    throw new HttpsError("permission-denied", "Account disabled by administrator.");
                }
                
            } else {
                // User passport request
                collectionName = "users";
                role = "user";
                
                // First check by UID
                const userDocById = await admin.firestore().collection(collectionName).doc(uid).get();
                
                if (userDocById.exists) {
                    userData = userDocById.data();
                    userDocId = uid;
                    console.log(`✅ User found by UID: ${uid}`);
                }
                // If not found by UID, try email
                else if (email) {
                    console.log(`🔍 User not found by UID ${uid}, searching by email: ${email}`);
                    const querySnapshot = await admin.firestore()
                        .collection(collectionName)
                        .where('email', '==', email.toLowerCase())
                        .limit(1)
                        .get();
                    
                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        userData = doc.data();
                        userDocId = doc.id;
                        console.log(`✅ User found by email: ${email}, docId: ${userDocId}`);
                    } else {
                        // User not found, check if admin
                        const adminDoc = await admin.firestore().collection("employees").doc(uid).get();
                        
                        if (adminDoc.exists) {
                            userData = adminDoc.data();
                            collectionName = "employees";
                            role = "user"; // Admin can access user site
                            userDocId = uid;
                            console.log(`⚠️ Admin accessing user site: ${uid}`);
                        } else {
                            throw new HttpsError("permission-denied", "Account not found.");
                        }
                    }
                }
                
                // Check if user is active
                if (userData.isActive === false) {
                    throw new HttpsError("permission-denied", "Account disabled.");
                }
            }

            // Create custom token with role and document ID
            const customToken = await admin.auth().createCustomToken(uid, {
                role: role,
                email: userData.email || "",
                firestoreDocId: userDocId,
                collection: collectionName
            });

            console.log(`✅ Passport issued for ${uid} with role: ${role}`);
            
            return {
                token: customToken,
                role: role,
                firestoreDocId: userDocId,
                email: userData.email || ""
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