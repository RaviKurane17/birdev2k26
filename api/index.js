// Vercel Serverless Function: Wraps the Express app
const express = require('express');
const cors = require('cors');
const path = require('path');

// Load env vars
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import the API routes from backend
const apiRoutes = require('../backend/routes/api');
app.use('/api', apiRoutes);

// Export as Vercel serverless function
module.exports = app;
