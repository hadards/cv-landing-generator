// File: server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import monitoring systems
const { requestMonitoring, errorMonitoring } = require('./middleware/monitoring');
const metricsCollector = require('./lib/metrics-collector');
const fileCleanupManager = require('./lib/file-cleanup');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables based on LLM client type
const llmClientType = process.env.LLM_CLIENT_TYPE || 'gemini';
if (llmClientType === 'gemini' && !process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is required when LLM_CLIENT_TYPE=gemini');
    process.exit(1);
}

if (llmClientType === 'ollama' && !process.env.OLLAMA_BASE_URL) {
    console.error('ERROR: OLLAMA_BASE_URL is required when LLM_CLIENT_TYPE=ollama');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET is required for authentication');
    process.exit(1);
}

// Security middleware
// Apply CSP conditionally - skip for preview endpoints
app.use((req, res, next) => {
    // Skip CSP for preview and static file endpoints that need iframe embedding
    const isPreviewRoute = req.path.includes('/api/cv/preview') || req.path.includes('/api/cv/static');
    
    if (isPreviewRoute) {
        // Don't apply any CSP for preview routes to allow iframe embedding
        return next();
    }
    
    // Apply normal CSP for all other routes
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "blob:", "https://avatars.githubusercontent.com"],
                connectSrc: ["'self'", "https://api.github.com", "https://github.com"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'self'"],
                frameAncestors: ["'self'"],
                formAction: ["'self'", "https://github.com"],
            },
        },
        crossOriginEmbedderPolicy: false
    })(req, res, next);
});

// Rate limiting - Free tier optimized
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20, // Reduced for free tier (was 100)
    message: {
        error: 'Rate limit exceeded',
        message: 'Free tier allows 20 requests per 15 minutes. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for static assets and health checks
    skip: (req) => {
        return req.path.includes('/health') || 
               req.path.includes('/static') ||
               req.path.includes('/favicon');
    }
});

// GitHub OAuth rate limiting - More restrictive for free tier
const githubLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.GITHUB_RATE_LIMIT) || 20, // Reduced for free tier (was 50)
    message: {
        error: 'GitHub rate limit exceeded',
        message: 'Too many GitHub requests. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/github/', githubLimiter);
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        process.env.FRONTEND_URL || 'http://localhost:4200',
        process.env.API_URL || 'http://localhost:3000'
    ];

// Add GitHub OAuth domains for redirects
const githubDomains = ['https://github.com', 'https://api.github.com'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, OAuth redirects)
        if (!origin) return callback(null, true);
        
        // Allow configured origins
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        // Allow GitHub OAuth domains
        else if (githubDomains.some(domain => origin.startsWith(domain))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Request monitoring middleware (before routes)
app.use(requestMonitoring);

// Body parsing middleware
const maxFileSize = process.env.MAX_FILE_SIZE || '50mb';
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ limit: maxFileSize, extended: true }));

// Create required directories
const uploadsDir = path.join(__dirname, 'uploads');
const generatedDir = path.join(__dirname, 'generated');
const fs = require('fs');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
}

// Import route modules
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const cvRoutes = require('./routes/cv');
const githubRoutes = require('./routes/github');
const sessionRoutes = require('./routes/session');
const legalRoutes = require('./routes/legal');

// Mount routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/legal', legalRoutes);

// Error monitoring middleware
app.use(errorMonitoring);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'File too large',
            message: 'File size exceeds the 50MB limit'
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

// Test database connection
async function testDatabaseConnection() {
    if (!process.env.DATABASE_URL) {
        return false;
    }
    
    try {
        const { query } = require('./database/index');
        const result = await query('SELECT 1 as test');
        
        if (result && result.rows) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

// Memory pressure handling for free tier
let memoryPressureActive = false;
const MEMORY_PRESSURE_THRESHOLD = parseInt(process.env.MEMORY_PRESSURE_THRESHOLD) || 400; // MB

const checkMemoryPressure = () => {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > MEMORY_PRESSURE_THRESHOLD && !memoryPressureActive) {
        memoryPressureActive = true;
        console.warn(`⚠️  MEMORY PRESSURE DETECTED: ${heapUsedMB}MB used (threshold: ${MEMORY_PRESSURE_THRESHOLD}MB)`);
        console.warn('📉 Activating memory pressure protection - throttling new requests');
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
            const newUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            console.log(`🗑️  Garbage collection completed: ${newUsage}MB (freed: ${heapUsedMB - newUsage}MB)`);
        }
        
        // Trigger emergency file cleanup
        setTimeout(async () => {
            try {
                await fileCleanupManager.emergencyCleanup();
            } catch (error) {
                console.warn('Emergency cleanup failed:', error.message);
            }
        }, 1000); // Delay to avoid blocking current request
    } else if (heapUsedMB < MEMORY_PRESSURE_THRESHOLD * 0.8 && memoryPressureActive) {
        memoryPressureActive = false;
        console.log(`✅ Memory pressure relieved: ${heapUsedMB}MB`);
    }
    
    return memoryPressureActive;
};

// Memory pressure middleware
app.use('/api/cv/process', (req, res, next) => {
    if (checkMemoryPressure()) {
        return res.status(503).json({
            error: 'Service temporarily unavailable',
            message: 'Server is under memory pressure. Please try again in a few minutes.',
            code: 'MEMORY_PRESSURE'
        });
    }
    next();
});

// Monitor memory every 30 seconds
setInterval(checkMemoryPressure, 30000);

// Start server
const server = app.listen(PORT, async () => {
    console.log(`=================================`);
    console.log(`CV Landing Generator API Server`);
    console.log(`=================================`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`=================================`);
    console.log(`Configuration Status:`);
    console.log(`Gemini API: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? '✓ Configured' : '✗ Missing'}`);
    console.log(`GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? '✓ Configured' : '✗ Missing'}`);
    console.log(`CORS Origins: ${allowedOrigins.join(', ')}`);
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
    const rateLimitWindow = (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000 / 60;
    console.log(`Rate Limiting: ${rateLimitMax} requests per ${rateLimitWindow} minutes`);
    console.log(`=================================`);
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.warn('Database not available - run schema.sql in Supabase to set up tables');
    } else {
        console.log('✓ Database connection verified');
    }
    
    // Start file cleanup manager
    try {
        await fileCleanupManager.start();
        console.log('File cleanup manager started');
    } catch (error) {
        console.error('Failed to start file cleanup manager:', error);
    }
    
    console.log('=================================');
    console.log('Server startup completed');
    console.log('=================================');
});

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    
    // Stop file cleanup manager
    try {
        await fileCleanupManager.stop();
        console.log('File cleanup manager stopped');
    } catch (error) {
        console.error('Error stopping file cleanup manager:', error);
    }
    
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    
    // Stop file cleanup manager
    try {
        await fileCleanupManager.stop();
        console.log('File cleanup manager stopped');
    } catch (error) {
        console.error('Error stopping file cleanup manager:', error);
    }
    
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    
    try {
        await fileCleanupManager.stop();
    } catch (error) {
        // Ignore cleanup errors during crash
    }
    
    process.exit(1);
});

process.on('unhandledRejection', async (err) => {
    console.error('Unhandled Rejection:', err);
    
    try {
        await fileCleanupManager.stop();
    } catch (error) {
        // Ignore cleanup errors during crash
    }
    
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;