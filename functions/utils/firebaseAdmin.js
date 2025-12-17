// functions/utils/firebaseAdmin.js
const admin = require('firebase-admin');

try {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
} catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw error;
}

module.exports = admin;