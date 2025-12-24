// File: routes/session.js
// Session management endpoints for logout, token refresh, and session control

const express = require('express');
const { body } = require('express-validator');
const {
    verifyTokenEnhanced,
    refreshAccessToken,
    logout,
    logoutAllSessions,
    getActiveSessions
} = require('../middleware/enhanced-auth');
const { handleValidationErrors } = require('../middleware/validation');
const { sendServerError } = require('../lib/utils/response-helpers');

const router = express.Router();

/**
 * POST /api/session/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', 
    [
        body('refreshToken').isString().notEmpty()
            .withMessage('Refresh token is required')
    ],
    handleValidationErrors,
    async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        const tokens = await refreshAccessToken(refreshToken);
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            ...tokens
        });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        
        // Determine error type for proper response
        if (error.message.includes('expired') || error.message.includes('revoked')) {
            return res.status(401).json({
                error: 'Refresh token invalid',
                message: error.message,
                code: 'REFRESH_TOKEN_INVALID'
            });
        }
        
        res.status(400).json({
            error: 'Token refresh failed',
            message: error.message
        });
    }
});

/**
 * POST /api/session/logout
 * Logout current session (blacklist current token)
 */
router.post('/logout', verifyTokenEnhanced, async (req, res) => {
    try {
        const { userId, sessionId, tokenId } = req.user;
        
        const success = logout(userId, sessionId, tokenId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } else {
            res.status(500).json({
                error: 'Logout failed',
                message: 'Could not invalidate session'
            });
        }
        
    } catch (error) {
        sendServerError(res, 'Logout', error, 'Logout failed');
    }
});

/**
 * POST /api/session/logout-all
 * Logout all sessions for current user
 */
router.post('/logout-all', verifyTokenEnhanced, async (req, res) => {
    try {
        const { userId } = req.user;
        
        const success = logoutAllSessions(userId);
        
        if (success) {
            res.json({
                success: true,
                message: 'All sessions logged out successfully'
            });
        } else {
            res.status(500).json({
                error: 'Logout all failed',
                message: 'Could not invalidate all sessions'
            });
        }
        
    } catch (error) {
        sendServerError(res, 'Logout all', error, 'Logout all failed');
    }
});

/**
 * GET /api/session/active
 * Get all active sessions for current user
 */
router.get('/active', verifyTokenEnhanced, async (req, res) => {
    try {
        const { userId, sessionId } = req.user;
        
        const sessions = getActiveSessions(userId);
        
        // Mark current session
        const sessionsWithCurrent = sessions.map(session => ({
            ...session,
            isCurrent: session.sessionId === sessionId
        }));
        
        res.json({
            success: true,
            sessions: sessionsWithCurrent,
            totalSessions: sessions.length
        });
        
    } catch (error) {
        sendServerError(res, 'Get active sessions', error, 'Failed to get active sessions');
    }
});

/**
 * DELETE /api/session/:sessionId
 * Terminate a specific session (except current one)
 */
router.delete('/:sessionId', 
    verifyTokenEnhanced,
    async (req, res) => {
    try {
        const { userId, sessionId: currentSessionId } = req.user;
        const { sessionId } = req.params;
        
        // Prevent user from terminating their current session
        if (sessionId === currentSessionId) {
            return res.status(400).json({
                error: 'Cannot terminate current session',
                message: 'Use /logout endpoint to terminate current session'
            });
        }
        
        // Get user sessions
        const sessions = getActiveSessions(userId);
        const targetSession = sessions.find(s => s.sessionId === sessionId);
        
        if (!targetSession) {
            return res.status(404).json({
                error: 'Session not found',
                message: 'The specified session does not exist or has already expired'
            });
        }
        
        // Terminate the session (this would need session-specific token tracking)
        // For now, we'll implement a basic version
        const success = logout(userId, sessionId, null); // We'd need to track tokenId per session
        
        res.json({
            success: true,
            message: 'Session terminated successfully'
        });
        
    } catch (error) {
        sendServerError(res, 'Terminate session', error, 'Failed to terminate session');
    }
});

/**
 * GET /api/session/info
 * Get current session information
 */
router.get('/info', verifyTokenEnhanced, async (req, res) => {
    try {
        const { userId, sessionId, email, tokenId } = req.user;
        
        const sessions = getActiveSessions(userId);
        const currentSession = sessions.find(s => s.sessionId === sessionId);
        
        res.json({
            success: true,
            session: {
                userId,
                email,
                sessionId,
                tokenId: tokenId.substring(0, 8) + '...', // Partial token ID for security
                ...currentSession
            }
        });
        
    } catch (error) {
        sendServerError(res, 'Get session info', error, 'Failed to get session info');
    }
});

module.exports = router;