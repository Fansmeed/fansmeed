// functions/setSessionCookie/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

// Session duration: 5 days in SECONDS (not milliseconds)
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days in seconds
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000; // 5 days in milliseconds

exports.setSessionCookie = onRequest(
    {
        region: "us-central1",
        cors: true,
        maxInstances: 10,
        timeoutSeconds: 30,
        memory: "256MiB",
    },
    async (req, res) => {
        console.log("🎯 Setting Firebase Session Cookie");
        
        // Handle CORS preflight
        if (req.method === "OPTIONS") {
            res.set("Access-Control-Allow-Origin", ["https://auth.fansmeed.com", "https://cp.fansmeed.com", "https://fansmeed.com"]);
            res.set("Access-Control-Allow-Credentials", "true");
            res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.status(204).send("");
            return;
        }

        try {
            // Get token from query
            const idToken = req.query.token;
            const redirectUrl = req.query.redirectUrl;
            const role = req.query.role || "user";
            const firestoreDocId = req.query.firestoreDocId;

            console.log("📨 Token received:", idToken ? "Yes" : "No");
            console.log("🔗 Redirect URL:", redirectUrl);
            console.log("🎭 Role:", role);
            console.log("📄 Firestore Doc ID:", firestoreDocId);

            if (!idToken) {
                throw new Error("No ID token provided");
            }

            // Verify the ID token
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            console.log("✅ ID Token verified for UID:", decodedToken.uid);
            console.log("📧 User email:", decodedToken.email);

            // Create a Firebase session cookie
            const sessionCookie = await admin.auth().createSessionCookie(idToken, {
                expiresIn: SESSION_DURATION_SECONDS,
            });

            // Determine correct redirect URL
            let finalRedirectUrl = redirectUrl;
            if (!finalRedirectUrl || !isValidRedirectUrl(finalRedirectUrl)) {
                finalRedirectUrl = role === "admin" 
                    ? "https://cp.fansmeed.com/"
                    : "https://fansmeed.com/";
            }

            console.log("🍪 Creating session cookies...");
            
            // Set Firebase's __session cookie (HttpOnly for security)
            res.cookie("__session", sessionCookie, {
                maxAge: SESSION_DURATION_MS,
                httpOnly: true,
                secure: true,
                domain: ".fansmeed.com",
                sameSite: "lax",
                path: "/",
            });
            
            // Also set a custom cookie for your app (non-HttpOnly for client access)
            res.cookie("auth_session", sessionCookie, {
                maxAge: SESSION_DURATION_MS,
                httpOnly: false, // Allow JavaScript access
                secure: true,
                domain: ".fansmeed.com",
                sameSite: "lax",
                path: "/",
            });

            // Set CORS headers
            res.set("Access-Control-Allow-Origin", finalRedirectUrl.includes("localhost") 
                ? "http://localhost:3000" 
                : "https://" + new URL(finalRedirectUrl).hostname);
            res.set("Access-Control-Allow-Credentials", "true");

            // Set debug headers
            res.set("X-Auth-User", decodedToken.uid);
            res.set("X-Auth-Role", role);
            res.set("X-Session-Set", "true");
            res.set("X-Firestore-DocId", firestoreDocId || decodedToken.uid);

            console.log(`✅ Session cookies set for ${decodedToken.uid}`);
            console.log(`🔄 Redirecting to: ${finalRedirectUrl}`);

            // Redirect to target site
            res.redirect(302, finalRedirectUrl);

        } catch (error) {
            console.error("❌ Error setting session cookie:", error.message);
            console.error("Stack:", error.stack);

            // Clear any existing cookies
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

            // Set error headers
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Credentials", "true");

            // Determine error type
            let errorType = "auth_failed";
            if (error.message.includes("expired")) errorType = "token_expired";
            if (error.message.includes("invalid signature")) errorType = "invalid_token";

            // Redirect to auth hub with error
            res.redirect(302, `https://auth.fansmeed.com/auth/login?error=${errorType}`);
        }
    }
);

// Helper function to validate redirect URLs
function isValidRedirectUrl(url) {
    try {
        const urlObj = new URL(url);
        const allowedDomains = ["cp.fansmeed.com", "fansmeed.com", "localhost"];
        return allowedDomains.some(domain => 
            urlObj.hostname === domain || 
            urlObj.hostname.endsWith(`.${domain}`)
        );
    } catch (error) {
        return false;
    }
}