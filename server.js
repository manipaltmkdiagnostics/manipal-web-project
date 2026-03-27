require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/health-packages', require('./routes/packages'));
app.use('/api/visitors', require('./routes/visitors'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
});

// Start — no DB init needed, Firestore connects on first use
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin portal: http://localhost:${PORT}/admin/login.html`);
});