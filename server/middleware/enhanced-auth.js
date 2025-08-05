// File: middleware/enhanced-auth.js
// Enhanced JWT authentication with expiration, revocation, and session management

const jwt = require('jsonwebtoken');
const { getUserById } = require('../database/services');

// In-memory token blacklist - in production, use Redis
const tokenBlacklist = new Set();

// Session tracking - in production, use Redis with expiration
const activeSessions = new Map();

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
function trackActiveSession(userId, sessionId, tokenId) {
    if (!activeSessions.has(userId)) {
        activeSessions.set(userId, new Map());
    }
    
    const userSessions = activeSessions.get(userId);
    
    // Enforce session limit
    if (userSessions.size >= JWT_CONFIG.maxSessionsPerUser) {
        // Remove oldest session
        const oldestSession = userSessions.keys().next().value;
        const oldSessionData = userSessions.get(oldestSession);
        if (oldSessionData) {
            blacklistToken(oldSessionData.tokenId);
        }
        userSessions.delete(oldestSession);
    }
    
    userSessions.set(sessionId, {
        tokenId: tokenId,
        createdAt: Date.now(),
        lastActivity: Date.now()
    });
}

/**
 * Update session activity
 */
function updateSessionActivity(userId, sessionId) {
    const userSessions = activeSessions.get(userId);
    if (userSessions && userSessions.has(sessionId)) {
        const session = userSessions.get(sessionId);
        session.lastActivity = Date.now();
    }
}

/**
 * Check if session is expired
 */
function isSessionExpired(userId, sessionId) {
    const userSessions = activeSessions.get(userId);
    if (!userSessions || !userSessions.has(sessionId)) {
        return true;
    }
    
    const session = userSessions.get(sessionId);
    return (Date.now() - session.lastActivity) > JWT_CONFIG.sessionTimeoutMs;
}

/**
 * Blacklist a token
 */
function blacklistToken(tokenId) {
    tokenBlacklist.add(tokenId);
    
    // Clean up old blacklisted tokens periodically
    if (tokenBlacklist.size > 10000) {
        const tokensToKeep = Array.from(tokenBlacklist).slice(-5000);
        tokenBlacklist.clear();
        tokensToKeep.forEach(token => tokenBlacklist.add(token));
    }
}

/**
 * Check if token is blacklisted
 */
function isTokenBlacklisted(tokenId) {
    return tokenBlacklist.has(tokenId);
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
        if (decoded.tokenId && isTokenBlacklisted(decoded.tokenId)) {
            return res.status(401).json({ 
                error: 'Token has been revoked',
                code: 'TOKEN_REVOKED'
            });
        }
        
        // Check session validity (skip for legacy tokens without sessionId)
        if (decoded.sessionId && isSessionExpired(decoded.userId, decoded.sessionId)) {
            return res.status(401).json({ 
                error: 'Session expired',
                code: 'SESSION_EXPIRED'
            });
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
            updateSessionActivity(decoded.userId, decoded.sessionId);
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
function logout(userId, sessionId, tokenId) {
    // Blacklist the token
    blacklistToken(tokenId);
    
    // Remove session
    const userSessions = activeSessions.get(userId);
    if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
            activeSessions.delete(userId);
        }
    }
    
    return true;
}

/**
 * Logout all sessions for a user
 */
function logoutAllSessions(userId) {
    const userSessions = activeSessions.get(userId);
    if (userSessions) {
        // Blacklist all tokens for this user
        for (const [sessionId, sessionData] of userSessions) {
            blacklistToken(sessionData.tokenId);
        }
        // Remove all sessions
        activeSessions.delete(userId);
    }
    
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
        
        if (isTokenBlacklisted(decoded.tokenId)) {
            throw new Error('Refresh token has been revoked');
        }
        
        if (isSessionExpired(decoded.userId, decoded.sessionId)) {
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
        blacklistToken(decoded.tokenId);
        
        return tokens;
        
    } catch (error) {
        throw new Error('Invalid refresh token: ' + error.message);
    }
}

/**
 * Get active sessions for a user
 */
function getActiveSessions(userId) {
    const userSessions = activeSessions.get(userId);
    if (!userSessions) {
        return [];
    }
    
    return Array.from(userSessions.entries()).map(([sessionId, sessionData]) => ({
        sessionId,
        createdAt: new Date(sessionData.createdAt),
        lastActivity: new Date(sessionData.lastActivity),
        isExpired: isSessionExpired(userId, sessionId)
    }));
}

module.exports = {
    verifyTokenEnhanced,
    generateTokens,
    refreshAccessToken,
    logout,
    logoutAllSessions,
    getActiveSessions,
    blacklistToken,
    isTokenBlacklisted,
    JWT_CONFIG
};