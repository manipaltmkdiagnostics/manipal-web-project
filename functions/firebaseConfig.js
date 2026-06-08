const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

let bucketInstance = null;
let storageInitialized = false;

module.exports = {
    db,
    get bucket() {
        if (!storageInitialized) {
            try {
                // Initialize default storage bucket
                bucketInstance = admin.storage().bucket();
            } catch (err) {
                console.error("Firebase Storage initialization failed. Bucket might not be configured in Firebase Console:", err);
                
                // Return a fallback bucket object to prevent the application from crashing on boot
                bucketInstance = {
                    file: (path) => ({
                        exists: async () => [false],
                        delete: async () => {},
                        getMetadata: async () => [{}],
                        createWriteStream: () => {
                            const { Writable } = require('stream');
                            const dummy = new Writable({
                                write(chunk, encoding, callback) { callback(); }
                            });
                            setTimeout(() => {
                                dummy.emit('error', new Error('Firebase Storage is not initialized or configured. Please enable Cloud Storage in your Firebase Console.'));
                            }, 10);
                            return dummy;
                        },
                        createReadStream: () => {
                            const { Readable } = require('stream');
                            const dummy = new Readable({
                                read() { this.push(null); }
                            });
                            setTimeout(() => {
                                dummy.emit('error', new Error('Firebase Storage is not initialized or configured. Please enable Cloud Storage in your Firebase Console.'));
                            }, 10);
                            return dummy;
                        }
                    })
                };
            }
            storageInitialized = true;
        }
        return bucketInstance;
    }
};
