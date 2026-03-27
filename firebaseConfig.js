/**
 * firebase.js
 * Initializes Firebase Admin SDK and exports the Firestore db instance.
 *
 * NOTE: Your service account key file is named "serviceAccountKey.json.json"
 * (double extension). Either:
 *   a) Rename it to "serviceAccountKey.json"  ← recommended
 *   b) Or this file handles both names automatically (see below)
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
    // Support both "serviceAccountKey.json" and "serviceAccountKey.json.json"
    const possiblePaths = [
        path.join(__dirname, 'serviceAccountKey.json'),
        path.join(__dirname, 'serviceAccountKey.json.json'),
    ];

    const keyPath = possiblePaths.find((p) => fs.existsSync(p));
    if (!keyPath) {
        throw new Error(
            'Firebase service account key not found. ' +
            'Expected "serviceAccountKey.json" in the project root.'
        );
    }

    const serviceAccount = require(keyPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

module.exports = db;