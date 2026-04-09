const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

let serviceAccount;

// 1. Try to load from serviceAccountKey.json file
try {
    const rootPath = path.join(__dirname, '../serviceAccountKey.json');
    const localPath = path.join(__dirname, './serviceAccountKey.json');
    
    console.log(`[Firebase] Checking path: ${rootPath}`);
    
    try {
        serviceAccount = require(rootPath);
        console.log('✅ Found serviceAccountKey.json in root');
    } catch (e) {
        console.log(`[Firebase] Root check failed, checking: ${localPath}`);
        try {
            serviceAccount = require(localPath);
            console.log('✅ Found serviceAccountKey.json in config folder');
        } catch (e2) {
            console.log('❌ No serviceAccountKey.json file found in root or config');
        }
    }
} catch (error) {
    console.error('[Firebase] Unhandled error during file detection:', error.message);
}

// 2. Fallback: Try to load from FIREBASE_SERVICE_ACCOUNT Environment Variable (as a JSON string)
if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseError) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT env variable:', parseError.message);
    }
}

if (serviceAccount) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin Initialized Successfully');
    }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
        console.log('✅ Firebase Admin Initialized via GOOGLE_APPLICATION_CREDENTIALS');
    }
} else {
    console.error('❌ Firebase Admin NOT initialized. Please add serviceAccountKey.json OR FIREBASE_SERVICE_ACCOUNT environment variable.');
}

module.exports = admin;
