const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../firebaseConfig');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        let snapshot = await db
            .collection('admins')
            .where('username', '==', username)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Check if there are ANY admins in the database
            const allAdmins = await db.collection('admins').limit(1).get();
            if (allAdmins.empty) {
                // Database is empty. Let's check if the entered credentials match default env or fallback
                const defaultUser = process.env.MASTER_ADMIN_USERNAME || 'masteradmin';
                const defaultPass = process.env.MASTER_ADMIN_PASSWORD || 'Master@123';
                
                if (username === defaultUser && password === defaultPass) {
                    const hashedPassword = await bcrypt.hash(defaultPass, 10);
                    const newAdmin = {
                        username: defaultUser,
                        password_hash: hashedPassword,
                        role: 'master',
                        full_name: 'Master Admin',
                        created_at: new Date().toISOString()
                    };
                    const docRef = await db.collection('admins').add(newAdmin);
                    
                    const token = jwt.sign(
                        { id: docRef.id, username: defaultUser, role: 'master' },
                        process.env.JWT_SECRET || 'fallback-secret',
                        { expiresIn: '24h' }
                    );
                    
                    return res.json({
                        token,
                        user: {
                            id: docRef.id,
                            username: defaultUser,
                            full_name: 'Master Admin',
                            role: 'master',
                        },
                    });
                }
            }
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