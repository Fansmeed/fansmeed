// Location: Cloud Functions/setSessionCookie/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {
    generateSessionToken,
    getUserRole,
    buildCookieHeader,
    buildClearCookieHeader,
} = require("./sessionManager");

if (!admin.apps.length) {
    admin.initializeApp();
}

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
            const idToken = req.query.token;
            const redirectUrl = req.query.redirectUrl;

            console.log("🔗 Redirect URL:", redirectUrl);
            console.log("🔐 Token present:", !!idToken);

            if (!idToken) {
                console.error("❌ No ID token provided");
                res.setHeader("Set-Cookie", buildClearCookieHeader());
                res.redirect(302, "https://auth.fansmeed.com/auth/login?error=no_token");
                return;
            }

            console.log("🔐 Verifying ID token...");

            // Verify token with timeout
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const userId = decodedToken.uid;
            const userEmail = decodedToken.email;

            console.log("✅ Token verified for user:", userEmail);

            // Get user role - with fallback to query param if Firestore fails
            let userRole = req.query.role;
            
            try {
                const firestoreRole = await getUserRole(userId);
                if (firestoreRole) {
                    userRole = firestoreRole;
                    console.log("✅ User role from Firestore:", userRole);
                } else if (userRole) {
                    console.log("⚠️ Using role from query param:", userRole);
                } else {
                    throw new Error("No role found");
                }
            } catch (firestoreError) {
                console.warn("⚠️ Firestore role lookup failed:", firestoreError.message);
                if (!userRole) {
                    // Default to user if no role found
                    userRole = 'user';
                    console.log("⚠️ Defaulting to role:", userRole);
                }
            }

            // Generate session token
            const sessionToken = generateSessionToken(userId, userRole);
            
            console.log("🍪 Building cookie header...");
            const cookieHeader = buildCookieHeader(sessionToken);
            console.log("🍪 Cookie header to set:", cookieHeader);

            // Validate redirect URL
            let finalRedirectUrl = redirectUrl;
            if (finalRedirectUrl) {
                try {
                    const url = new URL(finalRedirectUrl);
                    const allowedDomains = ["cp.fansmeed.com", "fansmeed.com"];

                    if (!allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
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
                finalRedirectUrl = userRole === "admin"
                    ? "https://cp.fansmeed.com/"
                    : "https://fansmeed.com/";
            }

            console.log("🔧 Setting response headers...");
            
            // CRITICAL: Set CORS headers
            res.set("Access-Control-Allow-Origin", "https://auth.fansmeed.com");
            res.set("Access-Control-Allow-Credentials", "true");
            res.set("Access-Control-Expose-Headers", "Set-Cookie");
            
            // Set the session cookie
            res.setHeader("Set-Cookie", cookieHeader);
            
            // Add debug headers for troubleshooting
            res.set("X-Auth-User", userId);
            res.set("X-Auth-Role", userRole);
            res.set("X-Cookie-Set", "true");
            res.set("X-Redirect-To", finalRedirectUrl);

            console.log(`✅ Cookie should be set for ${userRole}`);
            console.log(`🔄 Redirecting to: ${finalRedirectUrl}`);

            // Use 302 redirect (temporary)
            res.redirect(302, finalRedirectUrl);

        } catch (error) {
            console.error("❌ Error in setSessionCookie:", error.message);
            console.error("❌ Error stack:", error.stack);

            // Set CORS headers
            res.set("Access-Control-Allow-Origin", "https://auth.fansmeed.com");
            res.set("Access-Control-Allow-Credentials", "true");

            // Clear any invalid cookie
            res.setHeader("Set-Cookie", buildClearCookieHeader());

            // Determine error message
            let errorMessage = "authentication_failed";
            
            if (error.code === "auth/id-token-expired") {
                errorMessage = "token_expired";
            } else if (error.code === "auth/id-token-revoked") {
                errorMessage = "token_revoked";
            } else if (error.code === "auth/invalid-id-token") {
                errorMessage = "invalid_token";
            } else if (error.message.includes("timeout")) {
                errorMessage = "timeout";
            }

            console.log(`🔀 Redirecting to error: ${errorMessage}`);
            
            // Redirect to login with error
            res.redirect(302, `https://auth.fansmeed.com/auth/login?error=${errorMessage}`);
        }
    }
);