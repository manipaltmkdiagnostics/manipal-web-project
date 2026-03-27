const express = require('express');
const router = express.Router();
// FIX 1: Import db directly from firebase.js — no longer depends on getDb() from database.js
const db = require('../firebaseConfig');

// POST /api/visitors — Track website visitors from welcome popup
router.post('/', async (req, res) => {
    try {
        const { patient_name, phone, test_name, test_id } = req.body;

        if (!patient_name || !phone) {
            return res.status(400).json({ message: 'Patient name and phone are required' });
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ message: 'Invalid phone number. Must be 10 digits.' });
        }

        const bookingTestName = test_name || 'Website Visitor';
        const bookingTestId = test_id || null;
        const notes = test_name
            ? `Visitor interested in: ${test_name}. Collected from welcome popup.`
            : 'Visitor information collected from welcome popup';

        const bookingData = {
            patient_name,
            phone,
            test_id: bookingTestId,
            test_name: bookingTestName,
            status: 'pending',
            notes,
            email: '',
            preferred_date: '',
            preferred_time: '',
            home_collection: false,
            address: '',
            location_link: '',
            report_file: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const docRef = await db.collection('bookings').add(bookingData);

        res.json({
            success: true,
            message: 'Information saved successfully',
            booking_id: docRef.id,
        });
    } catch (error) {
        console.error('POST /api/visitors error:', error);
        res.status(500).json({ message: 'Server error. Please try again.', detail: error.message });
    }
});

module.exports = router;