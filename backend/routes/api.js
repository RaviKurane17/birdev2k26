const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
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

// --- UPLOAD ROUTE (Admin) ---
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

// --- UPLOAD ROUTE (Public - for donation screenshots) ---
router.post('/upload-screenshot', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    if (req.file.path.startsWith('http')) {
        return res.json({ url: req.file.path });
    }

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
        const { name, amount, surnameCategory, eventName, screenshotUrl, paymentMode } = req.body;
        const evt = eventName || 'बिरदेव जयंती 2026';
        const mode = paymentMode || (screenshotUrl ? 'Online' : null);
        
        // Auto-add screenshot_url column if it doesn't exist yet
        try {
            await db.query("ALTER TABLE donations ADD COLUMN screenshot_url VARCHAR(500) DEFAULT NULL");
        } catch(e) {} // Ignore if column already exists

        // Auto-migrate paymentMode from ENUM to VARCHAR if needed
        try {
            await db.query("ALTER TABLE donations MODIFY COLUMN paymentMode VARCHAR(50) NULL");
        } catch(e) {}

        const [result] = await db.query(
            'INSERT INTO donations (name, amount, surnameCategory, isPaid, eventName, screenshot_url, paymentMode) VALUES (?, ?, ?, false, ?, ?, ?)',
            [name, amount, surnameCategory, evt, screenshotUrl || null, mode]
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

// Update a donation (Admin only) - supports status change AND detail edits
router.put('/donations/:id', verifyToken, async (req, res) => {
    try {
        // Auto-migrate paymentMode from ENUM to VARCHAR if needed
        try {
            await db.query("ALTER TABLE donations MODIFY COLUMN paymentMode VARCHAR(50) NULL");
        } catch(e) {} // Ignore if already VARCHAR

        const { isPaid, paymentMode, date, name, amount, surnameCategory } = req.body;
        
        // Build dynamic update query
        const updates = [];
        const values = [];
        
        if (isPaid !== undefined) { updates.push('isPaid = ?'); values.push(isPaid); }
        if (paymentMode !== undefined) { updates.push('paymentMode = ?'); values.push(paymentMode); }
        if (date !== undefined) { updates.push('date = ?'); values.push(date); }
        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (amount !== undefined) { updates.push('amount = ?'); values.push(amount); }
        if (surnameCategory !== undefined) { updates.push('surnameCategory = ?'); values.push(surnameCategory); }
        
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
        
        values.push(req.params.id);
        await db.query(`UPDATE donations SET ${updates.join(', ')} WHERE id = ?`, values);
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
        
        // Include Previous Donations (Magil Shillak) in balance
        let totalPrevious = 0;
        try {
            const [previous] = await db.query('SELECT SUM(amount) as totalPrevious FROM previous_donations');
            totalPrevious = previous[0].totalPrevious || 0;
        } catch (e) { /* Ignore if table not exists yet */ }

        // Include Approved Special Donors in collection
        let totalSpecial = 0;
        try {
            const [special] = await db.query('SELECT SUM(amount) as totalSpecial FROM special_donors WHERE isApproved = true OR isApproved IS NULL');
            totalSpecial = special[0].totalSpecial || 0;
        } catch (e) { /* Ignore if table not exists yet */ }

        const baseCollected = donations[0].totalCollected || 0;
        const totalCollected = baseCollected + totalSpecial;
        const totalPending = pending[0].totalPending || 0;
        const totalExpenses = expenses[0].totalExpenses || 0;

        res.json({
            totalCollected,
            totalPending,
            totalExpenses,
            remainingBalance: (totalCollected + totalPrevious) - totalExpenses
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
        const [rows] = await db.query('SELECT * FROM special_donors ORDER BY isApproved ASC, created_at DESC');
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
        // Auto-add isApproved column if it doesn't exist yet
        try {
            await db.query("ALTER TABLE special_donors ADD COLUMN isApproved BOOLEAN DEFAULT FALSE");
        } catch(e) {} // Ignore if column already exists

        const [result] = await db.query(
            'INSERT INTO special_donors (name, amount, description, isApproved) VALUES (?, ?, ?, false)',
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
                isApproved BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            // Retry the insert
            const { name, amount, description } = req.body;
            const [result] = await db.query(
                'INSERT INTO special_donors (name, amount, description, isApproved) VALUES (?, ?, ?, false)',
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

router.put('/special-donors/:id', verifyToken, async (req, res) => {
    try {
        const { isApproved } = req.body;
        await db.query('UPDATE special_donors SET isApproved = ? WHERE id = ?', [isApproved, req.params.id]);
        res.json({ message: 'Special donor updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PREVIOUS DONATIONS (Magil Shillak Rakkam) ---
router.get('/previous-donations', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM previous_donations ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

router.post('/previous-donations', verifyToken, async (req, res) => {
    try {
        const { amount, description } = req.body;
        const [result] = await db.query(
            'INSERT INTO previous_donations (amount, description) VALUES (?, ?)',
            [amount || 0, description || 'मागील शिल्लक रक्कम']
        );
        res.json({ id: result.insertId, message: 'Previous donation added successfully' });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            await db.query(`CREATE TABLE IF NOT EXISTS previous_donations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                amount DECIMAL(10, 2) DEFAULT 0,
                description VARCHAR(255) DEFAULT 'मागील शिल्लक रक्कम',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            const { amount, description } = req.body;
            const [result] = await db.query(
                'INSERT INTO previous_donations (amount, description) VALUES (?, ?)',
                [amount || 0, description || 'मागील शिल्लक रक्कम']
            );
            return res.json({ id: result.insertId, message: 'Previous donation added successfully' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.put('/previous-donations/:id', verifyToken, async (req, res) => {
    try {
        const { amount, description } = req.body;
        await db.query('UPDATE previous_donations SET amount = ?, description = ? WHERE id = ?', [amount, description, req.params.id]);
        res.json({ message: 'Previous donation updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/previous-donations/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM previous_donations WHERE id = ?', [req.params.id]);
        res.json({ message: 'Previous donation deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FEEDBACK ROUTES ---
router.get('/feedbacks', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM feedbacks ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        res.status(500).json({ error: err.message });
    }
});

router.post('/feedbacks', async (req, res) => {
    try {
        const { name, mobile, message } = req.body;
        const [result] = await db.query(
            'INSERT INTO feedbacks (name, mobile, message) VALUES (?, ?, ?)',
            [name, mobile, message]
        );
        res.json({ id: result.insertId, message: 'Feedback submitted successfully' });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            await db.query(`CREATE TABLE IF NOT EXISTS feedbacks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                mobile VARCHAR(20),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            const { name, mobile, message } = req.body;
            const [result] = await db.query(
                'INSERT INTO feedbacks (name, mobile, message) VALUES (?, ?, ?)',
                [name, mobile, message]
            );
            return res.json({ id: result.insertId, message: 'Feedback submitted successfully' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.delete('/feedbacks/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM feedbacks WHERE id = ?', [req.params.id]);
        res.json({ message: 'Feedback deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
