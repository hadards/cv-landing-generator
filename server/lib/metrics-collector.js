// File: lib/metrics-collector.js - Metrics collection system
const EventEmitter = require('events');

class MetricsCollector extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            // Request metrics
            requests: {
                total: 0,
                by_method: {},
                by_status: {},
                by_endpoint: {},
                response_times: []
            },
            
            // User activity metrics
            users: {
                registrations: 0,
                logins: 0,
                cv_uploads: 0,
                cv_processed: 0,
                landing_pages_generated: 0,
                github_connections: 0,
                github_publishes: 0
            },
            
            // System metrics
            system: {
                memory_samples: [],
                error_count: 0,
                database_queries: 0,
                database_errors: 0,
                file_uploads: 0,
                file_upload_errors: 0
            },
            
            // Performance metrics
            performance: {
                cv_processing_times: [],
                github_oauth_times: [],
                database_query_times: [],
                file_upload_times: []
            },
            
            // Error tracking
            errors: {
                by_type: {},
                by_endpoint: {},
                recent: []
            },

            // Security metrics
            security: {
                csrf_violations: 0,
                rate_limit_exceeded: 0,
                malicious_file_uploads: 0,
                failed_auth_attempts: 0,
                token_revocations: 0,
                data_exports: 0,
                account_deletions: 0,
                recent_security_events: []
            }
        };

        this.startTime = Date.now();
        this.setupPeriodicCollection();
    }
    
    setupPeriodicCollection() {
        // Collect system metrics every 30 seconds
        setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);
        
        // Clean old data every hour
        setInterval(() => {
            this.cleanupOldData();
        }, 3600000);
    }
    
    collectSystemMetrics() {
        const usage = process.memoryUsage();
        this.metrics.system.memory_samples.push({
            timestamp: Date.now(),
            rss: usage.rss,
            heap_used: usage.heapUsed,
            heap_total: usage.heapTotal,
            external: usage.external
        });
        
        // Keep only last 1000 samples (about 8 hours)
        if (this.metrics.system.memory_samples.length > 1000) {
            this.metrics.system.memory_samples = this.metrics.system.memory_samples.slice(-1000);
        }
        
        this.emit('system_metrics_collected', {
            memory: usage,
            timestamp: Date.now()
        });
    }
    
    recordRequest(method, path, statusCode, responseTime) {
        this.metrics.requests.total++;
        
        // By method
        this.metrics.requests.by_method[method] = (this.metrics.requests.by_method[method] || 0) + 1;
        
        // By status code
        const statusGroup = Math.floor(statusCode / 100) + 'xx';
        this.metrics.requests.by_status[statusGroup] = (this.metrics.requests.by_status[statusGroup] || 0) + 1;
        
        // By endpoint (normalize path)
        const endpoint = this.normalizeEndpoint(path);
        this.metrics.requests.by_endpoint[endpoint] = (this.metrics.requests.by_endpoint[endpoint] || 0) + 1;
        
        // Response times
        this.metrics.requests.response_times.push({
            timestamp: Date.now(),
            method,
            path: endpoint,
            status: statusCode,
            duration: responseTime
        });
        
        // Keep only last 10000 response times
        if (this.metrics.requests.response_times.length > 10000) {
            this.metrics.requests.response_times = this.metrics.requests.response_times.slice(-10000);
        }
        
        this.emit('request_recorded', {
            method,
            path: endpoint,
            statusCode,
            responseTime,
            timestamp: Date.now()
        });
    }
    
    recordUserActivity(activity, details = {}) {
        if (this.metrics.users.hasOwnProperty(activity)) {
            this.metrics.users[activity]++;
        }
        
        this.emit('user_activity', {
            activity,
            details,
            timestamp: Date.now()
        });
    }
    
    recordPerformance(operation, duration, details = {}) {
        const key = operation + '_times';
        if (this.metrics.performance[key]) {
            this.metrics.performance[key].push({
                timestamp: Date.now(),
                duration,
                details
            });
            
            // Keep only last 1000 measurements
            if (this.metrics.performance[key].length > 1000) {
                this.metrics.performance[key] = this.metrics.performance[key].slice(-1000);
            }
        }
        
        this.emit('performance_recorded', {
            operation,
            duration,
            details,
            timestamp: Date.now()
        });
    }
    
    recordError(error, context = {}) {
        this.metrics.system.error_count++;
        
        const errorType = error.name || 'UnknownError';
        this.metrics.errors.by_type[errorType] = (this.metrics.errors.by_type[errorType] || 0) + 1;
        
        if (context.endpoint) {
            const endpoint = this.normalizeEndpoint(context.endpoint);
            this.metrics.errors.by_endpoint[endpoint] = (this.metrics.errors.by_endpoint[endpoint] || 0) + 1;
        }
        
        // Store recent errors (last 100)
        this.metrics.errors.recent.push({
            timestamp: Date.now(),
            message: error.message,
            type: errorType,
            stack: error.stack,
            context
        });
        
        if (this.metrics.errors.recent.length > 100) {
            this.metrics.errors.recent = this.metrics.errors.recent.slice(-100);
        }
        
        this.emit('error_recorded', {
            error,
            context,
            timestamp: Date.now()
        });
    }
    
    recordDatabaseOperation(operation, duration, success = true) {
        this.metrics.system.database_queries++;
        
        if (!success) {
            this.metrics.system.database_errors++;
        }
        
        this.metrics.performance.database_query_times.push({
            timestamp: Date.now(),
            operation,
            duration,
            success
        });
        
        // Keep only last 1000 measurements
        if (this.metrics.performance.database_query_times.length > 1000) {
            this.metrics.performance.database_query_times = this.metrics.performance.database_query_times.slice(-1000);
        }
        
        this.emit('database_operation', {
            operation,
            duration,
            success,
            timestamp: Date.now()
        });
    }
    
    recordFileUpload(filename, size, duration, success = true) {
        this.metrics.system.file_uploads++;
        
        if (!success) {
            this.metrics.system.file_upload_errors++;
        }
        
        this.metrics.performance.file_upload_times.push({
            timestamp: Date.now(),
            filename,
            size,
            duration,
            success
        });
        
        // Keep only last 1000 measurements
        if (this.metrics.performance.file_upload_times.length > 1000) {
            this.metrics.performance.file_upload_times = this.metrics.performance.file_upload_times.slice(-1000);
        }
        
        this.emit('file_upload', {
            filename,
            size,
            duration,
            success,
            timestamp: Date.now()
        });
    }
    
    // Security event recording
    recordSecurityEvent(eventType, details = {}) {
        const event = {
            type: eventType,
            details,
            timestamp: Date.now()
        };

        // Increment specific security counters
        switch (eventType) {
            case 'csrf_violation':
                this.metrics.security.csrf_violations++;
                break;
            case 'rate_limit_exceeded':
                this.metrics.security.rate_limit_exceeded++;
                break;
            case 'malicious_file_upload':
                this.metrics.security.malicious_file_uploads++;
                break;
            case 'failed_auth':
                this.metrics.security.failed_auth_attempts++;
                break;
            case 'token_revoked':
                this.metrics.security.token_revocations++;
                break;
            case 'data_export':
                this.metrics.security.data_exports++;
                break;
            case 'account_deletion':
                this.metrics.security.account_deletions++;
                break;
        }

        // Store recent security events (keep last 100)
        this.metrics.security.recent_security_events.push(event);
        if (this.metrics.security.recent_security_events.length > 100) {
            this.metrics.security.recent_security_events = this.metrics.security.recent_security_events.slice(-100);
        }

        this.emit('security_event', event);
    }

    normalizeEndpoint(path) {
        // Normalize paths to group similar endpoints
        return path
            .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
            .replace(/\/\d+/g, '/:id')
            .replace(/\?.*$/, ''); // Remove query parameters
    }

    getMetricsSummary() {
        const now = Date.now();
        const uptime = now - this.startTime;
        
        // Calculate response time percentiles
        const responseTimes = this.metrics.requests.response_times
            .filter(rt => now - rt.timestamp < 3600000) // Last hour
            .map(rt => rt.duration)
            .sort((a, b) => a - b);
        
        const percentiles = {};
        if (responseTimes.length > 0) {
            percentiles.p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
            percentiles.p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
            percentiles.p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
            percentiles.avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }
        
        // Calculate error rate
        const totalRequests = this.metrics.requests.total;
        const errorRequests = (this.metrics.requests.by_status['4xx'] || 0) + (this.metrics.requests.by_status['5xx'] || 0);
        const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
        
        // Get recent memory usage
        const recentMemory = this.metrics.system.memory_samples.slice(-10);
        const avgMemory = recentMemory.length > 0 
            ? recentMemory.reduce((sum, sample) => sum + sample.rss, 0) / recentMemory.length 
            : 0;
        
        return {
            timestamp: new Date().toISOString(),
            uptime_ms: uptime,
            requests: {
                total: this.metrics.requests.total,
                by_status: this.metrics.requests.by_status,
                response_times: percentiles,
                error_rate_percent: Math.round(errorRate * 100) / 100
            },
            users: this.metrics.users,
            system: {
                error_count: this.metrics.system.error_count,
                database_queries: this.metrics.system.database_queries,
                database_errors: this.metrics.system.database_errors,
                file_uploads: this.metrics.system.file_uploads,
                file_upload_errors: this.metrics.system.file_upload_errors,
                memory_avg_mb: Math.round(avgMemory / 1024 / 1024)
            },
            top_endpoints: this.getTopEndpoints(10),
            recent_errors: this.metrics.errors.recent.slice(-5)
        };
    }
    
    getTopEndpoints(limit = 10) {
        return Object.entries(this.metrics.requests.by_endpoint)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([endpoint, count]) => ({ endpoint, count }));
    }
    
    getDetailedMetrics() {
        return {
            timestamp: new Date().toISOString(),
            uptime_ms: Date.now() - this.startTime,
            requests: this.metrics.requests,
            users: this.metrics.users,
            system: this.metrics.system,
            performance: {
                cv_processing: this.calculateStats(this.metrics.performance.cv_processing_times),
                github_oauth: this.calculateStats(this.metrics.performance.github_oauth_times),
                database_queries: this.calculateStats(this.metrics.performance.database_query_times),
                file_uploads: this.calculateStats(this.metrics.performance.file_upload_times)
            },
            errors: this.metrics.errors
        };
    }
    
    calculateStats(timeArray) {
        if (!timeArray || timeArray.length === 0) {
            return { count: 0 };
        }
        
        const durations = timeArray.map(item => item.duration).sort((a, b) => a - b);
        const count = durations.length;
        const sum = durations.reduce((a, b) => a + b, 0);
        
        return {
            count,
            avg: Math.round(sum / count),
            min: durations[0],
            max: durations[count - 1],
            p50: durations[Math.floor(count * 0.5)],
            p95: durations[Math.floor(count * 0.95)],
            p99: durations[Math.floor(count * 0.99)]
        };
    }
    
    cleanupOldData() {
        const oneHourAgo = Date.now() - 3600000;
        const oneDayAgo = Date.now() - 86400000;
        
        // Clean response times older than 1 day
        this.metrics.requests.response_times = this.metrics.requests.response_times
            .filter(rt => rt.timestamp > oneDayAgo);
        
        // Clean memory samples older than 1 day
        this.metrics.system.memory_samples = this.metrics.system.memory_samples
            .filter(sample => sample.timestamp > oneDayAgo);
        
        // Clean performance data older than 1 day
        Object.keys(this.metrics.performance).forEach(key => {
            this.metrics.performance[key] = this.metrics.performance[key]
                .filter(item => item.timestamp > oneDayAgo);
        });
        
        this.emit('cleanup_completed', {
            timestamp: Date.now()
        });
    }
    
    reset() {
        // Reset all metrics (useful for testing)
        this.metrics = {
            requests: { total: 0, by_method: {}, by_status: {}, by_endpoint: {}, response_times: [] },
            users: { registrations: 0, logins: 0, cv_uploads: 0, cv_processed: 0, landing_pages_generated: 0, github_connections: 0, github_publishes: 0 },
            system: { memory_samples: [], error_count: 0, database_queries: 0, database_errors: 0, file_uploads: 0, file_upload_errors: 0 },
            performance: { cv_processing_times: [], github_oauth_times: [], database_query_times: [], file_upload_times: [] },
            errors: { by_type: {}, by_endpoint: {}, recent: [] }
        };
        
        this.startTime = Date.now();
    }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;