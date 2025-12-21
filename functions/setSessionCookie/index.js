// Location: Cloud Functions/setSessionCookie/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {
    generateSessionToken,
    validateSessionToken,  // ✅ Add this import
    getUserRole,
    buildCookieHeader,
    buildClearCookieHeader,
} = require("./sessionManager");  // ✅ Make sure this path is correct


if (!admin.apps.length) {
    admin.initializeApp();
}

// In functions/setSessionCookie/index.js
// In setSessionCookie/index.js, update the main function:
exports.setSessionCookie = onRequest(
    {
        region: "us-central1",
        cors: true,
        maxInstances: 10,
        timeoutSeconds: 30,
        memory: "256MiB",
    },
    async (req, res) => {
        console.log("🎯 Setting session cookie via Cloud Function");
        console.log("📨 Method:", req.method);
        
        // Only allow GET
        if (req.method !== "GET") {
            console.log("❌ Method not allowed:", req.method);
            res.status(405).send("Method Not Allowed");
            return;
        }

        try {
            // Get parameters from query
            const jwtToken = req.query.token; // This is a Firebase JWT token
            const redirectUrl = req.query.redirectUrl;
            const userRole = req.query.role;
            const firestoreDocId = req.query.firestoreDocId || req.query.userId;

            console.log("🔗 Redirect URL:", redirectUrl);
            console.log("🎭 Role from query:", userRole);
            console.log("📄 Firestore Doc ID:", firestoreDocId);

            if (!jwtToken) {
                console.error("❌ No token provided");
                res.setHeader("Set-Cookie", buildClearCookieHeader());
                res.redirect(302, "https://auth.fansmeed.com/auth/login?error=no_token");
                return;
            }

            // Validate the Firebase JWT token
            const decodedToken = await admin.auth().verifyIdToken(jwtToken);
            
            if (!decodedToken) {
                console.error("❌ Invalid Firebase token");
                res.setHeader("Set-Cookie", buildClearCookieHeader());
                res.redirect(302, "https://auth.fansmeed.com/auth/login?error=invalid_token");
                return;
            }

            console.log("✅ Firebase token validated:", decodedToken.uid);
            
            // Use the data from the decoded token
            const userId = decodedToken.uid;
            const role = decodedToken.claims?.role || userRole;
            const firestoreDocIdFromToken = decodedToken.claims?.firestoreDocId || userId;
            
            console.log("👤 User ID from token:", userId);
            console.log("🎭 Role from token:", role);
            console.log("📄 Firestore Doc ID from token:", firestoreDocIdFromToken);

            // Generate session token for cookie
            const sessionToken = generateSessionToken(userId, role);
            
            console.log("🍪 Building cookie header...");
            const cookieHeader = buildCookieHeader(sessionToken);
            console.log("🍪 Cookie header to set:", cookieHeader);

            // Validate redirect URL
            let finalRedirectUrl = redirectUrl;
            if (finalRedirectUrl) {
                try {
                    const url = new URL(finalRedirectUrl);
                    const allowedDomains = ["cp.fansmeed.com", "fansmeed.com", "localhost"];
                    
                    // Check for localhost in development
                    const isLocalhost = url.hostname === "localhost";
                    const isAllowedDomain = allowedDomains.some(domain => 
                        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
                    );
                    
                    if (!isLocalhost && !isAllowedDomain) {
                        console.warn("⚠️ Invalid redirect domain, using default");
                        finalRedirectUrl = null;
                    }
                } catch (error) {
                    console.warn("⚠️ Invalid redirect URL:", error.message);
                    finalRedirectUrl = null;
                }
            }

            // Set default redirect
            if (!finalRedirectUrl) {
                finalRedirectUrl = role === "admin"
                    ? "https://cp.fansmeed.com/"
                    : "https://fansmeed.com/";
                    
                // Adjust for localhost
                if (req.headers.host && req.headers.host.includes('localhost')) {
                    finalRedirectUrl = role === "admin"
                        ? "http://localhost:3000/"
                        : "http://localhost:3001/";
                }
            }

            console.log("🔧 Setting response headers...");
            
            // Set CORS headers
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Credentials", "true");
            res.set("Access-Control-Expose-Headers", "Set-Cookie");
            
            // Set the session cookie
            res.setHeader("Set-Cookie", cookieHeader);
            
            // Add debug headers
            res.set("X-Auth-User", userId);
            res.set("X-Auth-Role", role);
            res.set("X-Firestore-DocId", firestoreDocIdFromToken);
            res.set("X-Cookie-Set", "true");
            res.set("X-Redirect-To", finalRedirectUrl);

            console.log(`✅ Cookie set for ${role} (User: ${userId})`);
            console.log(`🔄 Redirecting to: ${finalRedirectUrl}`);

            // Use 302 redirect
            res.redirect(302, finalRedirectUrl);

        } catch (error) {
            console.error("❌ Error in setSessionCookie:", error.message);
            console.error("❌ Error stack:", error.stack);

            // Set CORS headers
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Credentials", "true");

            // Clear any invalid cookie
            res.setHeader("Set-Cookie", buildClearCookieHeader());

            // Determine error message
            let errorMessage = "authentication_failed";
            
            if (error.message.includes("Firebase ID token has expired")) {
                errorMessage = "token_expired";
            } else if (error.message.includes("invalid signature") || error.message.includes("invalid token")) {
                errorMessage = "invalid_token";
            } else if (error.message.includes("Account not found")) {
                errorMessage = "account_not_found";
            }

            console.log(`🔀 Redirecting to error: ${errorMessage}`);
            
            // Redirect to login with error
            res.redirect(302, `https://auth.fansmeed.com/auth/login?error=${errorMessage}`);
        }
    }
);