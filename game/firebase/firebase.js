const { initializeApp } = require("firebase/app");
const { getAnalytics } = require("firebase/analytics");
const { getAuth } = require("firebase/auth");
require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountBase64 = process.env.SERVICE_FILE;

let serviceAccount;

serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));

const firebaseConfig = {
  apiKey: `${process.env.API_KEY}`,
  authDomain: `${process.env.AUTH_DOMAIN}`,
  projectId: `${process.env.PROJECT_ID}`,
  storageBucket: `${process.env.STORAGE_BUCKET}`,
  messagingSenderId: `${process.env.MSG_SENDER_ID}`,
  appId: `${process.env.APP_ID}`,
  measurementId: `${process.env.MEASUREMENT_ID}`
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://kadi-9b2c2-default-rtdb.firebaseio.com",
});

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = admin.firestore();

module.exports = { app, auth, getAnalytics, db, admin };