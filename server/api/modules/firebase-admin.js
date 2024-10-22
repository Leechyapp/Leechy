const FirebaseAdmin = require('firebase-admin');
const path = require('path');

const serviceAccount = path.resolve(
  __dirname,
  `./service-account-${process.env.REACT_APP_ENV}.json`
);

FirebaseAdmin.initializeApp({
  credential: FirebaseAdmin.credential.cert(serviceAccount),
});

module.exports = FirebaseAdmin;
