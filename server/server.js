// File: server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import monitoring systems
const { requestMonitoring, errorMonitoring } = require('./middleware/monitoring');
const metricsCollector = require('./lib/metrics-collector');
const fileCleanupManager = require('./lib/file-cleanup');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is required for CV processing');
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

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
    message: {
        error: 'Too many requests',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// More lenient rate limiting for GitHub OAuth routes
const githubLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Allow more requests for OAuth flow
    message: {
        error: 'Too many GitHub requests',
        message: 'Please try again later'
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

// Mount routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/session', sessionRoutes);

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
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// Simple database connection test
async function testDatabaseConnection() {
    if (!process.env.DATABASE_URL) {
        console.log('No DATABASE_URL configured - using in-memory storage');
        return false;
    }
    
    try {
        const { testConnection } = require('./database/index');
        const result = await testConnection();
        
        if (result.success) {
            console.log(`Database connected: ${result.message}`);
            if (result.tables && result.tables.length > 0) {
                console.log(`Existing tables: ${result.tables.join(', ')}`);
            }
            return true;
        } else {
            console.warn(`Database connection failed: ${result.message}`);
            return false;
        }
    } catch (error) {
        console.warn('Database test failed:', error.message);
        return false;
    }
}

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