// functions/setSessionCookie/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

// Session duration: 5 days
const SESSION_DURATION = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds

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
            // Get token from query or authorization header
            const idToken = req.query.token || 
                           (req.headers.authorization && req.headers.authorization.split("Bearer ")[1]);
            
            const redirectUrl = req.query.redirectUrl;
            const role = req.query.role || "user";

            console.log("📨 Token received:", idToken ? "Yes" : "No");
            console.log("🔗 Redirect URL:", redirectUrl);
            console.log("🎭 Role:", role);

            if (!idToken) {
                throw new Error("No ID token provided");
            }

            // Verify the ID token
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            console.log("✅ ID Token verified for UID:", decodedToken.uid);
            console.log("📧 User email:", decodedToken.email);

            // Create a Firebase session cookie
            const sessionCookie = await admin.auth().createSessionCookie(idToken, {
                expiresIn: SESSION_DURATION,
            });

            // Determine correct redirect URL
            let finalRedirectUrl = redirectUrl;
            if (!finalRedirectUrl || !isValidRedirectUrl(finalRedirectUrl)) {
                finalRedirectUrl = role === "admin" 
                    ? "https://cp.fansmeed.com/"
                    : "https://fansmeed.com/";
            }

            console.log("🍪 Creating session cookie...");
            
            // CRITICAL: Set cookie with proper domain for cross-subdomain access
            const cookieOptions = {
                maxAge: SESSION_DURATION,
                httpOnly: true,
                secure: true, // Must be true for cross-domain
                domain: ".fansmeed.com", // Leading dot for all subdomains
                sameSite: "lax", // Use "lax" for same-site cookies
                path: "/",
            };

            // Set the cookie
            res.cookie("__session", sessionCookie, cookieOptions);
            
            // Also set a custom cookie for your app
            res.cookie("auth_session", sessionCookie, {
                ...cookieOptions,
                httpOnly: false, // Allow client-side access if needed
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

            console.log(`✅ Session cookie set for ${decodedToken.uid}`);
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
            });
            res.clearCookie("auth_session", {
                domain: ".fansmeed.com",
                path: "/",
            });

            // Set error headers
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Credentials", "true");

            // Redirect to auth hub with error
            const errorParam = encodeURIComponent(error.message.includes("expired") ? "token_expired" : "auth_failed");
            res.redirect(302, `https://auth.fansmeed.com/auth/login?error=${errorParam}`);
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