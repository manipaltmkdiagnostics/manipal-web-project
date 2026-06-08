const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const cors = require('cors');
const { bucket } = require('./firebaseConfig');

// For cost control, limit max instances
setGlobalOptions({ maxInstances: 10 });

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Proxy route for uploads stored in Firebase Storage
app.get('/uploads/:folder/:filename', async (req, res) => {
    try {
        const { folder, filename } = req.params;
        // Validate folder to prevent path traversal / directory listing
        if (!['photos', 'test-images', 'reports'].includes(folder)) {
            return res.status(404).send('Not found');
        }
        
        const file = bucket.file(`${folder}/${filename}`);
        const [exists] = await file.exists();
        if (!exists) {
            return res.status(404).send('Not found');
        }
        
        const [metadata] = await file.getMetadata();
        res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        file.createReadStream().pipe(res);
    } catch (err) {
        console.error('Error proxying upload:', err);
        res.status(500).send('Internal server error');
    }
});

// Status check route
app.get('/api/status', (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/health-packages', require('./routes/packages'));
app.use('/api/visitors', require('./routes/visitors'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
});

// Export the Cloud Function API
exports.api = onRequest({ cors: true }, app);
