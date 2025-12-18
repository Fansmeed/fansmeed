const { setGlobalOptions } = require("firebase-functions/v2");

// Set global options using v2 syntax
setGlobalOptions({ 
  maxInstances: 10,
  region: 'us-central1'
});

// Cross-domain authentication functions
const generateCustomToken = require('./generateCustomToken');
exports.generateCustomToken = generateCustomToken.generateCustomTokenCallable;

const verifySession = require('./verifySession');
exports.verifySession = verifySession.verifySessionCallable;

