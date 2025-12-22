// functions/verifySession/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { validateSessionForClient } = require("./sessionValidator");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * HTTP endpoint for session validation (for legacy support)
 * Primary flow now uses direct token exchange
 */
exports.verifySessionHttp = onRequest(
    {
        region: "us-central1",
        cors: {
            origin: [
                "https://cp.fansmeed.com", 
                "https://fansmeed.com",
                "https://auth.fansmeed.com",
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002"
            ],
            credentials: true,
            maxAge: 3600
        }
    },
    async (req, res) => {
        console.log("🔐 [VerifySession] Request received");
        
        // Handle OPTIONS preflight
        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        try {
            let sessionToken;

            // Extract token from cookie
            if (req.headers.cookie) {
                const cookieMatch = req.headers.cookie.match(/auth_session=([^;]+)/);
                if (cookieMatch) {
                    sessionToken = cookieMatch[1];
                }
            }

            // Also check for Authorization header (for token exchange)
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                const idToken = authHeader.split("Bearer ")[1];
                
                // Verify ID token and create custom token
                try {
                    const decodedToken = await admin.auth().verifyIdToken(idToken);
                    
                    // Create custom token for client-side Firebase auth
                    const customToken = await admin.auth().createCustomToken(decodedToken.uid, {
                        role: decodedToken.role || 'user',
                        email: decodedToken.email || '',
                        firestoreDocId: decodedToken.firestoreDocId || decodedToken.uid
                    });
                    
                    return res.status(200).json({
                        success: true,
                        authenticated: true,
                        customToken: customToken,
                        user: {
                            uid: decodedToken.uid,
                            role: decodedToken.role || 'user',
                            email: decodedToken.email || ''
                        }
                    });
                } catch (tokenError) {
                    console.error("Token verification error:", tokenError);
                }
            }

            // Legacy cookie-based validation
            if (!sessionToken) {
                return res.status(200).json({ 
                    authenticated: false, 
                    error: "NO_SESSION" 
                });
            }

            const sessionData = await validateSessionForClient(sessionToken);
            if (!sessionData) {
                return res.status(200).json({ 
                    authenticated: false, 
                    error: "INVALID_SESSION" 
                });
            }

            return res.status(200).json({
                success: true,
                authenticated: true,
                user: { 
                    uid: sessionData.userId, 
                    role: sessionData.role 
                }
            });

        } catch (error) {
            console.error("❌ Verify session error:", error);
            return res.status(500).json({ 
                error: "INTERNAL_ERROR",
                message: error.message 
            });
        }
    }
);