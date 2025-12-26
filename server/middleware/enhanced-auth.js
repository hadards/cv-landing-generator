// File: middleware/enhanced-auth.js
// Enhanced JWT authentication with expiration, revocation, and session management

const jwt = require('jsonwebtoken');
const { getUserById } = require('../database/services');
const sessionStore = require('../database/session-store');

// Configuration
const JWT_CONFIG = {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER) || 5,
    sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS) || 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Generate JWT token with enhanced security
 */
function generateTokens(userId, userEmail) {
    const tokenId = require('crypto').randomUUID();
    const sessionId = require('crypto').randomUUID();
    
    const accessTokenPayload = {
        userId: userId,
        email: userEmail,
        tokenId: tokenId,
        sessionId: sessionId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
    };
    
    const refreshTokenPayload = {
        userId: userId,
        tokenId: tokenId,
        sessionId: sessionId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
    };
    
    const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET, {
        expiresIn: JWT_CONFIG.expiresIn
    });
    
    const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_SECRET, {
        expiresIn: JWT_CONFIG.refreshExpiresIn
    });
    
    // Track active session
    trackActiveSession(userId, sessionId, tokenId);
    
    return {
        accessToken,
        refreshToken,
        sessionId,
        tokenId,
        expiresIn: JWT_CONFIG.expiresIn
    };
}

/**
 * Track active user sessions
 */
async function trackActiveSession(userId, sessionId, tokenId) {
    const expiresInMs = parseExpiration(JWT_CONFIG.expiresIn);
    await sessionStore.trackSession(userId, sessionId, tokenId, expiresInMs);
}

/**
 * Parse JWT expiration string to milliseconds
 */
function parseExpiration(expiresIn) {
    const match = expiresIn.match(/^(\d+)([hdm])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        default: return 24 * 60 * 60 * 1000;
    }
}

/**
 * Update session activity
 */
async function updateSessionActivity(userId, sessionId) {
    await sessionStore.updateSessionActivity(userId, sessionId);
}

/**
 * Check if session is valid (not expired)
 */
async function isSessionValid(userId, sessionId) {
    return await sessionStore.isSessionValid(userId, sessionId);
}

/**
 * Blacklist a token
 */
async function blacklistToken(tokenId) {
    const expiresInMs = parseExpiration(JWT_CONFIG.refreshExpiresIn);
    await sessionStore.blacklistToken(tokenId, expiresInMs);
}

/**
 * Check if token is blacklisted
 */
async function isTokenBlacklisted(tokenId) {
    return await sessionStore.isTokenBlacklisted(tokenId);
}

/**
 * Enhanced JWT verification middleware
 */
const verifyTokenEnhanced = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.substring(7);
        
        // Verify JWT signature and decode
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    error: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            }
            throw jwtError;
        }
        
        // Check token type (skip for legacy tokens that don't have type)
        if (decoded.type && decoded.type !== 'access') {
            return res.status(401).json({ 
                error: 'Invalid token type',
                code: 'INVALID_TOKEN_TYPE'
            });
        }
        
        // Check if token is blacklisted (skip for legacy tokens without tokenId)
        if (decoded.tokenId && await isTokenBlacklisted(decoded.tokenId)) {
            return res.status(401).json({
                error: 'Token has been revoked',
                code: 'TOKEN_REVOKED'
            });
        }

        // Check session validity (skip for legacy tokens without sessionId)
        if (decoded.sessionId) {
            const sessionValid = await isSessionValid(decoded.userId, decoded.sessionId);
            if (!sessionValid) {
                // Session not in database - recreate from valid token (server restart scenario)
                console.log(`Recreating session ${decoded.sessionId.substring(0, 8)}... for user ${decoded.userId}`);
                await trackActiveSession(decoded.userId, decoded.sessionId, decoded.tokenId);
            }
        }

        // Verify user still exists
        const user = await getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Update session activity (only for enhanced tokens)
        if (decoded.sessionId) {
            await updateSessionActivity(decoded.userId, decoded.sessionId);
        }
        
        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            tokenId: decoded.tokenId || null,
            sessionId: decoded.sessionId || null,
            ...user
        };
        
        next();
        
    } catch (error) {
        console.error('Enhanced token verification error:', error);
        res.status(500).json({ 
            error: 'Authentication verification failed',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Logout function - blacklist token and remove session
 */
async function logout(userId, sessionId, tokenId) {
    await sessionStore.deleteSession(userId, sessionId, tokenId);
    return true;
}

/**
 * Logout all sessions for a user
 */
async function logoutAllSessions(userId) {
    await sessionStore.deleteAllUserSessions(userId);
    return true;
}

/**
 * Refresh token endpoint logic
 */
async function refreshAccessToken(refreshToken) {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid refresh token type');
        }

        if (await isTokenBlacklisted(decoded.tokenId)) {
            throw new Error('Refresh token has been revoked');
        }

        if (!await isSessionValid(decoded.userId, decoded.sessionId)) {
            throw new Error('Session expired');
        }

        // Verify user still exists
        const user = await getUserById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Generate new tokens
        const tokens = generateTokens(decoded.userId, user.email);

        // Blacklist old tokens
        await blacklistToken(decoded.tokenId);

        return tokens;

    } catch (error) {
        throw new Error('Invalid refresh token: ' + error.message);
    }
}

/**
 * Get active sessions for a user
 */
async function getActiveSessions(userId) {
    return await sessionStore.getActiveSessions(userId);
}

module.exports = {
    verifyTokenEnhanced,
    generateTokens,
    refreshAccessToken,
    logout,
    logoutAllSessions,
    getActiveSessions
};