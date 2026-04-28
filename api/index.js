// Vercel Serverless Function: Wraps the Express app
try { require('dotenv').config(); } catch(e) {}
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import the API routes from backend
const apiRoutes = require('../backend/routes/api');
app.use('/api', apiRoutes);

// Export as Vercel serverless function
module.exports = app;
