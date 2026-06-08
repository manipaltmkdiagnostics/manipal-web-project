const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../firebaseConfig');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/admins — master admin only
router.get('/', authenticateToken, requireRole('master'), async (req, res) => {
    try {
        const snapshot = await db.collection('admins').get();

        const admins = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                username: d.username,
                full_name: d.full_name || '',
                role: d.role,
                created_at: d.created_at,
            };
        });

        admins.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(admins);
    } catch (err) {
        console.error('GET /api/admins error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;