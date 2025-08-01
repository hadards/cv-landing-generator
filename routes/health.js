// File: routes/health.js
const express = require('express');
const healthMonitor = require('../lib/health-monitor');
const metricsCollector = require('../lib/metrics-collector');
const { checkHealthThresholds } = require('../middleware/monitoring');
const router = express.Router();

// Basic health check endpoint
router.get('/health', async (req, res) => {
    try {
        const healthResult = await healthMonitor.runAllChecks();
        const statusCode = healthResult.status === 'healthy' ? 200 : 
                          healthResult.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json({
            ...healthResult,
            version: '1.0.0'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Detailed health check endpoint
router.get('/health/detailed', async (req, res) => {
    try {
        const healthResult = await healthMonitor.runAllChecks();
        const metrics = metricsCollector.getMetricsSummary();
        const alerts = checkHealthThresholds();
        
        const statusCode = healthResult.status === 'healthy' && alerts.length === 0 ? 200 : 
                          healthResult.status === 'degraded' || alerts.length > 0 ? 200 : 503;
        
        res.status(statusCode).json({
            health: healthResult,
            metrics,
            alerts,
            version: '1.0.0'
        });
    } catch (error) {
        console.error('Detailed health check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Detailed health check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Metrics endpoint
router.get('/metrics', async (req, res) => {
    try {
        const detailed = req.query.detailed === 'true';
        const metrics = detailed 
            ? metricsCollector.getDetailedMetrics()
            : metricsCollector.getMetricsSummary();
        
        res.status(200).json(metrics);
    } catch (error) {
        console.error('Metrics endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve metrics',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Alerts endpoint
router.get('/alerts', async (req, res) => {
    try {
        const alerts = checkHealthThresholds();
        
        res.status(200).json({
            alerts,
            count: alerts.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Alerts endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve alerts',
            error: error.message,
            timestamp: new Date().toISOString()
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