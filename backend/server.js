const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDB } = require('./db');
const pixelRoutes = require('./routes/pixels'); // Import pixel routes

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// API Routes
app.use('/api/pixels', pixelRoutes); // Use pixel routes

// Initialize Database
initDB().then(() => {
  console.log('Database initialized.');
  // Start server only after DB init is successful (or fails)
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1); // Exit if DB initialization fails
});

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Hello from r/Place Clone Backend!');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Backend is healthy' });
});

module.exports = app; // For potential testing
