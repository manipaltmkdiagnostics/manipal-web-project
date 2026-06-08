const express = require('express');
const router = express.Router();
const path = require('path');
const { db, bucket } = require('../firebaseConfig');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multipartParser = require('../middleware/multipart');

// Helper: Upload file to Firebase Storage
async function uploadToStorage(buffer, folder, filename, mimeType) {
    const blob = bucket.file(`${folder}/${filename}`);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: mimeType
        }
    });
    return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => reject(err));
        blobStream.on('finish', () => resolve());
        blobStream.end(buffer);
    });
}

// Helper: Delete file from Firebase Storage
async function deleteFromStorage(folder, filename) {
    if (!filename) return;
    const file = bucket.file(`${folder}/${filename}`);
    try {
        await file.delete();
    } catch (err) {
        console.warn(`File ${folder}/${filename} not deleted:`, err.message);
    }
}

// GET /api/photos — public
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;

        // Fetch all photos, filter category client-side to avoid composite index
        const snapshot = await db.collection('photos').get();
        let photos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        if (category) {
            photos = photos.filter((p) => p.category === category);
        }

        // Sort: display_order ASC, created_at DESC
        photos.sort((a, b) => {
            const orderDiff = (a.display_order || 0) - (b.display_order || 0);
            if (orderDiff !== 0) return orderDiff;
            return new Date(b.created_at) - new Date(a.created_at);
        });

        res.json(photos);
    } catch (err) {
        console.error('GET /api/photos error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// POST /api/photos — master admin only
router.post('/', authenticateToken, requireRole('master'), multipartParser, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Photo file is required' });

        const uniqueName = 'photo-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname);
        await uploadToStorage(req.file.buffer, 'photos', uniqueName, req.file.mimetype);

        const { title, category, description, display_order } = req.body;

        const photoData = {
            title: title || 'Untitled',
            filename: uniqueName,
            category: category || 'gallery',
            description: description || '',
            display_order: parseInt(display_order) || 0,
            created_at: new Date().toISOString(),
        };

        const docRef = await db.collection('photos').add(photoData);
        res.status(201).json({ id: docRef.id, ...photoData });
    } catch (err) {
        console.error('POST /api/photos error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// PUT /api/photos/:id — master admin only
router.put('/:id', authenticateToken, requireRole('master'), multipartParser, async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = db.collection('photos').doc(id);
        const existing = await docRef.get();

        if (!existing.exists) return res.status(404).json({ error: 'Photo not found' });

        const photo = existing.data();
        const { title, category, description, display_order } = req.body;

        let filename = photo.filename;
        if (req.file) {
            // Delete old file from storage
            await deleteFromStorage('photos', photo.filename);
            const uniqueName = 'photo-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname);
            await uploadToStorage(req.file.buffer, 'photos', uniqueName, req.file.mimetype);
            filename = uniqueName;
        }

        const updates = {
            title: title || photo.title,
            filename,
            category: category || photo.category,
            description: description !== undefined ? description : photo.description,
            display_order: display_order !== undefined ? parseInt(display_order) : photo.display_order,
        };

        await docRef.update(updates);
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    } catch (err) {
        console.error('PUT /api/photos/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// DELETE /api/photos/:id — master admin only
router.delete('/:id', authenticateToken, requireRole('master'), async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = db.collection('photos').doc(id);
        const existing = await docRef.get();

        if (!existing.exists) return res.status(404).json({ error: 'Photo not found' });

        // Delete the physical file from Firebase Storage
        if (existing.data().filename) {
            await deleteFromStorage('photos', existing.data().filename);
        }

        await docRef.delete();
        res.json({ message: 'Photo deleted successfully' });
    } catch (err) {
        console.error('DELETE /api/photos/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;