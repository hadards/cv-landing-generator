// File: server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Production-safe console logging
const isDevelopment = process.env.NODE_ENV !== 'production';
global.console = {
    ...console,
    log: isDevelopment ? console.log : () => {},
    debug: isDevelopment ? console.log : () => {},
    info: console.info,
    warn: console.warn,
    error: console.error
};

// Import constants
const {
    RATE_LIMIT_WINDOW_MS,
    FREE_TIER_RATE_LIMIT,
    DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    MAX_ARCHIVE_SIZE_BYTES,
    MEMORY_PRESSURE_THRESHOLD_MB,
    THIRTY_SECONDS_MS,
    PATHS
} = require('./constants');

// Import monitoring systems
const { requestMonitoring, errorMonitoring } = require('./middleware/monitoring');
const metricsCollector = require('./lib/metrics-collector');
const fileCleanupManager = require('./lib/file-cleanup');

// Import security middleware
const csrfProtection = require('./middleware/csrf-protection');
const perUserRateLimiter = require('./middleware/per-user-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for Render (and other reverse proxies)
app.set('trust proxy', 1);

// Validate required environment variables
const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET'
];

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
    console.error('ERROR: Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    process.exit(1);
}

// Validate LLM client type specific variables
const llmClientType = process.env.LLM_CLIENT_TYPE || 'gemini';
if (llmClientType === 'gemini' && !process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is required when LLM_CLIENT_TYPE=gemini');
    process.exit(1);
}

if (llmClientType === 'ollama' && !process.env.OLLAMA_BASE_URL) {
    console.error('ERROR: OLLAMA_BASE_URL is required when LLM_CLIENT_TYPE=ollama');
    process.exit(1);
}

// Security middleware
// Apply CSP only to API routes, not to frontend static files
app.use((req, res, next) => {
    // Skip CSP for preview and static file endpoints
    const isPreviewRoute = req.path.includes('/api/cv/preview') || req.path.includes('/api/cv/static');

    // Only apply CSP to API routes, not frontend static files
    const isApiRoute = req.path.startsWith('/api/');

    if (isPreviewRoute || !isApiRoute) {
        // Don't apply CSP for non-API routes (frontend static files)
        return next();
    }

    // Apply CSP for API routes, but relaxed for Google OAuth compatibility
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameSrc: ["'self'", "https://accounts.google.com"],
                formAction: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,  // Disable COOP to allow Google Sign-In and OAuth popups
        crossOriginResourcePolicy: false  // Disable CORP to allow Google OAuth resources
    })(req, res, next);
});

// Rate limiting - Free tier optimized
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || FREE_TIER_RATE_LIMIT,
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
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: parseInt(process.env.GITHUB_RATE_LIMIT) || FREE_TIER_RATE_LIMIT,
    message: {
        error: 'GitHub rate limit exceeded',
        message: 'Too many GitHub requests. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting (IP-based, applies to all requests including unauthenticated)
app.use('/api/github/', githubLimiter);
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        process.env.FRONTEND_URL || 'http://localhost:4200',
        process.env.API_URL || 'http://localhost:3000'
    ];

// In production, when frontend and backend are on same domain, also allow that
if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
    // Extract base URL without trailing slash
    const baseUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
    if (!allowedOrigins.includes(baseUrl)) {
        allowedOrigins.push(baseUrl);
    }
}

// Add OAuth domains for redirects
const oauthDomains = [
    'https://github.com',
    'https://api.github.com',
    'https://accounts.google.com',
    'https://oauth2.googleapis.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, OAuth redirects, same-origin)
        if (!origin) {
            console.info('[CORS] Request with no origin allowed');
            return callback(null, true);
        }

        // Allow configured origins
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.info('[CORS] Allowed origin:', origin);
            callback(null, true);
        }
        // Allow OAuth domains (GitHub and Google)
        else if (oauthDomains.some(domain => origin.startsWith(domain))) {
            console.info('[CORS] OAuth domain allowed:', origin);
            callback(null, true);
        } else {
            console.warn('[CORS] Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Request monitoring middleware (before routes)
app.use(requestMonitoring);

// Body parsing middleware
const maxFileSize = process.env.MAX_FILE_SIZE || `${MAX_ARCHIVE_SIZE_BYTES}`;
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ limit: maxFileSize, extended: true }));

// SECURITY NOTE: CSRF and per-user rate limiting are applied within routes
// after authentication middleware (verifyTokenEnhanced) to ensure user context

// Create required directories
const fs = require('fs');
const uploadsDir = path.join(__dirname, '..', PATHS.UPLOADS_DIR);
const generatedDir = path.join(__dirname, '..', PATHS.GENERATED_DIR);
const outputDir = path.join(__dirname, '..', PATHS.OUTPUT_DIR);

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}
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

// Serve Angular static files in production (BEFORE error monitoring)
const nodeEnv = (process.env.NODE_ENV || '').trim();
if (nodeEnv === 'production') {
    const frontendPath = path.join(__dirname, '../frontend/dist/frontend/browser');

    console.info('=================================');
    console.info('PRODUCTION MODE: Static file serving enabled');
    console.info('Frontend path:', frontendPath);
    console.info('=================================');

    // Serve static files
    app.use(express.static(frontendPath));

    // Send all non-API requests to Angular (SPA routing)
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    console.info('=================================');
    console.info('DEVELOPMENT MODE: Static file serving DISABLED');
    console.info('NODE_ENV:', JSON.stringify(process.env.NODE_ENV));
    console.info('=================================');
}

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

// 404 handler (only in development)
if (nodeEnv !== 'production') {
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: 'The requested resource was not found'
        });
    });
}

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
const memoryPressureThreshold = parseInt(process.env.MEMORY_PRESSURE_THRESHOLD) || MEMORY_PRESSURE_THRESHOLD_MB;

const checkMemoryPressure = () => {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

    if (heapUsedMB > memoryPressureThreshold && !memoryPressureActive) {
        memoryPressureActive = true;
        console.warn(`MEMORY PRESSURE DETECTED: ${heapUsedMB}MB used (threshold: ${memoryPressureThreshold}MB)`);
        console.warn('Activating memory pressure protection - throttling new requests');

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
            const newUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            console.info(`Garbage collection completed: ${newUsage}MB (freed: ${heapUsedMB - newUsage}MB)`);
        }

        // Trigger emergency file cleanup
        setTimeout(async () => {
            try {
                await fileCleanupManager.emergencyCleanup();
            } catch (error) {
                console.warn('Emergency cleanup failed:', error.message);
            }
        }, 1000); // Delay to avoid blocking current request
    } else if (heapUsedMB < memoryPressureThreshold * 0.8 && memoryPressureActive) {
        memoryPressureActive = false;
        console.info(`Memory pressure relieved: ${heapUsedMB}MB`);
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
setInterval(checkMemoryPressure, THIRTY_SECONDS_MS);

// Initialize authentication session storage tables
const sessionStore = require('./database/session-store');
sessionStore.initializeSessionTables().then(() => {
    console.info('Authentication session storage initialized');
    // Schedule daily cleanup of expired authentication sessions
    setInterval(() => {
        sessionStore.cleanupExpiredData().catch(err => {
            console.error('Auth session cleanup error:', err);
        });
    }, 24 * 60 * 60 * 1000); // Run daily
}).catch(error => {
    console.error('Failed to initialize session storage:', error);
    process.exit(1);
});

// Schedule CV processing session cleanup (every 6 hours)
const CVSessionService = require('./lib/services/cv-session-service');
const cvSessionService = new CVSessionService();
setInterval(() => {
    cvSessionService.cleanupExpiredSessions().catch(err => {
        console.error('CV session cleanup error:', err);
    });
}, 6 * 60 * 60 * 1000); // Every 6 hours

// Start server
const server = app.listen(PORT, async () => {
    const isProduction = nodeEnv === 'production';
    const serverUrl = isProduction
        ? (process.env.API_URL || process.env.FRONTEND_URL || `Port ${PORT}`)
        : `http://localhost:${PORT}`;

    console.info(`=================================`);
    console.info(`CV Landing Generator API Server`);
    console.info(`=================================`);
    console.info(`Environment: ${nodeEnv || 'development'}`);
    console.info(`Server: ${serverUrl}`);
    if (!isProduction) {
        console.info(`Health: http://localhost:${PORT}/api/health`);
    }
    console.info(`=================================`);
    console.info(`Configuration Status:`);
    console.info(`Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Missing'}`);
    console.info(`JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`);
    console.info(`Database: ${process.env.DATABASE_URL ? 'Configured' : 'Missing'}`);
    console.info(`GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? 'Configured' : 'Missing'}`);
    console.info(`Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing'}`);
    console.info(`CORS Allowed Origins:`);
    allowedOrigins.forEach(origin => console.info(`  - ${origin}`));
    console.info(`CORS OAuth Domains:`);
    oauthDomains.forEach(domain => console.info(`  - ${domain}`));
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || DEFAULT_RATE_LIMIT_MAX_REQUESTS;
    const rateLimitWindow = (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS) / 1000 / 60;
    console.info(`Rate Limiting: ${rateLimitMax} requests per ${rateLimitWindow} minutes`);
    console.info(`=================================`);
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.warn('Database not available - run schema.sql in Supabase to set up tables');
    } else {
        console.info('Database connection verified');
    }

    // Start file cleanup manager
    try {
        await fileCleanupManager.start();
        console.info('File cleanup manager started');
    } catch (error) {
        console.error('Failed to start file cleanup manager:', error);
    }

    console.info('=================================');
    console.info('Server startup completed');
    console.info('=================================');
});

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
    console.info('SIGTERM received, shutting down gracefully');

    // Stop file cleanup manager
    try {
        await fileCleanupManager.stop();
        console.info('File cleanup manager stopped');
    } catch (error) {
        console.error('Error stopping file cleanup manager:', error);
    }

    server.close(() => {
        console.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.info('SIGINT received, shutting down gracefully');

    // Stop file cleanup manager
    try {
        await fileCleanupManager.stop();
        console.info('File cleanup manager stopped');
    } catch (error) {
        console.error('Error stopping file cleanup manager:', error);
    }

    server.close(() => {
        console.info('Process terminated');
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