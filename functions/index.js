const { setGlobalOptions } = require("firebase-functions/v2");

// Set global options using v2 syntax
setGlobalOptions({ 
  maxInstances: 10,
  timeoutSeconds: 60,
  region: 'us-central1'
});

const setSessionCookie = require("./setSessionCookie/index");
const verifySession = require("./verifySession/index");

// Export functions
exports.setSessionCookie = setSessionCookie.setSessionCookie;
exports.verifySessionHttp = verifySession.verifySessionHttp;
