// const express = require('express');
// const router = express.Router();
// const db = require('../firebaseConfig');
// const { authenticateToken, requireRole } = require('../middleware/auth');

// // GET /api/health-packages — public
// router.get('/', async (req, res) => {
//     try {
//         // Fetch ALL then filter client-side — avoids Firestore index requirement
//         const snapshot = await db.collection('health_packages').get();
//         console.log(`[GET /api/health-packages] Total docs: ${snapshot.size}`);

//         const packages = snapshot.docs
//             .map((doc) => ({ id: doc.id, ...doc.data() }))
//             .filter((p) => p.is_active === true);

//         console.log(`[GET /api/health-packages] Active packages: ${packages.length}`);

//         // Fetch each package's tests by individual doc lookups
//         // (avoids the invalid __name__ + compound query that requires a composite index)
//         for (const pkg of packages) {
//             const testIds = Array.isArray(pkg.testIds) ? pkg.testIds : [];
//             if (testIds.length === 0) {
//                 pkg.tests = [];
//                 continue;
//             }
//             const testDocs = await Promise.all(
//                 testIds.map((tid) => db.collection('tests').doc(tid).get())
//             );
//             pkg.tests = testDocs
//                 .filter((d) => d.exists && d.data().is_active !== false)
//                 .map((d) => ({ id: d.id, ...d.data() }));
//         }

//         packages.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
//         res.json(packages);
//     } catch (err) {
//         console.error('GET /api/health-packages error:', err);
//         res.status(500).json({ error: 'Server error', detail: err.message });
//     }
// });

// // POST /api/health-packages — master admin only
// router.post('/', authenticateToken, requireRole('master'), async (req, res) => {
//     try {
//         const { name, description, price, testIds } = req.body;

//         if (!name || !price || !Array.isArray(testIds) || testIds.length === 0) {
//             return res.status(400).json({ error: 'Name, price, and at least one test are required' });
//         }

//         const packageData = {
//             name,
//             description: description || '',
//             price: parseFloat(price),
//             testIds,
//             is_active: true,
//             created_at: new Date().toISOString(),
//         };

//         const docRef = await db.collection('health_packages').add(packageData);
//         console.log(`[POST /api/health-packages] Saved package "${packageData.name}" with ID: ${docRef.id}, testIds: ${JSON.stringify(packageData.testIds)}`);
//         res.status(201).json({ id: docRef.id, ...packageData });
//     } catch (err) {
//         console.error('POST /api/health-packages error:', err);
//         res.status(500).json({ error: 'Server error', detail: err.message });
//     }
// });

// // PUT /api/health-packages/:id — master admin only
// router.put('/:id', authenticateToken, requireRole('master'), async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { name, description, price, testIds } = req.body;

//         const docRef = db.collection('health_packages').doc(id);
//         const existing = await docRef.get();
//         if (!existing.exists) return res.status(404).json({ error: 'Package not found' });

//         const current = existing.data();
//         const updates = {
//             name: name || current.name,
//             description: description !== undefined ? description : current.description,
//             price: price !== undefined ? parseFloat(price) : current.price,
//         };
//         if (Array.isArray(testIds)) updates.testIds = testIds;

//         await docRef.update(updates);
//         const updated = await docRef.get();
//         res.json({ id: updated.id, ...updated.data() });
//     } catch (err) {
//         console.error('PUT /api/health-packages/:id error:', err);
//         res.status(500).json({ error: 'Server error', detail: err.message });
//     }
// });

// // DELETE /api/health-packages/:id — soft delete, master admin only
// router.delete('/:id', authenticateToken, requireRole('master'), async (req, res) => {
//     try {
//         const { id } = req.params;
//         const docRef = db.collection('health_packages').doc(id);
//         const existing = await docRef.get();
//         if (!existing.exists) return res.status(404).json({ error: 'Package not found' });

//         await docRef.update({ is_active: false });
//         res.json({ message: 'Package deleted successfully' });
//     } catch (err) {
//         console.error('DELETE /api/health-packages/:id error:', err);
//         res.status(500).json({ error: 'Server error', detail: err.message });
//     }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../firebaseConfig');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/health-packages — public
router.get('/', async (req, res) => {
    try {
        // Fetch ALL then filter client-side — avoids Firestore index requirement
        const snapshot = await db.collection('health_packages').get();
        console.log(`[GET /api/health-packages] Total docs: ${snapshot.size}`);

        const packages = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((p) => p.is_active === true);

        console.log(`[GET /api/health-packages] Active packages: ${packages.length}`);

        // Fetch each package's tests by individual doc lookups
        // (avoids the invalid __name__ + compound query that requires a composite index)
        for (const pkg of packages) {
            const rawIds = Array.isArray(pkg.testIds) ? pkg.testIds : [];
            // Filter out any null / empty / NaN values — bad IDs crash Firestore's doc() call
            const testIds = rawIds.filter(tid => tid && typeof tid === 'string' && tid.trim() !== '');
            if (testIds.length === 0) {
                pkg.tests = [];
                continue;
            }
            const testDocs = await Promise.all(
                testIds.map((tid) => db.collection('tests').doc(tid).get())
            );
            pkg.tests = testDocs
                .filter((d) => d.exists && d.data().is_active !== false)
                .map((d) => ({ id: d.id, ...d.data() }));
        }

        packages.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        res.json(packages);
    } catch (err) {
        console.error('GET /api/health-packages error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// POST /api/health-packages — master admin only
router.post('/', authenticateToken, requireRole('master'), async (req, res) => {
    try {
        const { name, description, price, testIds } = req.body;

        if (!name || !price || !Array.isArray(testIds) || testIds.length === 0) {
            return res.status(400).json({ error: 'Name, price, and at least one test are required' });
        }

        const packageData = {
            name,
            description: description || '',
            price: parseFloat(price),
            testIds,
            is_active: true,
            created_at: new Date().toISOString(),
        };

        const docRef = await db.collection('health_packages').add(packageData);
        console.log(`[POST /api/health-packages] Saved package "${packageData.name}" with ID: ${docRef.id}, testIds: ${JSON.stringify(packageData.testIds)}`);
        res.status(201).json({ id: docRef.id, ...packageData });
    } catch (err) {
        console.error('POST /api/health-packages error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// PUT /api/health-packages/:id — master admin only
router.put('/:id', authenticateToken, requireRole('master'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, testIds } = req.body;

        const docRef = db.collection('health_packages').doc(id);
        const existing = await docRef.get();
        if (!existing.exists) return res.status(404).json({ error: 'Package not found' });

        const current = existing.data();
        const updates = {
            name: name || current.name,
            description: description !== undefined ? description : current.description,
            price: price !== undefined ? parseFloat(price) : current.price,
        };
        if (Array.isArray(testIds)) updates.testIds = testIds;

        await docRef.update(updates);
        const updated = await docRef.get();
        res.json({ id: updated.id, ...updated.data() });
    } catch (err) {
        console.error('PUT /api/health-packages/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// DELETE /api/health-packages/:id — soft delete, master admin only
router.delete('/:id', authenticateToken, requireRole('master'), async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('health_packages').doc(id);
        const existing = await docRef.get();
        if (!existing.exists) return res.status(404).json({ error: 'Package not found' });

        await docRef.update({ is_active: false });
        res.json({ message: 'Package deleted successfully' });
    } catch (err) {
        console.error('DELETE /api/health-packages/:id error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;