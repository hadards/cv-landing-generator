// Unified Security Middleware - Combines CSRF and per-user rate limiting
// Apply this AFTER authentication middleware (verifyTokenEnhanced)

const csrfProtection = require('./csrf-protection');
const perUserRateLimiter = require('./per-user-rate-limit');

/**
 * Create security middleware chain for authenticated routes
 * Combines CSRF protection and per-user rate limiting
 *
 * @param {Object} options - Configuration options
 * @param {number} options.rateLimit - Max requests per 15-minute window (default: 50)
 * @param {boolean} options.csrf - Enable CSRF protection (default: true)
 * @returns {Array} Array of middleware functions
 */
function createSecurityMiddleware(options = {}) {
    const {
        rateLimit = 50,
        csrf = true
    } = options;

    const middlewares = [];

    // 1. Add CSRF token to response headers (for authenticated users)
    if (csrf) {
        middlewares.push(csrfProtection.addTokenMiddleware());
    }

    // 2. Verify CSRF token on state-changing requests
    if (csrf) {
        middlewares.push(csrfProtection.verifyTokenMiddleware());
    }

    // 3. Apply per-user rate limiting
    middlewares.push(perUserRateLimiter.middleware({ max: rateLimit }));

    return middlewares;
}

/**
 * Standard security middleware for CV operations
 * Rate limit: 50 requests per 15 minutes
 */
const cvSecurity = createSecurityMiddleware({ rateLimit: 50 });

/**
 * Strict security middleware for GitHub operations
 * Rate limit: 20 requests per 15 minutes
 */
const githubSecurity = createSecurityMiddleware({ rateLimit: 20 });

/**
 * Security middleware without rate limiting (for less sensitive operations)
 */
const csrfOnly = createSecurityMiddleware({ rateLimit: 999999 });

/**
 * Rate limiting only (no CSRF) - for JWT-based API endpoints
 * JWT-based APIs are less vulnerable to CSRF than cookie-based sessions
 */
const rateLimitOnly = createSecurityMiddleware({ rateLimit: 50, csrf: false });

/**
 * Rate limiting only for GitHub operations (no CSRF)
 */
const githubRateLimitOnly = createSecurityMiddleware({ rateLimit: 20, csrf: false });

module.exports = {
    createSecurityMiddleware,
    cvSecurity,
    githubSecurity,
    csrfOnly,
    rateLimitOnly,
    githubRateLimitOnly
};
