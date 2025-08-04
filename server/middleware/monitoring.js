// File: middleware/monitoring.js - Monitoring middleware
const metricsCollector = require('../lib/metrics-collector');

// Request monitoring middleware
const requestMonitoring = (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function(...args) {
        const duration = Date.now() - startTime;
        
        // Record request metrics
        metricsCollector.recordRequest(
            req.method,
            req.originalUrl || req.url,
            res.statusCode,
            duration
        );
        
        // Call original end method
        originalEnd.apply(res, args);
    };
    
    next();
};

// Error monitoring middleware
const errorMonitoring = (err, req, res, next) => {
    // Record error in metrics
    metricsCollector.recordError(err, {
        endpoint: req.originalUrl || req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.userId || null
    });
    
    next(err);
};

// Database operation monitoring wrapper
const monitorDatabaseOperation = (operation) => {
    return async (queryFunction) => {
        const startTime = Date.now();
        let success = true;
        
        try {
            const result = await queryFunction();
            return result;
        } catch (error) {
            success = false;
            throw error;
        } finally {
            const duration = Date.now() - startTime;
            metricsCollector.recordDatabaseOperation(operation, duration, success);
        }
    };
};

// File upload monitoring wrapper
const monitorFileUpload = (req, res, next) => {
    if (!req.file) {
        return next();
    }
    
    const startTime = Date.now();
    const originalEnd = res.end;
    
    res.end = function(...args) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        metricsCollector.recordFileUpload(
            req.file.originalname,
            req.file.size,
            duration,
            success
        );
        
        if (success) {
            metricsCollector.recordUserActivity('cv_uploads');
        } else {
            metricsCollector.recordUserActivity('file_upload_errors');
        }
        
        originalEnd.apply(res, args);
    };
    
    next();
};

// User activity monitoring helpers
const recordUserLogin = (userId) => {
    metricsCollector.recordUserActivity('logins', { userId });
};

const recordUserRegistration = (userId) => {
    metricsCollector.recordUserActivity('registrations', { userId });
};

const recordCVProcessing = (userId, processingTime) => {
    metricsCollector.recordUserActivity('cv_processed', { userId });
    metricsCollector.recordPerformance('cv_processing', processingTime, { userId });
};

const recordLandingPageGeneration = (userId, generationTime) => {
    metricsCollector.recordUserActivity('landing_pages_generated', { userId });
    metricsCollector.recordPerformance('landing_page_generation', generationTime, { userId });
};

const recordGitHubConnection = (userId, oauthTime) => {
    metricsCollector.recordUserActivity('github_connections', { userId });
    metricsCollector.recordPerformance('github_oauth', oauthTime, { userId });
};

const recordGitHubPublish = (userId, publishTime, success = true) => {
    if (success) {
        metricsCollector.recordUserActivity('github_publishes', { userId });
    }
    metricsCollector.recordPerformance('github_publish', publishTime, { userId, success });
};

// Performance monitoring wrapper for async operations
const monitorPerformance = (operation) => {
    return async (asyncFunction, details = {}) => {
        const startTime = Date.now();
        
        try {
            const result = await asyncFunction();
            const duration = Date.now() - startTime;
            metricsCollector.recordPerformance(operation, duration, details);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            metricsCollector.recordPerformance(operation, duration, { ...details, error: error.message });
            throw error;
        }
    };
};

// Health check alerting
const checkHealthThresholds = () => {
    const summary = metricsCollector.getMetricsSummary();
    const alerts = [];
    
    // High error rate alert
    if (summary.requests.error_rate_percent > 5) {
        alerts.push({
            type: 'high_error_rate',
            severity: 'warning',
            message: `Error rate is ${summary.requests.error_rate_percent}% (threshold: 5%)`,
            value: summary.requests.error_rate_percent
        });
    }
    
    // High memory usage alert
    if (summary.system.memory_avg_mb > 500) {
        alerts.push({
            type: 'high_memory_usage',
            severity: summary.system.memory_avg_mb > 1000 ? 'critical' : 'warning',
            message: `Memory usage is ${summary.system.memory_avg_mb}MB (warning: 500MB, critical: 1000MB)`,
            value: summary.system.memory_avg_mb
        });
    }
    
    // Slow response time alert
    if (summary.requests.response_times.p95 > 2000) {
        alerts.push({
            type: 'slow_response_time',
            severity: 'warning',
            message: `95th percentile response time is ${summary.requests.response_times.p95}ms (threshold: 2000ms)`,
            value: summary.requests.response_times.p95
        });
    }
    
    // Database error alert
    const dbErrorRate = summary.system.database_queries > 0 
        ? (summary.system.database_errors / summary.system.database_queries) * 100 
        : 0;
    
    if (dbErrorRate > 1) {
        alerts.push({
            type: 'database_errors',
            severity: 'warning',
            message: `Database error rate is ${dbErrorRate.toFixed(1)}% (threshold: 1%)`,
            value: dbErrorRate
        });
    }
    
    return alerts;
};

module.exports = {
    requestMonitoring,
    errorMonitoring,
    monitorDatabaseOperation,
    monitorFileUpload,
    recordUserLogin,
    recordUserRegistration,
    recordCVProcessing,
    recordLandingPageGeneration,
    recordGitHubConnection,
    recordGitHubPublish,
    monitorPerformance,
    checkHealthThresholds
};