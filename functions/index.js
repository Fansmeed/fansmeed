const { setGlobalOptions } = require("firebase-functions/v2");

// Set global options using v2 syntax
setGlobalOptions({ 
  maxInstances: 10,
  region: 'us-central1'
});

// Cross-domain authentication functions
const crossDomainAuth = require('./cross-domain-auth/customTokenGenerator');
exports.generateCustomToken = crossDomainAuth.generateCustomToken;
exports.validateCustomToken = crossDomainAuth.validateCustomToken;
exports.deleteCustomToken = crossDomainAuth.deleteCustomToken;
