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
    },
    async (req, res) => {
        console.log("🎯 Setting session cookie via Cloud Function");
        console.log("📨 Method:", req.method);
        console.log("🔗 Referrer:", req.headers.referer || req.headers.referrer);

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
            let idToken, redirectUrl, userRoleFromRequest;

            // ============================================
            // HANDLE POST METHOD
            // ============================================
            if (req.method === "POST") {
                console.log("📨 Cloud Function called via POST");
                console.log("📦 POST body:", req.body);
                
                // Get data from POST body
                idToken = req.body.token;
                redirectUrl = req.body.redirectUrl;
                userRoleFromRequest = req.body.userRole;
                
                if (!idToken) {
                    console.error("❌ No ID token in POST body");
                    return res.status(400).send("Missing token");
                }
            }
            // ============================================
            // HANDLE GET METHOD (existing logic)
            // ============================================
            else {
                console.log("🔍 Cloud Function called via GET");
                console.log("🔍 Query params:", req.query);
                
                // Get ID token from query parameter or Authorization header
                idToken = req.query.token;

                if (!idToken && req.headers.authorization) {
                    const authHeader = req.headers.authorization;
                    if (authHeader.startsWith("Bearer ")) {
                        idToken = authHeader.substring(7);
                    }
                }

                redirectUrl = req.query.redirectUrl;
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

            // Get user role from Firestore (trust Firestore over request)
            const userRoleFromFirestore = await getUserRole(userId);

            if (!userRoleFromFirestore) {
                console.error("❌ User role not found or user inactive");
                res.setHeader("Set-Cookie", buildClearCookieHeader());
                res.redirect(302, "https://auth.fansmeed.com/auth/login?error=invalid_role");
                return;
            }

            console.log(`👤 User role from Firestore: ${userRoleFromFirestore}`);
            
            // Use role from Firestore (more secure) or from request
            const userRole = userRoleFromFirestore || userRoleFromRequest;

            // Generate session token
            const sessionToken = generateSessionToken(userId, userRole);
            
            console.log("🍪 [Cloud Function] Building cookie header...");
            const cookieHeader = buildCookieHeader(sessionToken);
            console.log("🍪 [Cloud Function] Cookie header to set:", cookieHeader);

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

            // Set CORS headers FIRST - CRITICAL FOR COOKIES
            res.set("Access-Control-Allow-Origin", "https://auth.fansmeed.com");
            res.set("Access-Control-Allow-Credentials", "true");
            res.set("Access-Control-Expose-Headers", "Set-Cookie");

            // Set the session cookie
            res.setHeader("Set-Cookie", cookieHeader);

            // Add debug headers
            res.set("X-Auth-User", userId);
            res.set("X-Auth-Role", userRole);
            res.set("X-Cookie-Set", "true");
            res.set("X-Auth-Debug", `user:${userId},role:${userRole}`);

            console.log(`🍪 [Cloud Function] Cookie should be set for ${userRole}`);
            console.log(`📋 [Cloud Function] Cookie header: ${cookieHeader}`);
            console.log(`🔗 [Cloud Function] Redirecting to: ${redirectUrl}`);

            // IMPORTANT: Use 302 (temporary) redirect for POST, 302 for GET
            res.redirect(302, redirectUrl);

        } catch (error) {
            console.error("❌ Error in setSessionCookie:", error);
            console.error("❌ Error details:", error.code, error.message);

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