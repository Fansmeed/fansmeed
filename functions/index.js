// functions/index.js
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ 
  maxInstances: 10,
  timeoutSeconds: 60,
  region: 'us-central1'
});

const issuePassport = require("./issuePassport/index");
const setSessionCookie = require("./setSessionCookie/index");
const verifySession = require("./verifySession/index");
const exchangeToken = require("./exchangeToken/index");

exports.issuePassport = issuePassport.issuePassport;
exports.setSessionCookie = setSessionCookie.setSessionCookie;
exports.verifySessionHttp = verifySession.verifySessionHttp;
exports.exchangeToken = exchangeToken.exchangeToken;

// Additional helper function for logout
exports.clearSession = require("./clearSession/index").clearSession;