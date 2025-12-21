// functions/index.js
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ 
  maxInstances: 10,
  timeoutSeconds: 60,
  region: 'us-central1'
});

const issuePassport = require("./issuePassport/index");
const setSessionCookie = require("./setSessionCookie/index");
const verifySessionCookie = require("./verifySessionCookie/index"); // NEW
const verifySession = require("./verifySession/index"); // Keep old one for backward compatibility

exports.issuePassport = issuePassport.issuePassport;
exports.setSessionCookie = setSessionCookie.setSessionCookie;
exports.verifySessionCookie = verifySessionCookie.verifySessionCookie; // NEW
exports.verifySessionHttp = verifySession.verifySessionHttp;