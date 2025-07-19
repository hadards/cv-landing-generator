// File: routes/health.js
const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        res.status(200).json({
            status: 'healthy',
            message: 'CV Landing Generator API is running',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            geminiConfigured: !!process.env.GEMINI_API_KEY
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// Test endpoint
router.all('/test', async (req, res) => {
    try {
        const { method, query, body } = req;

        res.status(200).json({
            message: 'Test endpoint working!',
            requestMethod: method,
            queryParams: query,
            requestBody: body,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;