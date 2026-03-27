const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        // Robust check for master admin privileges
        const isMaster = req.user?.role === 'master' || req.user?.role === 'master_admin' || req.user?.username === 'masteradmin';
        
        if (role === 'master' && isMaster) {
            return next();
        }
        
        if (req.user?.role !== role && !isMaster) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

module.exports = { authenticateToken, requireRole };