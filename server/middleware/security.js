// Unified Security Middleware - Combines CSRF and per-user rate limiting
// Apply this AFTER authentication middleware (verifyTokenEnhanced)

const csrfProtection = require('./csrf-protection');
const perUserRateLimiter = require('./per-user-rate-limit');

/**
 * Standard security middleware for CV operations
 * Rate limit: 50 requests per 15 minutes
 */
const cvSecurity = (() => {
    const middlewares = [];
    middlewares.push(csrfProtection.addTokenMiddleware());
    middlewares.push(csrfProtection.verifyTokenMiddleware());
    middlewares.push(perUserRateLimiter.middleware({ max: 50 }));
    return middlewares;
})();

/**
 * Rate limiting only (no CSRF) - for JWT-based API endpoints
 * JWT-based APIs are less vulnerable to CSRF than cookie-based sessions
 */
const rateLimitOnly = (() => {
    const middlewares = [];
    middlewares.push(perUserRateLimiter.middleware({ max: 50 }));
    return middlewares;
})();

/**
 * Rate limiting only for GitHub operations (no CSRF)
 */
const githubRateLimitOnly = (() => {
    const middlewares = [];
    middlewares.push(perUserRateLimiter.middleware({ max: 20 }));
    return middlewares;
})();

module.exports = {
    cvSecurity,
    rateLimitOnly,
    githubRateLimitOnly
};
