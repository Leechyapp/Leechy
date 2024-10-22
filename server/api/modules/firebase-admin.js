const FirebaseAdmin = require('firebase-admin/app');
const path = require('path');

const serviceAccount = path.resolve(__dirname, `./service-account-${process.env.NODE_ENV}.json`);

FirebaseAdmin.initializeApp({
  credential: FirebaseAdmin.credential.cert(serviceAccount),
});

module.exports = FirebaseAdmin;
