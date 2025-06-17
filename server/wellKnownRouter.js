const express = require('express');
const path = require('path');
const { openIdConfiguration, jwksUri } = require('./api-util/idToken');

const rsaPrivateKey = process.env.RSA_PRIVATE_KEY;
const rsaPublicKey = process.env.RSA_PUBLIC_KEY;
const keyId = process.env.KEY_ID;

const router = express.Router();

// Apple Pay domain verification
router.get('/apple-developer-merchantid-domain-association.txt', (req, res) => {
  const filePath = path.join(__dirname, '..', 'public', '.well-known', 'apple-developer-merchantid-domain-association.txt');
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('❌ Error serving Apple Pay domain verification file:', err);
      res.status(404).send('Apple Pay domain verification file not found');
    }
  });
});

// These .well-known/* endpoints will be enabled if you are using this template as OIDC proxy
// https://www.sharetribe.com/docs/cookbook-social-logins-and-sso/setup-open-id-connect-proxy/
if (rsaPublicKey && rsaPrivateKey) {
  router.get('/openid-configuration', openIdConfiguration);
  router.get('/jwks.json', jwksUri([{ alg: 'RS256', rsaPublicKey, keyId }]));
}

module.exports = router;
