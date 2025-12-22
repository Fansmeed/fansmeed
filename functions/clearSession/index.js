// functions/clearSession/index.js
const { onRequest } = require("firebase-functions/v2/https");

/**
 * Clear session cookie on logout
 */
exports.clearSession = onRequest(
    {
        region: "us-central1",
        cors: {
            origin: [
                "https://cp.fansmeed.com", 
                "https://fansmeed.com",
                "https://auth.fansmeed.com"
            ],
            credentials: true
        }
    },
    async (req, res) => {
        console.log("🧹 [ClearSession] Clearing session");
        
        // Handle OPTIONS preflight
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        // Clear the session cookie
        res.setHeader("Set-Cookie", [
            "auth_session=; Domain=fansmeed.com; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None"
        ]);
        
        res.status(200).json({ 
            success: true, 
            message: "Session cleared" 
        });
    }
);