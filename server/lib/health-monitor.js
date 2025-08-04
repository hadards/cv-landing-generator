// File: lib/health-monitor.js - Health monitoring system
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

class HealthMonitor {
    constructor() {
        this.startTime = Date.now();
        this.checks = new Map();
        this.initializeChecks();
    }
    
    initializeChecks() {
        // Register all health checks
        this.registerCheck('uptime', this.checkUptime.bind(this));
        this.registerCheck('memory', this.checkMemory.bind(this));
        this.registerCheck('database', this.checkDatabase.bind(this));
        this.registerCheck('filesystem', this.checkFilesystem.bind(this));
        this.registerCheck('external_apis', this.checkExternalAPIs.bind(this));
        this.registerCheck('environment', this.checkEnvironment.bind(this));
    }
    
    registerCheck(name, checkFunction) {
        this.checks.set(name, checkFunction);
    }
    
    async runAllChecks() {
        const results = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {},
            summary: {
                total: this.checks.size,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        
        for (const [name, checkFunction] of this.checks) {
            try {
                const result = await checkFunction();
                results.checks[name] = result;
                
                // Update summary
                if (result.status === 'healthy') {
                    results.summary.passed++;
                } else if (result.status === 'warning') {
                    results.summary.warnings++;
                } else {
                    results.summary.failed++;
                    results.status = 'unhealthy';
                }
            } catch (error) {
                results.checks[name] = {
                    status: 'error',
                    message: error.message,
                    timestamp: new Date().toISOString()
                };
                results.summary.failed++;
                results.status = 'unhealthy';
            }
        }
        
        // Overall status determination
        if (results.summary.failed > 0) {
            results.status = 'unhealthy';
        } else if (results.summary.warnings > 0) {
            results.status = 'degraded';
        }
        
        return results;
    }
    
    async checkUptime() {
        const uptimeMs = Date.now() - this.startTime;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);
        const uptimeHours = Math.floor(uptimeMinutes / 60);
        const uptimeDays = Math.floor(uptimeHours / 24);
        
        return {
            status: 'healthy',
            message: `Service running for ${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
            details: {
                uptime_ms: uptimeMs,
                uptime_seconds: uptimeSeconds,
                started_at: new Date(this.startTime).toISOString()
            },
            timestamp: new Date().toISOString()
        };
    }
    
    async checkMemory() {
        const usage = process.memoryUsage();
        const totalMemoryMB = Math.round(usage.rss / 1024 / 1024);
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const externalMB = Math.round(usage.external / 1024 / 1024);
        
        // Memory usage thresholds
        const warningThreshold = 500; // MB
        const criticalThreshold = 1000; // MB
        
        let status = 'healthy';
        let message = `Memory usage: ${totalMemoryMB}MB RSS, ${heapUsedMB}MB heap`;
        
        if (totalMemoryMB > criticalThreshold) {
            status = 'unhealthy';
            message = `Critical memory usage: ${totalMemoryMB}MB (>${criticalThreshold}MB)`;
        } else if (totalMemoryMB > warningThreshold) {
            status = 'warning';
            message = `High memory usage: ${totalMemoryMB}MB (>${warningThreshold}MB)`;
        }
        
        return {
            status,
            message,
            details: {
                rss_mb: totalMemoryMB,
                heap_used_mb: heapUsedMB,
                heap_total_mb: heapTotalMB,
                external_mb: externalMB,
                heap_usage_percent: Math.round((heapUsedMB / heapTotalMB) * 100)
            },
            timestamp: new Date().toISOString()
        };
    }
    
    async checkDatabase() {
        if (!process.env.DATABASE_URL) {
            return {
                status: 'warning',
                message: 'Database not configured',
                timestamp: new Date().toISOString()
            };
        }
        
        try {
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                connectionTimeoutMillis: 5000,
                idleTimeoutMillis: 10000,
                max: 1 // Only one connection for health check
            });
            
            const start = Date.now();
            const result = await pool.query('SELECT NOW() as server_time, version() as version');
            const duration = Date.now() - start;
            
            await pool.end();
            
            let status = 'healthy';
            let message = `Database connected (${duration}ms)`;
            
            if (duration > 1000) {
                status = 'warning';
                message = `Database slow response (${duration}ms)`;
            }
            
            return {
                status,
                message,
                details: {
                    response_time_ms: duration,
                    server_time: result.rows[0].server_time,
                    postgres_version: result.rows[0].version.split(' ')[1]
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Database connection failed: ${error.message}`,
                details: {
                    error: error.code || 'UNKNOWN'
                },
                timestamp: new Date().toISOString()
            };
        }
    }
    
    async checkFilesystem() {
        const checks = {
            uploads: path.join(__dirname, '..', 'uploads'),
            generated: path.join(__dirname, '..', 'generated')
        };
        
        const results = {};
        let overallStatus = 'healthy';
        const messages = [];
        
        for (const [name, dirPath] of Object.entries(checks)) {
            try {
                // Check if directory exists and is writable
                await fs.access(dirPath, fs.constants.F_OK | fs.constants.W_OK);
                
                // Get directory stats
                const stats = await fs.stat(dirPath);
                const files = await fs.readdir(dirPath);
                
                results[name] = {
                    exists: true,
                    writable: true,
                    file_count: files.length,
                    created: stats.birthtime,
                    modified: stats.mtime
                };
                
                messages.push(`${name}: ${files.length} files`);
                
                // Warning if too many files
                if (files.length > 1000) {
                    overallStatus = 'warning';
                    messages.push(`${name} has many files (${files.length})`);
                }
                
            } catch (error) {
                results[name] = {
                    exists: false,
                    error: error.message
                };
                overallStatus = 'unhealthy';
                messages.push(`${name}: ${error.message}`);
            }
        }
        
        return {
            status: overallStatus,
            message: messages.join(', '),
            details: results,
            timestamp: new Date().toISOString()
        };
    }
    
    async checkExternalAPIs() {
        const apiChecks = [];
        
        // Check Gemini API if configured
        if (process.env.GEMINI_API_KEY && process.env.LLM_CLIENT_TYPE === 'gemini') {
            apiChecks.push(this.checkGeminiAPI());
        }
        
        // Check Ollama if configured
        if (process.env.LLM_CLIENT_TYPE === 'ollama') {
            apiChecks.push(this.checkOllamaAPI());
        }
        
        // Check GitHub API if configured
        if (process.env.GITHUB_CLIENT_ID) {
            apiChecks.push(this.checkGitHubAPI());
        }
        
        if (apiChecks.length === 0) {
            return {
                status: 'warning',
                message: 'No external APIs configured',
                timestamp: new Date().toISOString()
            };
        }
        
        const results = await Promise.allSettled(apiChecks);
        const details = {};
        let overallStatus = 'healthy';
        const messages = [];
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const apiResult = result.value;
                details[apiResult.api] = apiResult;
                messages.push(`${apiResult.api}: ${apiResult.status}`);
                
                if (apiResult.status !== 'healthy') {
                    overallStatus = apiResult.status;
                }
            } else {
                details[`api_${index}`] = {
                    status: 'error',
                    error: result.reason.message
                };
                overallStatus = 'unhealthy';
                messages.push(`API ${index}: error`);
            }
        });
        
        return {
            status: overallStatus,
            message: messages.join(', '),
            details,
            timestamp: new Date().toISOString()
        };
    }
    
    async checkGeminiAPI() {
        try {
            const start = Date.now();
            const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + process.env.GEMINI_API_KEY);
            const duration = Date.now() - start;
            
            if (response.ok) {
                return {
                    api: 'gemini',
                    status: 'healthy',
                    response_time_ms: duration,
                    message: `Gemini API accessible (${duration}ms)`
                };
            } else {
                return {
                    api: 'gemini',
                    status: 'unhealthy',
                    response_time_ms: duration,
                    message: `Gemini API error: ${response.status}`
                };
            }
        } catch (error) {
            return {
                api: 'gemini',
                status: 'unhealthy',
                message: `Gemini API unreachable: ${error.message}`
            };
        }
    }
    
    async checkOllamaAPI() {
        try {
            const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
            const start = Date.now();
            const response = await fetch(`${ollamaUrl}/api/tags`);
            const duration = Date.now() - start;
            
            if (response.ok) {
                const data = await response.json();
                return {
                    api: 'ollama',
                    status: 'healthy',
                    response_time_ms: duration,
                    message: `Ollama API accessible (${data.models?.length || 0} models)`
                };
            } else {
                return {
                    api: 'ollama',
                    status: 'unhealthy',
                    response_time_ms: duration,
                    message: `Ollama API error: ${response.status}`
                };
            }
        } catch (error) {
            return {
                api: 'ollama',
                status: 'unhealthy',
                message: `Ollama API unreachable: ${error.message}`
            };
        }
    }
    
    async checkGitHubAPI() {
        try {
            const start = Date.now();
            const response = await fetch('https://api.github.com/rate_limit');
            const duration = Date.now() - start;
            
            if (response.ok) {
                const data = await response.json();
                const remaining = data.rate.remaining;
                const limit = data.rate.limit;
                
                let status = 'healthy';
                if (remaining < limit * 0.1) { // Less than 10% remaining
                    status = 'warning';
                }
                
                return {
                    api: 'github',
                    status,
                    response_time_ms: duration,
                    message: `GitHub API accessible (${remaining}/${limit} requests remaining)`,
                    rate_limit: {
                        remaining,
                        limit,
                        reset: new Date(data.rate.reset * 1000).toISOString()
                    }
                };
            } else {
                return {
                    api: 'github',
                    status: 'unhealthy',
                    response_time_ms: duration,
                    message: `GitHub API error: ${response.status}`
                };
            }
        } catch (error) {
            return {
                api: 'github',
                status: 'unhealthy',
                message: `GitHub API unreachable: ${error.message}`
            };
        }
    }
    
    async checkEnvironment() {
        const requiredVars = [
            'NODE_ENV',
            'JWT_SECRET',
            'GEMINI_API_KEY',
            'DATABASE_URL'
        ];
        
        const optionalVars = [
            'GITHUB_CLIENT_ID',
            'GITHUB_CLIENT_SECRET',
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET'
        ];
        
        const results = {
            required: {},
            optional: {}
        };
        
        let status = 'healthy';
        const messages = [];
        
        // Check required variables
        for (const varName of requiredVars) {
            const isSet = !!process.env[varName];
            results.required[varName] = isSet;
            
            if (!isSet) {
                status = 'unhealthy';
                messages.push(`Missing required: ${varName}`);
            }
        }
        
        // Check optional variables
        for (const varName of optionalVars) {
            results.optional[varName] = !!process.env[varName];
        }
        
        const requiredCount = Object.values(results.required).filter(Boolean).length;
        const optionalCount = Object.values(results.optional).filter(Boolean).length;
        
        if (status === 'healthy') {
            messages.push(`${requiredCount}/${requiredVars.length} required, ${optionalCount}/${optionalVars.length} optional`);
        }
        
        return {
            status,
            message: messages.join(', ') || `Environment configured (${requiredCount}/${requiredVars.length} required, ${optionalCount}/${optionalVars.length} optional)`,
            details: results,
            timestamp: new Date().toISOString()
        };
    }
}

// Create singleton instance
const healthMonitor = new HealthMonitor();

module.exports = healthMonitor;