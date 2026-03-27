const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../firebaseConfig');
const { authenticateToken } = require('../middleware/auth');

// Ensure reports upload directory
const reportsDir = path.join(__dirname, '..', 'uploads', 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Multer config for PDF reports
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, reportsDir),
    filename: (req, file, cb) => {
        const uniqueName = 'report-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '.pdf';
        cb(null, uniqueName);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});

function docToBooking(doc) {
    return { id: doc.id, ...doc.data() };
}

// POST /api/bookings — public (new booking from patient)
router.post('/', async (req, res) => {
    try {
        const {
            patient_name, phone, email, test_id, test_name,
            preferred_date, preferred_time, home_collection,
            address, location_link, notes,
        } = req.body;

        if (!patient_name || !phone) {
            return res.status(400).json({ error: 'Patient name and phone are required' });
        }

        const bookingData = {
            patient_name,
            phone,
            email: email || '',
            test_id: test_id || null,
            test_name: test_name || '',
            preferred_date: preferred_date || '',
            preferred_time: preferred_time || '',
            home_collection: home_collection ? true : false,
            address: address || '',
            location_link: location_link || '',
            notes: notes || '',
            status: 'pending',
            report_file: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const docRef = await db.collection('bookings').add(bookingData);
        res.status(201).json({ id: docRef.id, ...bookingData });
    } catch (err) {
        console.error('POST /api/bookings error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// GET /api/bookings — admin only (list all bookings with optional filters)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, date } = req.query;

        // Fetch all then filter client-side to avoid composite index requirements
        const snapshot = await db.collection('bookings').get();
        let bookings = snapshot.docs.map(docToBooking);

        if (status) bookings = bookings.filter((b) => b.status === status);
        if (date) bookings = bookings.filter((b) => b.preferred_date === date);

        bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(bookings);
    } catch (err) {
        console.error('GET /api/bookings error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// GET /api/bookings/stats — admin only (must be BEFORE /:id to avoid route conflict)
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const snapshot = await db.collection('bookings').get();
        const all = snapshot.docs.map((d) => d.data());
        const today = new Date().toISOString().slice(0, 10);

        res.json({
            total: all.length,
            pending: all.filter((b) => b.status === 'pending').length,
            confirmed: all.filter((b) => b.status === 'confirmed').length,
            completed: all.filter((b) => b.status === 'completed').length,
            cancelled: all.filter((b) => b.status === 'cancelled').length,
            todayBookings: all.filter((b) => b.created_at && b.created_at.startsWith(today)).length,
        });
    } catch (err) {
        console.error('GET /api/bookings/stats error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// GET /api/bookings/:id/report — download PDF report (admin only)
router.get('/:id/report', authenticateToken, async (req, res) => {
    try {
        const docSnap = await db.collection('bookings').doc(req.params.id).get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Booking not found' });

        const booking = docSnap.data();
        if (!booking.report_file) return res.status(404).json({ error: 'No report uploaded for this booking' });

        const filePath = path.join(reportsDir, booking.report_file);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report file not found on server' });

        const downloadName = `Report-${booking.patient_name.replace(/[^a-zA-Z0-9]/g, '_')}-${req.params.id}.pdf`;
        res.download(filePath, downloadName);
    } catch (err) {
        console.error('GET /api/bookings/:id/report error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// PUT /api/bookings/:id — admin only (with optional PDF report upload)
router.put('/:id', authenticateToken, upload.single('report'), async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('bookings').doc(id);
        const existing = await docRef.get();

        if (!existing.exists) return res.status(404).json({ error: 'Booking not found' });

        const booking = existing.data();
        const status = req.body.status || booking.status;
        const notes = req.body.notes !== undefined ? req.body.notes : booking.notes;

        if (status === 'completed' && !req.file && !booking.report_file) {
            return res.status(400).json({ error: 'A report PDF must be uploaded to mark this booking as completed.' });
        }

        let reportFile = booking.report_file;
        if (req.file) {
            if (booking.report_file) {
                const oldPath = path.join(reportsDir, booking.report_file);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            reportFile = req.file.filename;
        }

        await docRef.update({ status, notes, report_file: reportFile, updated_at: new Date().toISOString() });
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    } catch (err) {
        console.error('PUT /api/bookings/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// DELETE /api/bookings/:id — admin only
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('bookings').doc(id);
        const existing = await docRef.get();

        if (!existing.exists) return res.status(404).json({ error: 'Booking not found' });

        const booking = existing.data();
        if (booking.report_file) {
            const filePath = path.join(reportsDir, booking.report_file);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await docRef.delete();
        res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
        console.error('DELETE /api/bookings/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;