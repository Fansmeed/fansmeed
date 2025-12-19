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
    },
    async (req, res) => {
        console.log("🎯 Setting session cookie via Cloud Function");

        // Handle CORS preflight
        if (req.method === "OPTIONS") {
            res.set("Access-Control-Allow-Origin", "https://auth.fansmeed.com");
            res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.set("Access-Control-Allow-Credentials", "true");
            res.set("Access-Control-Max-Age", "86400");
            res.status(204).send("");
            return;
        }

        // Only allow GET or POST
        if (req.method !== "GET" && req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }

        try {
            // Get ID token from query parameter or Authorization header
            let idToken = req.query.token || req.body.token;

            if (!idToken && req.headers.authorization) {
                const authHeader = req.headers.authorization;
                if (authHeader.startsWith("Bearer ")) {
                    idToken = authHeader.substring(7);
                }
            }

            if (!idToken) {
                console.error("❌ No ID token provided");
                res.setHeader("Set-Cookie", buildClearCookieHeader());
                res.redirect(302, "https://auth.fansmeed.com/auth/login?error=no_token");
                return;
            }

            console.log("🔐 Verifying ID token");

            // Verify Firebase ID token
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const userId = decodedToken.uid;
            const userEmail = decodedToken.email;

            console.log("✅ Token verified for user:", userEmail);

            // Get user role from Firestore
            const userRole = await getUserRole(userId);

            if (!userRole) {
                console.error("❌ User role not found or user inactive");
                res.setHeader("Set-Cookie", buildClearCookieHeader());
                res.redirect(302, "https://auth.fansmeed.com/auth/login?error=invalid_role");
                return;
            }

            console.log(`👤 User role determined: ${userRole}`);

            // Generate session token
            const sessionToken = generateSessionToken(userId, userRole);

            // Get redirect URL (with validation)
            let redirectUrl = req.query.redirectUrl || req.body.redirectUrl;

            // Validate redirect URL for security
            if (redirectUrl) {
                try {
                    const url = new URL(redirectUrl);
                    const allowedDomains = ["cp.fansmeed.com", "fansmeed.com"];

                    if (!allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
                        console.warn("⚠️ Invalid redirect domain, using default");
                        redirectUrl = null;
                    }
                } catch (error) {
                    console.warn("⚠️ Invalid redirect URL format:", error);
                    redirectUrl = null;
                }
            }

            // Set default redirect based on role
            if (!redirectUrl) {
                redirectUrl = userRole === "admin"
                    ? "https://cp.fansmeed.com/"
                    : "https://fansmeed.com/";
            }

            // Set CORS headers for cross-origin cookie
            res.set("Access-Control-Allow-Origin", "https://auth.fansmeed.com");
            res.set("Access-Control-Allow-Credentials", "true");
            res.set("Access-Control-Expose-Headers", "Set-Cookie");

            // Set the session cookie
            res.setHeader("Set-Cookie", buildCookieHeader(sessionToken));

            console.log(`🍪 Session cookie set for ${userRole}`);
            console.log(`🔄 Redirecting to: ${redirectUrl}`);

            // Redirect to target site
            res.redirect(302, redirectUrl);

        } catch (error) {
            console.error("❌ Error in setSessionCookie:", error);

            // Set CORS headers even on error
            res.set("Access-Control-Allow-Origin", "https://auth.fansmeed.com");
            res.set("Access-Control-Allow-Credentials", "true");

            // Clear any invalid cookie
            res.setHeader("Set-Cookie", buildClearCookieHeader());

            // Redirect to login with error
            let errorMessage = "authentication_failed";

            if (error.code === "auth/id-token-expired") {
                errorMessage = "token_expired";
            } else if (error.code === "auth/id-token-revoked") {
                errorMessage = "token_revoked";
            } else if (error.code === "auth/invalid-id-token") {
                errorMessage = "invalid_token";
            }

            res.redirect(302, `https://auth.fansmeed.com/auth/login?error=${errorMessage}`);
        }
    }
);