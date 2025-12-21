const { onRequest } = require("firebase-functions/v2/https");
const { validateSessionForClient } = require("./sessionValidator");

/**
 * HTTP endpoint for server-side session validation
 */
exports.verifySessionHttp = onRequest(
    {
        region: "us-central1",
        cors: false, // We will handle CORS manually for better control
    },
    async (req, res) => {
        const allowedOrigins = [
            "https://cp.fansmeed.com", 
            "https://fansmeed.com",
            "http://localhost:3000", // For local dev
            "http://localhost:3001"
        ];

        const origin = req.headers.origin;

        // 1. Dynamic Origin Check
        if (allowedOrigins.includes(origin)) {
            res.set("Access-Control-Allow-Origin", origin);
        }
        
        // 2. Mandatory Headers for Cookies
        res.set("Access-Control-Allow-Credentials", "true");
        res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Cookie");

        // 3. Handle Preflight
        if (req.method === "OPTIONS") {
            return res.status(204).send("");
        }

        try {
            let sessionToken;

            // Log headers to debug in Firebase console if cookie is missing
            console.log("Headers received:", req.headers);

            if (req.headers.cookie) {
                const cookieMatch = req.headers.cookie.match(/auth_session=([^;]+)/);
                if (cookieMatch) {
                    sessionToken = cookieMatch[1];
                }
            }

            if (!sessionToken) {
                return res.status(401).json({ authenticated: false, error: "MISSING_COOKIE" });
            }

            const sessionData = await validateSessionForClient(sessionToken);
            if (!sessionData) {
                return res.status(401).json({ authenticated: false, error: "INVALID_SESSION" });
            }

            return res.status(200).json({
                success: true,
                authenticated: true,
                user: { uid: sessionData.userId, role: sessionData.role }
            });

        } catch (error) {
            return res.status(500).json({ error: "INTERNAL_ERROR" });
        }
    }
);