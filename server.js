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
app.use(helmet({
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
}));

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
    : ['http://localhost:4200', 'http://localhost:3000'];

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

// Mount routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/github', githubRoutes);

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

// Start server
app.listen(PORT, () => {
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
    console.log(`Rate Limiting: ${limiter.max} requests per ${limiter.windowMs/1000/60} minutes`);
    console.log(`=================================`);
});

module.exports = app;