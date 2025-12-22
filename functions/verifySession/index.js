// functions/verifySession/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

exports.verifySessionHttp = onRequest(
    {
        region: "us-central1",
        cors: true,
        timeoutSeconds: 30,
    },
    async (req, res) => {
        console.log("🔐 Verifying session cookie...");
        
        // Handle CORS
        const allowedOrigins = [
            "https://cp.fansmeed.com", 
            "https://fansmeed.com",
            "http://localhost:3000",
            "http://localhost:3001",
            "https://auth.fansmeed.com"
        ];
        
        const origin = req.headers.origin;
        if (allowedOrigins.includes(origin)) {
            res.set("Access-Control-Allow-Origin", origin);
        } else if (origin && (origin.includes("localhost") || origin.includes("fansmeed.com"))) {
            // Allow localhost and any fansmeed.com subdomain
            res.set("Access-Control-Allow-Origin", origin);
        }
        
        res.set("Access-Control-Allow-Credentials", "true");
        res.set("Access-Control-Expose-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
            res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.set("Access-Control-Allow-Headers", "Content-Type, Cookie, Authorization");
            res.status(204).send("");
            return;
        }

        try {
            // Get session cookie from request - check both Firebase's cookie and your custom one
            const sessionCookie = req.cookies.__session || req.cookies.auth_session || "";
            
            console.log("🍪 Cookie present:", sessionCookie ? "Yes" : "No");
            console.log("🔍 Cookies received:", req.cookies);

            if (!sessionCookie) {
                console.log("❌ No session cookie found");
                return res.status(401).json({
                    authenticated: false,
                    error: "NO_SESSION_COOKIE",
                    message: "No authentication session found"
                });
            }

            // Verify the Firebase session cookie
            const decodedClaims = await admin.auth().verifySessionCookie(
                sessionCookie, 
                true // Check if revoked
            );

            console.log("✅ Session verified for UID:", decodedClaims.uid);
            console.log("📧 User email:", decodedClaims.email);

            // Check user role in Firestore
            let role = "user";
            let userData = null;

            // First check employees collection (admins)
            const employeeDoc = await admin.firestore()
                .collection("employees")
                .doc(decodedClaims.uid)
                .get();

            if (employeeDoc.exists) {
                const data = employeeDoc.data();
                if (data.isActive !== false) {
                    role = "admin";
                    userData = data;
                    console.log("👔 User is an admin");
                } else {
                    console.log("❌ Admin account is disabled");
                    return res.status(403).json({
                        authenticated: false,
                        error: "ACCOUNT_DISABLED",
                        message: "Admin account has been disabled"
                    });
                }
            } else {
                // Check users collection (regular users)
                const userDoc = await admin.firestore()
                    .collection("users")
                    .doc(decodedClaims.uid)
                    .get();
                
                if (userDoc.exists) {
                    const data = userDoc.data();
                    if (data.isActive !== false) {
                        userData = data;
                        console.log("👤 User is a regular user");
                    } else {
                        console.log("❌ User account is disabled");
                        return res.status(403).json({
                            authenticated: false,
                            error: "ACCOUNT_DISABLED",
                            message: "User account has been disabled"
                        });
                    }
                }
            }

            if (!userData) {
                console.log("❌ User not found in database");
                
                // Also try to find by email (in case of UID mismatch)
                const usersByEmail = await admin.firestore()
                    .collection("users")
                    .where("email", "==", decodedClaims.email.toLowerCase())
                    .limit(1)
                    .get();
                
                const employeesByEmail = await admin.firestore()
                    .collection("employees")
                    .where("email", "==", decodedClaims.email.toLowerCase())
                    .limit(1)
                    .get();
                
                if (!usersByEmail.empty) {
                    const doc = usersByEmail.docs[0];
                    userData = doc.data();
                    console.log(`✅ Found user by email: ${decodedClaims.email}`);
                } else if (!employeesByEmail.empty) {
                    const doc = employeesByEmail.docs[0];
                    userData = doc.data();
                    role = "admin";
                    console.log(`✅ Found admin by email: ${decodedClaims.email}`);
                } else {
                    console.log("❌ User not found by UID or email");
                    return res.status(401).json({
                        authenticated: false,
                        error: "USER_NOT_FOUND",
                        message: "User profile not found in our system"
                    });
                }
            }

            // Check if account is active (double-check)
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
                email: userData.email || decodedClaims.email,
                firestoreDocId: decodedClaims.uid
            });

            console.log(`✅ Created custom token for ${role} role`);

            // Return success response with custom token
            return res.status(200).json({
                success: true,
                authenticated: true,
                user: {
                    uid: decodedClaims.uid,
                    email: decodedClaims.email,
                    role: role,
                    name: userData.firstName || userData.fullName || userData.userName || "",
                    displayName: userData.displayName || userData.firstName || "",
                    photoURL: userData.profilePicture || userData.photoURL || ""
                },
                customToken: customToken,
                sessionData: {
                    uid: decodedClaims.uid,
                    role: role,
                    email: decodedClaims.email,
                    expiresAt: decodedClaims.exp * 1000 // Convert to milliseconds
                }
            });

        } catch (error) {
            console.error("❌ Session verification error:", error.message);
            console.error("Stack:", error.stack);
            
            // Determine error type
            let errorCode = "INVALID_SESSION";
            let errorMessage = error.message;
            
            if (error.message.includes("expired")) {
                errorCode = "SESSION_EXPIRED";
                errorMessage = "Session has expired. Please login again.";
            } else if (error.message.includes("revoked")) {
                errorCode = "SESSION_REVOKED";
                errorMessage = "Session has been revoked. Please login again.";
            } else if (error.message.includes("invalid signature")) {
                errorCode = "INVALID_TOKEN";
                errorMessage = "Invalid session token.";
            }
            
            // Clear invalid cookies
            res.clearCookie("__session", {
                domain: ".fansmeed.com",
                path: "/",
                secure: true,
                httpOnly: true,
                sameSite: "lax"
            });
            
            res.clearCookie("auth_session", {
                domain: ".fansmeed.com",
                path: "/",
                secure: true,
                httpOnly: false,
                sameSite: "lax"
            });

            return res.status(401).json({
                success: false,
                authenticated: false,
                error: errorCode,
                message: errorMessage,
                details: process.env.NODE_ENV === "development" ? error.message : undefined
            });
        }
    }
);