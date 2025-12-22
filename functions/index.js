// functions/index.js
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ 
  maxInstances: 10,
  timeoutSeconds: 60,
  region: 'us-central1'
});

const issuePassport = require("./issuePassport/index");
const setSessionCookie = require("./setSessionCookie/index");
const verifySession = require("./verifySession/index"); // This should be the Firebase session cookie version

exports.issuePassport = issuePassport.issuePassport;
exports.setSessionCookie = setSessionCookie.setSessionCookie;
exports.verifySessionHttp = verifySession.verifySessionHttp; // Keep same name for backward compatibility