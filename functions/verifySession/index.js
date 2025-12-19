const { onRequest } = require("firebase-functions/v2/https");
const { validateSessionForClient } = require("./sessionValidator");

/**
 * HTTP endpoint for server-side session validation
 */
exports.verifySessionHttp = onRequest(
    {
        region: "us-central1",
        cors: true,
    },
    async (req, res) => {
        console.log("🔐 HTTP Session verification endpoint called");

        // Handle CORS
        res.set("Access-Control-Allow-Origin", ["https://cp.fansmeed.com", "https://fansmeed.com"]);
        res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Cookie");
        res.set("Access-Control-Allow-Credentials", "true");

        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        try {
            // Get session token from cookie or query param
            let sessionToken;

            if (req.headers.cookie) {
                const cookieMatch = req.headers.cookie.match(/auth_session=([^;]+)/);
                if (cookieMatch) {
                    sessionToken = cookieMatch[1];
                }
            }

            if (!sessionToken && req.query.token) {
                sessionToken = req.query.token;
            }

            if (!sessionToken) {
                return res.status(401).json({
                    success: false,
                    authenticated: false,
                    error: "NO_SESSION_TOKEN"
                });
            }

            const sessionData = await validateSessionForClient(sessionToken);

            if (!sessionData) {
                return res.status(401).json({
                    success: false,
                    authenticated: false,
                    error: "INVALID_SESSION"
                });
            }

            return res.status(200).json({
                success: true,
                authenticated: true,
                user: {
                    uid: sessionData.userId,
                    role: sessionData.role,
                    sessionAge: Date.now() - sessionData.timestamp
                }
            });

        } catch (error) {
            console.error("❌ Session verification failed:", error);
            return res.status(500).json({
                success: false,
                authenticated: false,
                error: "SERVER_ERROR"
            });
        }
    }
);