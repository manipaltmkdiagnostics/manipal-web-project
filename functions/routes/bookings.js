const express = require('express');
const router = express.Router();
const path = require('path');
const { db, bucket } = require('../firebaseConfig');
const { authenticateToken } = require('../middleware/auth');
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

function docToBooking(doc) {
    return { id: doc.id, ...doc.data() };
}

// POST /api/bookings — public (new booking from patient)
router.post('/', async (req, res) => {
    try {
        const {
            patient_name, phone, email, test_id, test_name,
            preferred_date, preferred_time, home_collection, homeCollection,
            address, homeAddress, location_link, locationLink, notes,
        } = req.body;

        if (!patient_name || !phone) {
            return res.status(400).json({ error: 'Patient name and phone are required' });
        }

        const isHome = (homeCollection !== undefined ? homeCollection : home_collection) ? true : false;
        const addrVal = (homeAddress !== undefined ? homeAddress : address) || '';
        const linkVal = (locationLink !== undefined ? locationLink : location_link) || '';

        const currentYear = new Date().getFullYear().toString();
        const counterRef = db.collection('booking_counters').doc(currentYear);

        let formattedId;
        const nowStr = new Date().toISOString();
        let bookingData;

        await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let count = 1;
            if (counterDoc.exists) {
                const data = counterDoc.data();
                if (data && typeof data.count === 'number') {
                    count = data.count + 1;
                }
            }

            const paddedCount = String(count).padStart(4, '0');
            formattedId = `${currentYear}-${paddedCount}`;

            bookingData = {
                patient_name,
                phone,
                email: email || '',
                test_id: test_id || null,
                test_name: test_name || '',
                preferred_date: preferred_date || '',
                preferred_time: preferred_time || '',
                notes: notes || '',
                status: 'pending',
                report_file: null,
                
                // Address fields
                homeCollection: isHome,
                homeAddress: addrVal,
                locationLink: linkVal,

                home_collection: isHome,
                address: addrVal,
                location_link: linkVal,

                // Booking ID and creation fields
                bookingId: formattedId,
                createdAt: nowStr,
                created_at: nowStr,
                updated_at: nowStr,
            };

            const bookingRef = db.collection('bookings').doc(formattedId);
            transaction.set(counterRef, { count });
            transaction.set(bookingRef, bookingData);
        });

        res.status(201).json({ id: formattedId, ...bookingData });
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

        const file = bucket.file(`reports/${booking.report_file}`);
        const [exists] = await file.exists();
        if (!exists) return res.status(404).json({ error: 'Report file not found in Storage' });

        const downloadName = `Report-${booking.patient_name.replace(/[^a-zA-Z0-9]/g, '_')}-${req.params.id}.pdf`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        res.setHeader('Content-Type', 'application/pdf');

        file.createReadStream()
            .on('error', (err) => {
                console.error('Error streaming PDF report:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error downloading report file' });
                }
            })
            .pipe(res);
    } catch (err) {
        console.error('GET /api/bookings/:id/report error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// PUT /api/bookings/:id — admin only (with optional PDF report upload)
router.put('/:id', authenticateToken, multipartParser, async (req, res) => {
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
                await deleteFromStorage('reports', booking.report_file);
            }
            const uniqueName = 'report-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '.pdf';
            await uploadToStorage(req.file.buffer, 'reports', uniqueName, req.file.mimetype);
            reportFile = uniqueName;
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
            await deleteFromStorage('reports', booking.report_file);
        }

        await docRef.delete();
        res.json({ message: 'Booking deleted successfully' });
    } catch (err) {
        console.error('DELETE /api/bookings/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;