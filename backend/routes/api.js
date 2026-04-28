const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');

// Configure Cloudinary
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

// Setup storage (Use Cloudinary if configured, else disk fallback)
let storage;
if(isCloudinaryConfigured) {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: { 
            folder: 'birdev2k26', 
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            resource_type: 'auto'
        }
    });
} else {
    // Use /tmp on serverless (Vercel), or local uploads/ for development
    const uploadDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    });
}
const upload = multer({ storage: storage });

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.userId = decoded.id;
        next();
    });
};

// --- UPLOAD ROUTE ---
router.post('/upload', verifyToken, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // If it's a full URL (from Cloudinary), return it directly
    if (req.file.path.startsWith('http')) {
        return res.json({ url: req.file.path });
    }

    // Otherwise, construct a local URL (works for development)
    const relativePath = req.file.path.replace(/\\/g, '/');
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 5000}`;
    const finalUrl = `${baseUrl}/${relativePath}`;
    
    res.json({ url: finalUrl });
});

// --- AUTH ROUTES ---
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await db.query('SELECT * FROM admin WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful', token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DONATION ROUTES ---
// Get all donations (public)
router.get('/donations', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM donations ORDER BY isPaid DESC, id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a donation (Publicly accessible, creates a pledge)
router.post('/donations', async (req, res) => {
    try {
        const { name, amount, surnameCategory, eventName } = req.body;
        const evt = eventName || 'बिरदेव जयंती 2026';
        // Default to isPaid = false for public submissions
        const [result] = await db.query(
            'INSERT INTO donations (name, amount, surnameCategory, isPaid, eventName) VALUES (?, ?, ?, false, ?)',
            [name, amount, surnameCategory, evt]
        );
        res.json({ id: result.insertId, message: 'Donation pledge added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a donation (Admin only)
router.delete('/donations/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM donations WHERE id = ?', [req.params.id]);
        res.json({ message: 'Donation deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a donation status (Admin only)
router.put('/donations/:id', verifyToken, async (req, res) => {
    try {
        const { isPaid, paymentMode, date } = req.body;
        await db.query(
            'UPDATE donations SET isPaid = ?, paymentMode = ?, date = ? WHERE id = ?',
            [isPaid, paymentMode, date, req.params.id]
        );
        res.json({ message: 'Donation updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EXPENSE ROUTES ---
// Get all expenses (public or admin depending on needs, let's make it public for transparency as per request "entire data visible")
router.get('/expenses', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM expenses ORDER BY date DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add an expense (Admin only)
router.post('/expenses', verifyToken, async (req, res) => {
    try {
        const { description, amount, date } = req.body;
        const [result] = await db.query(
            'INSERT INTO expenses (description, amount, date) VALUES (?, ?, ?)',
            [description, amount, date]
        );
        res.json({ id: result.insertId, message: 'Expense added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an expense (Admin only)
router.delete('/expenses/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- STATS ROUTE ---
router.get('/stats', async (req, res) => {
    try {
        const [donations] = await db.query('SELECT SUM(amount) as totalCollected FROM donations WHERE isPaid = true');
        const [pending] = await db.query('SELECT SUM(amount) as totalPending FROM donations WHERE isPaid = false');
        const [expenses] = await db.query('SELECT SUM(amount) as totalExpenses FROM expenses');

        const totalCollected = donations[0].totalCollected || 0;
        const totalPending = pending[0].totalPending || 0;
        const totalExpenses = expenses[0].totalExpenses || 0;

        res.json({
            totalCollected,
            totalPending,
            totalExpenses,
            remainingBalance: totalCollected - totalExpenses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SURNAMES ROUTES ---
router.get('/surnames', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM surnames ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/surnames', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        const [result] = await db.query('INSERT INTO surnames (name) VALUES (?)', [name]);
        res.json({ id: result.insertId, message: 'Surname added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/surnames/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM surnames WHERE id = ?', [req.params.id]);
        res.json({ message: 'Surname deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- COMMITTEE ROUTES ---
router.get('/committee', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM committee');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/committee', verifyToken, async (req, res) => {
    try {
        const { role, name, photoUrl } = req.body;
        const [result] = await db.query('INSERT INTO committee (role, name, photoUrl) VALUES (?, ?, ?)', [role, name, photoUrl]);
        res.json({ id: result.insertId, message: 'Committee member added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/committee/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM committee WHERE id = ?', [req.params.id]);
        res.json({ message: 'Committee member deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SETTINGS ROUTES ---
router.get('/settings/:key', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', [req.params.key]);
        res.json({ value: rows.length > 0 ? rows[0].setting_value : null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/settings/:key', verifyToken, async (req, res) => {
    try {
        const { value } = req.body;
        await db.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [req.params.key, value, value]);
        res.json({ message: 'Setting updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SPECIAL DONORS (विशेष सहकार्य) ROUTES ---
router.get('/special-donors', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM special_donors ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        // If table doesn't exist yet, return empty array
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.json([]);
        }
        res.status(500).json({ error: err.message });
    }
});

router.post('/special-donors', verifyToken, async (req, res) => {
    try {
        const { name, amount, description } = req.body;
        const [result] = await db.query(
            'INSERT INTO special_donors (name, amount, description) VALUES (?, ?, ?)',
            [name, amount || 0, description || '']
        );
        res.json({ id: result.insertId, message: 'Special donor added successfully' });
    } catch (err) {
        // Auto-create table if it doesn't exist
        if (err.code === 'ER_NO_SUCH_TABLE') {
            await db.query(`CREATE TABLE IF NOT EXISTS special_donors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) DEFAULT 0,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            // Retry the insert
            const { name, amount, description } = req.body;
            const [result] = await db.query(
                'INSERT INTO special_donors (name, amount, description) VALUES (?, ?, ?)',
                [name, amount || 0, description || '']
            );
            return res.json({ id: result.insertId, message: 'Special donor added successfully' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/special-donors/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM special_donors WHERE id = ?', [req.params.id]);
        res.json({ message: 'Special donor deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
