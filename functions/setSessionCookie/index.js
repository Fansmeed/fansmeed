// functions/setSessionCookie/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { 
    generateSessionToken, 
    buildCookieHeader,
    buildClearCookieHeader 
} = require("./sessionManager");

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * This function is for legacy support or alternative flows
 * The main flow now uses direct token handoff
 */
exports.setSessionCookie = onRequest(
    {
        region: "us-central1",
        cors: true,
        maxInstances: 10,
        timeoutSeconds: 90,
        memory: "256MiB",
    },
    async (req, res) => {
        console.log("🎯 [Legacy] Setting session cookie");
        
        // Handle OPTIONS preflight
        if (req.method === "OPTIONS") {
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Methods", "GET, POST");
            res.set("Access-Control-Allow-Headers", "Content-Type");
            res.set("Access-Control-Allow-Credentials", "true");
            res.status(204).send("");
            return;
        }

        try {
            // Get parameters
            const jwtToken = req.query.token;
            const redirectUrl = req.query.redirectUrl;
            const userRole = req.query.role;
            const firestoreDocId = req.query.firestoreDocId;

            console.log("🔗 Processing request:", { 
                hasToken: !!jwtToken, 
                redirectUrl, 
                role: userRole 
            });

            if (!jwtToken) {
                console.error("❌ No token provided");
                res.setHeader("Set-Cookie", buildClearCookieHeader());
                res.redirect(302, "https://auth.fansmeed.com/auth/login?error=no_token");
                return;
            }

            // Verify the Firebase ID token
            const decodedToken = await admin.auth().verifyIdToken(jwtToken);
            
            if (!decodedToken) {
                console.error("❌ Invalid Firebase token");
                res.setHeader("Set-Cookie", buildClearCookieHeader());
                res.redirect(302, "https://auth.fansmeed.com/auth/login?error=invalid_token");
                return;
            }

            console.log("✅ Firebase token validated:", decodedToken.uid);
            
            // Generate session token for cookie (legacy approach)
            const sessionToken = generateSessionToken(
                decodedToken.uid, 
                userRole || decodedToken.role || 'user'
            );
            
            // Build cookie header
            const cookieHeader = buildCookieHeader(sessionToken);
            
            // Set response headers
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Credentials", "true");
            res.setHeader("Set-Cookie", cookieHeader);
            
            // Determine redirect URL
            let finalRedirectUrl = redirectUrl;
            if (finalRedirectUrl) {
                try {
                    const url = new URL(finalRedirectUrl);
                    const allowedDomains = ["cp.fansmeed.com", "fansmeed.com"];
                    const hostname = url.hostname;
                    
                    if (!allowedDomains.some(domain => 
                        hostname === domain || hostname.endsWith(`.${domain}`)
                    )) {
                        finalRedirectUrl = null;
                    }
                } catch (error) {
                    console.warn("⚠️ Invalid redirect URL:", error.message);
                    finalRedirectUrl = null;
                }
            }

            // Set default redirect
            if (!finalRedirectUrl) {
                finalRedirectUrl = (userRole === "admin")
                    ? "https://cp.fansmeed.com/"
                    : "https://fansmeed.com/";
            }

            console.log(`✅ Cookie set, redirecting to: ${finalRedirectUrl}`);

            // Add debug headers for development
            res.set("X-Auth-User", decodedToken.uid);
            res.set("X-Auth-Role", userRole || 'user');
            res.set("X-Cookie-Set", "true");

            // Redirect
            res.redirect(302, finalRedirectUrl);

        } catch (error) {
            console.error("❌ Error in setSessionCookie:", error.message);

            // Set CORS headers
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Credentials", "true");

            // Clear cookie on error
            res.setHeader("Set-Cookie", buildClearCookieHeader());

            // Redirect to auth with error
            res.redirect(302, "https://auth.fansmeed.com/auth/login?error=session_failed");
        }
    }
);