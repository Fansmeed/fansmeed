// functions/exchangeToken/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Exchange Firebase ID token for Custom Token
 * Used in the Passport Handoff flow
 */
exports.exchangeToken = onRequest(
    {
        region: "us-central1",
        cors: {
            origin: [
                "https://cp.fansmeed.com", 
                "https://fansmeed.com",
                "https://auth.fansmeed.com",
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002"
            ],
            credentials: true,
            maxAge: 3600
        }
    },
    async (req, res) => {
        console.log("🔄 [ExchangeToken] Processing token exchange");
        
        // Handle OPTIONS preflight
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        try {
            // Get ID token from Authorization header or body
            let idToken;
            
            if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
                idToken = req.headers.authorization.split("Bearer ")[1];
            } else if (req.body && req.body.idToken) {
                idToken = req.body.idToken;
            } else {
                return res.status(400).json({ error: "No ID token provided" });
            }

            // Verify the ID token
            const decodedToken = await admin.auth().verifyIdToken(idToken, true);
            
            console.log("✅ ID token verified for:", decodedToken.uid);
            
            // Get user data from Firestore to determine role
            let userData = null;
            let role = 'user';
            
            // Check employees collection first
            const employeeDoc = await admin.firestore()
                .collection("employees")
                .doc(decodedToken.uid)
                .get();
                
            if (employeeDoc.exists) {
                userData = employeeDoc.data();
                role = "admin";
                console.log(`👤 User is admin: ${decodedToken.uid}`);
            } 
            // Check users collection
            else {
                const userDoc = await admin.firestore()
                    .collection("users")
                    .doc(decodedToken.uid)
                    .get();
                    
                if (userDoc.exists) {
                    userData = userDoc.data();
                    role = "user";
                    console.log(`👤 User is regular user: ${decodedToken.uid}`);
                } else {
                    // Try to find by email as fallback
                    if (decodedToken.email) {
                        console.log(`🔍 User not found by UID, searching by email: ${decodedToken.email}`);
                        
                        // Search in employees
                        const employeeQuery = await admin.firestore()
                            .collection("employees")
                            .where("email", "==", decodedToken.email.toLowerCase())
                            .limit(1)
                            .get();
                            
                        if (!employeeQuery.empty) {
                            const doc = employeeQuery.docs[0];
                            userData = doc.data();
                            role = "admin";
                            console.log(`✅ Admin found by email: ${decodedToken.email}`);
                        } 
                        // Search in users
                        else {
                            const userQuery = await admin.firestore()
                                .collection("users")
                                .where("email", "==", decodedToken.email.toLowerCase())
                                .limit(1)
                                .get();
                                
                            if (!userQuery.empty) {
                                const doc = userQuery.docs[0];
                                userData = doc.data();
                                role = "user";
                                console.log(`✅ User found by email: ${decodedToken.email}`);
                            }
                        }
                    }
                }
            }
            
            if (!userData) {
                return res.status(404).json({ error: "User not found in database" });
            }
            
            // Check if account is active
            if (userData.isActive === false) {
                return res.status(403).json({ error: "Account disabled" });
            }
            
            // Create custom token with role and user data
            const customToken = await admin.auth().createCustomToken(decodedToken.uid, {
                role: role,
                email: decodedToken.email || userData.email || "",
                firestoreDocId: decodedToken.uid,
                name: userData.name || userData.firstName || "",
                isAdmin: role === "admin"
            });
            
            console.log(`✅ Custom token created for ${decodedToken.uid} (${role})`);
            
            return res.status(200).json({
                success: true,
                customToken: customToken,
                user: {
                    uid: decodedToken.uid,
                    role: role,
                    email: decodedToken.email || "",
                    name: userData.name || userData.firstName || ""
                }
            });
            
        } catch (error) {
            console.error("❌ Token exchange error:", error);
            
            // Handle specific errors
            if (error.code === 'auth/id-token-expired') {
                return res.status(401).json({ error: "Token expired" });
            } else if (error.code === 'auth/invalid-id-token') {
                return res.status(401).json({ error: "Invalid token" });
            }
            
            return res.status(500).json({ 
                error: "Internal server error",
                message: error.message 
            });
        }
    }
);