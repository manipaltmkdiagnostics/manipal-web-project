const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// FIX 1: Import db directly from firebase.js — no longer depends on getDb() from database.js
const db = require('../firebaseConfig');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Ensure test-images upload directory
const imagesDir = path.join(__dirname, '..', 'uploads', 'test-images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Multer config for test images
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, imagesDir),
    filename: (req, file, cb) => {
        const uniqueName =
            'test-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
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

// Helper: convert a Firestore doc to a plain object with id
function docToTest(doc) {
    return { id: doc.id, ...doc.data() };
}

// GET /api/tests — public
router.get('/', async (req, res) => {
    try {
        const { search, category, popular } = req.query;

        // Fetch ALL docs then filter entirely client-side in Node —
        // avoids ANY Firestore index requirement (single-field boolean indexes
        // are not auto-created and silently return empty results).
        const snapshot = await db.collection('tests').get();
        console.log(`[GET /api/tests] Total docs in collection: ${snapshot.size}`);

        let tests = snapshot.docs.map(docToTest);

        // Always filter out inactive tests
        tests = tests.filter((t) => t.is_active === true);
        console.log(`[GET /api/tests] Active tests: ${tests.length}`);

        // Optional filters
        if (category) tests = tests.filter((t) => t.category === category);
        if (popular)   tests = tests.filter((t) => t.is_popular === true);
        if (search) {
            const s = search.toLowerCase();
            tests = tests.filter(
                (t) =>
                    (t.name && t.name.toLowerCase().includes(s)) ||
                    (t.description && t.description.toLowerCase().includes(s)) ||
                    (t.category && t.category.toLowerCase().includes(s))
            );
        }

        // Sort: is_popular DESC, name ASC
        tests.sort((a, b) => {
            if (b.is_popular !== a.is_popular) return b.is_popular ? 1 : -1;
            return (a.name || '').localeCompare(b.name || '');
        });

        res.json(tests);
    } catch (err) {
        console.error('GET /api/tests error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// GET /api/tests/categories — must be defined BEFORE /:id to avoid route conflict
router.get('/categories', async (req, res) => {
    try {
        const snapshot = await db.collection('tests').get();
        const categories = [
            ...new Set(
                snapshot.docs
                    .map((d) => d.data())
                    .filter((d) => d.is_active === true)
                    .map((d) => d.category)
                    .filter(Boolean)
            ),
        ].sort();
        res.json(categories);
    } catch (err) {
        console.error('GET /api/tests/categories error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// POST /api/tests — master admin only
router.post('/', authenticateToken, requireRole('master'), upload.single('image'), async (req, res) => {
    try {
        const {
            name,
            category,
            description,
            parameters,
            price,
            original_price,
            turnaround_time,
            sample_type,
            fasting_required,
            is_popular,
            image_standard_size,
            image_max_width,
            image_max_height,
        } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const imageFile = req.file ? req.file.filename : null;
        const stdSize = image_standard_size === 'false' || image_standard_size === '0' ? false : true;

        const testData = {
            name,
            category: category || 'General',
            description: description || '',
            parameters: parameters || '',
            price: parseFloat(price),
            original_price: original_price ? parseFloat(original_price) : null,
            turnaround_time: turnaround_time || '24 hours',
            sample_type: sample_type || 'Blood',
            fasting_required: fasting_required === 'true' || fasting_required === '1',
            is_popular: is_popular === 'true' || is_popular === '1',
            is_active: true,
            image_file: imageFile,
            image_standard_size: stdSize,
            image_max_width: parseInt(image_max_width) || 200,
            image_max_height: parseInt(image_max_height) || 200,
            created_at: new Date().toISOString(),
        };

        const docRef = await db.collection('tests').add(testData);
        console.log(`[POST /api/tests] Saved test "${testData.name}" with ID: ${docRef.id}`);
        res.status(201).json({ id: docRef.id, ...testData });
    } catch (err) {
        console.error('POST /api/tests error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// PUT /api/tests/:id — master admin only
router.put('/:id', authenticateToken, requireRole('master'), upload.single('image'), async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = db.collection('tests').doc(id);
        const existing = await docRef.get();

        if (!existing.exists) return res.status(404).json({ error: 'Test not found' });

        const test = existing.data();
        const {
            name,
            category,
            description,
            parameters,
            price,
            original_price,
            turnaround_time,
            sample_type,
            fasting_required,
            is_popular,
            image_standard_size,
            image_max_width,
            image_max_height,
            remove_image,
        } = req.body;

        // Handle image replacement / removal
        let imageFile = test.image_file;
        if (remove_image === 'true' || remove_image === '1') {
            if (test.image_file) {
                const oldPath = path.join(imagesDir, test.image_file);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            imageFile = null;
        } else if (req.file) {
            if (test.image_file) {
                const oldPath = path.join(imagesDir, test.image_file);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            imageFile = req.file.filename;
        }

        const parseBool = (val, fallback) => {
            if (val === undefined || val === '') return fallback;
            return val === 'true' || val === '1';
        };

        const stdSize =
            image_standard_size !== undefined
                ? image_standard_size !== 'false' && image_standard_size !== '0'
                : test.image_standard_size;

        const updates = {
            name: name || test.name,
            category: category || test.category,
            description: description !== undefined ? description : test.description,
            parameters: parameters !== undefined ? parameters : test.parameters,
            price: price !== undefined ? parseFloat(price) : test.price,
            original_price:
                original_price !== undefined
                    ? original_price
                        ? parseFloat(original_price)
                        : null
                    : test.original_price,
            turnaround_time: turnaround_time || test.turnaround_time,
            sample_type: sample_type || test.sample_type,
            fasting_required: parseBool(fasting_required, test.fasting_required),
            is_popular: parseBool(is_popular, test.is_popular),
            image_file: imageFile,
            image_standard_size: stdSize,
            image_max_width: parseInt(image_max_width) || test.image_max_width || 200,
            image_max_height: parseInt(image_max_height) || test.image_max_height || 200,
        };

        await docRef.update(updates);
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    } catch (err) {
        console.error('PUT /api/tests/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// DELETE /api/tests/:id — soft delete, master admin only
router.delete('/:id', authenticateToken, requireRole('master'), async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = db.collection('tests').doc(id);
        const existing = await docRef.get();

        if (!existing.exists) return res.status(404).json({ error: 'Test not found' });

        await docRef.update({ is_active: false });
        res.json({ message: 'Test deleted successfully' });
    } catch (err) {
        console.error('DELETE /api/tests/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;