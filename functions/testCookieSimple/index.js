// Location: Cloud Functions/testCookieSimple/index.js
const { onRequest } = require("firebase-functions/v2/https");

exports.testCookieSimple = onRequest(
    {
        region: "us-central1",
        cors: true,
    },
    async (req, res) => {
        console.log("🧪 Testing simple cookie setting...");
        
        // Set a simple test cookie
        const cookieValue = `test_${Date.now()}`;
        const cookieHeader = [
            `test_cookie=${cookieValue}`,
            'Domain=.fansmeed.com',
            'Path=/',
            'HttpOnly',
            'Secure',
            'SameSite=None',
            'Max-Age=3600'
        ].join('; ');
        
        console.log("🍪 Setting cookie:", cookieHeader);
        
        res.setHeader("Set-Cookie", cookieHeader);
        
        // Set CORS headers
        res.set("Access-Control-Allow-Origin", "https://auth.fansmeed.com");
        res.set("Access-Control-Allow-Credentials", "true");
        
        res.json({ 
            success: true, 
            message: "Test cookie set",
            cookieValue: cookieValue,
            cookieHeader: cookieHeader
        });
    }
);