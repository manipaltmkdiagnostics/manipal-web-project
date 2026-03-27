const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// FIX 1: Import db directly from firebase.js — no longer depends on getDb() from database.js
const db = require('../firebaseConfig');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Ensure upload directory
const photosDir = path.join(__dirname, '..', 'uploads', 'photos');
if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, photosDir),
    filename: (req, file, cb) => {
        const uniqueName =
            'photo-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
        cb(null, uniqueName);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype.split('/')[1]);
        cb(null, ext && mime);
    },
});

// GET /api/photos — public
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;

        // FIX 2: Fetch all photos, filter category client-side to avoid composite index
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
        // FIX 3: Added console.error so errors are visible in server logs
        console.error('GET /api/photos error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// POST /api/photos — master admin only
router.post('/', authenticateToken, requireRole('master'), upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Photo file is required' });

        const { title, category, description, display_order } = req.body;

        const photoData = {
            title: title || 'Untitled',
            filename: req.file.filename,
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
router.put('/:id', authenticateToken, requireRole('master'), upload.single('photo'), async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = db.collection('photos').doc(id);
        const existing = await docRef.get();

        if (!existing.exists) return res.status(404).json({ error: 'Photo not found' });

        const photo = existing.data();
        const { title, category, description, display_order } = req.body;

        let filename = photo.filename;
        if (req.file) {
            // Delete old file before replacing
            const oldPath = path.join(photosDir, photo.filename);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            filename = req.file.filename;
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

        // Delete the physical file first
        const filePath = path.join(photosDir, existing.data().filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await docRef.delete();
        res.json({ message: 'Photo deleted successfully' });
    } catch (err) {
        // FIX 3: Added console.error — previously silent on delete errors
        console.error('DELETE /api/photos/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;