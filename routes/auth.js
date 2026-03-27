const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../firebaseConfig');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const snapshot = await db
            .collection('admins')
            .where('username', '==', username)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const adminDoc = snapshot.docs[0];
        const admin = { id: adminDoc.id, ...adminDoc.data() };

        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        console.log(`[DEBUG] Login successful: User ${admin.username}, Role: ${admin.role}`);
        
        res.json({
            token,
            user: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name || '',
                role: admin.role,
            },
        });
    } catch (err) {
        console.error('POST /api/auth/login error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// GET /api/auth/me — verify token and return current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const docRef = await db.collection('admins').doc(req.user.id).get();
        if (!docRef.exists) return res.status(404).json({ error: 'User not found' });

        const data = docRef.data();
        res.json({
            id: docRef.id,
            username: data.username,
            full_name: data.full_name || '',
            role: data.role,
        });
    } catch (err) {
        console.error('GET /api/auth/me error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;