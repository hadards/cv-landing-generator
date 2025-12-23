// CSRF Protection Middleware
const crypto = require('crypto');
const metricsCollector = require('../lib/metrics-collector');

class CSRFProtection {
    constructor() {
        this.tokens = new Map(); // In production, use Redis or database
        this.tokenExpiry = 3600000; // 1 hour
        this.cleanupInterval = 600000; // Clean up every 10 minutes

        // Start cleanup
        this.startCleanup();
    }

    /**
     * Generate CSRF token for a session
     */
    generateToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = Date.now() + this.tokenExpiry;

        this.tokens.set(token, {
            userId,
            expiry
        });

        return token;
    }

    /**
     * Verify CSRF token
     */
    verifyToken(token, userId) {
        const tokenData = this.tokens.get(token);

        if (!tokenData) {
            return false;
        }

        // Check expiry
        if (Date.now() > tokenData.expiry) {
            this.tokens.delete(token);
            return false;
        }

        // Check user match
        if (tokenData.userId !== userId) {
            return false;
        }

        return true;
    }

    /**
     * Invalidate token after use (optional - depends on your needs)
     */
    invalidateToken(token) {
        this.tokens.delete(token);
    }

    /**
     * Clean up expired tokens
     */
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [token, data] of this.tokens.entries()) {
                if (now > data.expiry) {
                    this.tokens.delete(token);
                }
            }
        }, this.cleanupInterval);
    }

    /**
     * Middleware to add CSRF token to response
     */
    addTokenMiddleware() {
        return (req, res, next) => {
            if (req.user && req.user.userId) {
                const csrfToken = this.generateToken(req.user.userId);
                res.setHeader('X-CSRF-Token', csrfToken);

                // Also make it available in req for rendering
                req.csrfToken = csrfToken;
            }
            next();
        };
    }

    /**
     * Middleware to verify CSRF token on state-changing requests
     */
    verifyTokenMiddleware() {
        return (req, res, next) => {
            // Skip for safe methods
            if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                return next();
            }

            // Skip for auth endpoints (they don't have tokens yet)
            if (req.path.startsWith('/api/auth/login') ||
                req.path.startsWith('/api/auth/logout')) {
                return next();
            }

            // Require authenticated user
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'NO_AUTH'
                });
            }

            // Get token from header
            const token = req.headers['x-csrf-token'];

            if (!token) {
                metricsCollector.recordSecurityEvent('csrf_violation', {
                    reason: 'missing_token',
                    method: req.method,
                    path: req.path,
                    userId: req.user.userId
                });
                return res.status(403).json({
                    error: 'CSRF token required',
                    code: 'NO_CSRF_TOKEN'
                });
            }

            // Verify token
            if (!this.verifyToken(token, req.user.userId)) {
                metricsCollector.recordSecurityEvent('csrf_violation', {
                    reason: 'invalid_token',
                    userId: req.user.userId,
                    path: req.path
                });
                return res.status(403).json({
                    error: 'Invalid CSRF token',
                    code: 'INVALID_CSRF_TOKEN'
                });
            }

            next();
        };
    }
}

// Singleton instance
const csrfProtection = new CSRFProtection();

module.exports = csrfProtection;
