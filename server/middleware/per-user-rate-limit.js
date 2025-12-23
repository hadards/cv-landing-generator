// Per-user rate limiting middleware (database-backed for multi-instance support)
const { query } = require('../database/index');
const metricsCollector = require('../lib/metrics-collector');

class PerUserRateLimiter {
    constructor() {
        this.windowMs = 15 * 60 * 1000; // 15 minutes
        this.maxRequestsPerWindow = 100; // requests per window
        this.cleanupInterval = 60 * 60 * 1000; // Clean up every hour

        // Start cleanup
        this.startCleanup();
    }

    /**
     * Check and update rate limit for a user+endpoint
     * NOTE: Requires rate_limits table from COMPLETE_SCHEMA.sql
     */
    async checkRateLimit(userId, endpoint) {

        const now = new Date();
        const windowStart = new Date(now.getTime() - this.windowMs);

        try {
            // Try to increment existing record
            const updateResult = await query(`
                UPDATE rate_limits
                SET request_count = request_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1
                  AND endpoint = $2
                  AND window_start > $3
                RETURNING request_count, window_start
            `, [userId, endpoint, windowStart]);

            if (updateResult.rows.length > 0) {
                const record = updateResult.rows[0];
                const remaining = Math.max(0, this.maxRequestsPerWindow - record.request_count);
                const resetTime = new Date(record.window_start.getTime() + this.windowMs);

                return {
                    allowed: record.request_count <= this.maxRequestsPerWindow,
                    limit: this.maxRequestsPerWindow,
                    remaining: remaining,
                    resetTime: resetTime,
                    current: record.request_count
                };
            } else {
                // Create new window
                await query(`
                    INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
                    VALUES ($1, $2, $3, 1)
                    ON CONFLICT (user_id, endpoint, window_start) DO UPDATE
                    SET request_count = rate_limits.request_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                `, [userId, endpoint, now]);

                return {
                    allowed: true,
                    limit: this.maxRequestsPerWindow,
                    remaining: this.maxRequestsPerWindow - 1,
                    resetTime: new Date(now.getTime() + this.windowMs),
                    current: 1
                };
            }
        } catch (error) {
            console.error('Error checking rate limit:', error);
            // On error, allow the request (fail open)
            return {
                allowed: true,
                limit: this.maxRequestsPerWindow,
                remaining: this.maxRequestsPerWindow,
                resetTime: new Date(now.getTime() + this.windowMs),
                current: 0,
                error: true
            };
        }
    }

    /**
     * Middleware to apply per-user rate limiting
     */
    middleware(options = {}) {
        const maxRequests = options.max || this.maxRequestsPerWindow;
        const message = options.message || 'Too many requests from this user. Please try again later.';

        return async (req, res, next) => {
            // Skip if no user (unauthenticated)
            if (!req.user || !req.user.userId) {
                return next();
            }

            const userId = req.user.userId;
            const endpoint = req.route ? req.route.path : req.path;

            const result = await this.checkRateLimit(userId, endpoint);

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', result.limit);
            res.setHeader('X-RateLimit-Remaining', result.remaining);
            res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());

            if (!result.allowed) {
                const retryAfterSeconds = Math.ceil((result.resetTime - new Date()) / 1000);
                res.setHeader('Retry-After', retryAfterSeconds);

                // Record rate limit event
                metricsCollector.recordSecurityEvent('rate_limit_exceeded', {
                    userId: userId,
                    endpoint: endpoint,
                    limit: result.limit,
                    current: result.current
                });

                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: message,
                    limit: result.limit,
                    remaining: 0,
                    resetTime: result.resetTime.toISOString(),
                    retryAfter: retryAfterSeconds
                });
            }

            next();
        };
    }

    /**
     * Clean up old rate limit records
     */
    async cleanup() {
        try {
            const cutoff = new Date(Date.now() - this.windowMs * 2); // Keep 2 windows worth of data
            const result = await query(
                'DELETE FROM rate_limits WHERE created_at < $1',
                [cutoff]
            );

            if (result.rowCount > 0) {
                console.log(`Cleaned up ${result.rowCount} old rate limit records`);
            }
        } catch (error) {
            console.error('Error cleaning up rate limits:', error);
        }
    }

    /**
     * Start periodic cleanup
     */
    startCleanup() {
        setInterval(() => this.cleanup(), this.cleanupInterval);
        console.log('Per-user rate limit cleanup started');
    }

    /**
     * Reset rate limits for a specific user (admin function)
     */
    async resetUserLimits(userId) {
        try {
            await query('DELETE FROM rate_limits WHERE user_id = $1', [userId]);
            console.log(`Reset rate limits for user: ${userId}`);
            return true;
        } catch (error) {
            console.error('Error resetting user rate limits:', error);
            return false;
        }
    }
}

// Singleton instance
const perUserRateLimiter = new PerUserRateLimiter();

module.exports = perUserRateLimiter;
