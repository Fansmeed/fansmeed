// functions/verifySessionCookie/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

exports.verifySessionCookie = onRequest(
    {
        region: "us-central1",
        cors: true,
        timeoutSeconds: 30,
    },
    async (req, res) => {
        console.log("🔐 Verifying session cookie...");
        
        // Handle CORS
        res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
        res.set("Access-Control-Allow-Credentials", "true");
        res.set("Access-Control-Expose-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
            res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.set("Access-Control-Allow-Headers", "Content-Type, Cookie, Authorization");
            res.status(204).send("");
            return;
        }

        try {
            // Get session cookie from request
            const sessionCookie = req.cookies.__session || req.cookies.auth_session || "";
            
            console.log("🍪 Cookie present:", sessionCookie ? "Yes" : "No");

            if (!sessionCookie) {
                console.log("❌ No session cookie found");
                return res.status(401).json({
                    authenticated: false,
                    error: "NO_SESSION_COOKIE",
                    message: "No authentication session found"
                });
            }

            // Verify the session cookie
            const decodedClaims = await admin.auth().verifySessionCookie(
                sessionCookie, 
                true // Check if revoked
            );

            console.log("✅ Session verified for UID:", decodedClaims.uid);
            console.log("📧 User email:", decodedClaims.email);

            // Check user role in Firestore
            const userDoc = await admin.firestore()
                .collection("employees")
                .doc(decodedClaims.uid)
                .get();

            let role = "user";
            let userData = null;

            if (userDoc.exists) {
                role = "admin";
                userData = userDoc.data();
            } else {
                // Check users collection
                const regularUserDoc = await admin.firestore()
                    .collection("users")
                    .doc(decodedClaims.uid)
                    .get();
                
                if (regularUserDoc.exists) {
                    role = "user";
                    userData = regularUserDoc.data();
                }
            }

            if (!userData) {
                console.log("❌ User not found in database");
                return res.status(401).json({
                    authenticated: false,
                    error: "USER_NOT_FOUND",
                    message: "User profile not found"
                });
            }

            // Check if account is active
            if (userData.isActive === false) {
                console.log("❌ Account disabled");
                return res.status(403).json({
                    authenticated: false,
                    error: "ACCOUNT_DISABLED",
                    message: "Account has been disabled"
                });
            }

            // Create a custom token for client-side Firebase Auth
            const customToken = await admin.auth().createCustomToken(decodedClaims.uid, {
                role: role,
                firestoreDocId: decodedClaims.uid
            });

            // Return success response with custom token
            return res.status(200).json({
                authenticated: true,
                user: {
                    uid: decodedClaims.uid,
                    email: decodedClaims.email,
                    role: role,
                    name: userData.firstName || userData.fullName || "",
                },
                customToken: customToken,
                sessionData: {
                    uid: decodedClaims.uid,
                    role: role,
                    email: decodedClaims.email
                }
            });

        } catch (error) {
            console.error("❌ Session verification error:", error.message);
            
            // Clear invalid cookie
            res.clearCookie("__session", {
                domain: ".fansmeed.com",
                path: "/",
            });
            res.clearCookie("auth_session", {
                domain: ".fansmeed.com",
                path: "/",
            });

            let errorCode = "INVALID_SESSION";
            if (error.message.includes("expired")) errorCode = "SESSION_EXPIRED";
            if (error.message.includes("revoked")) errorCode = "SESSION_REVOKED";

            return res.status(401).json({
                authenticated: false,
                error: errorCode,
                message: error.message
            });
        }
    }
);