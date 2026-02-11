const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

let serviceAccount;

try {
    // Check if serviceAccountKey.json exists inside config or root
    // Try root first
    const rootPath = path.join(__dirname, '../serviceAccountKey.json');
    // Try creating a require call dynamically if needed, but path check is better
    // Since this is node, require works
    try {
        serviceAccount = require(rootPath);
    } catch (e) {
        // try config folder
        serviceAccount = require('./serviceAccountKey.json');
    }
} catch (error) {
    console.warn('⚠️ serviceAccountKey.json not found. Notifications will not work unless configured.');
}

if (serviceAccount) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin Initialized with serviceAccountKey.json');
    }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
        console.log('✅ Firebase Admin Initialized via GOOGLE_APPLICATION_CREDENTIALS');
    }
} else {
    console.warn('⚠️ Firebase Admin NOT initialized. Please add serviceAccountKey.json');
}

module.exports = admin;
