// File: routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const {
    createOrUpdateUser,
    getUserById,
    exportUserData,
    deleteUserAccount
} = require('../database/services');
const { recordUserLogin, recordUserRegistration } = require('../middleware/monitoring');
const {
    verifyTokenEnhanced,
    refreshAccessToken,
    logout
} = require('../middleware/enhanced-auth');
const metricsCollector = require('../lib/metrics-collector');
const { sendServerError, sendBadRequest } = require('../lib/utils/response-helpers');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Get Google Client ID for frontend
router.get('/config', (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID
    });
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        console.info('Login attempt received from IP:', req.ip);
        const { credential } = req.body;

        if (!credential) {
            console.warn('Login failed: No credential provided');
            return sendBadRequest(res, 'Google credential is required');
        }

        // Verify Google JWT token
        try {
            console.info('Verifying Google token...');
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();

            if (!payload) {
                console.error('Login failed: Empty payload from Google token');
                return sendBadRequest(res, 'Invalid Google token');
            }

            console.info('Google token verified for user:', payload.email);

            // Create or update user in database
            try {
                const dbUser = await createOrUpdateUser({
                    email: payload.email,
                    name: payload.name,
                    google_id: payload.sub
                });

                console.info('User record created/updated in database:', dbUser.id);

                const user = {
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.name,
                    picture: payload.picture,
                    verified: payload.email_verified
                };

                // Generate JWT token using enhanced auth
                const { generateTokens } = require('../middleware/enhanced-auth');
                const tokens = generateTokens(dbUser.id, dbUser.email);
                const token = tokens.accessToken;

                console.info('JWT token generated for user:', dbUser.id);

                // Record user login
                recordUserLogin(user.id);

                console.info('Login successful for user:', user.email);
                res.status(200).json({
                    success: true,
                    user: user,
                    token: token,
                    message: 'Login successful'
                });
            } catch (dbError) {
                console.error('Database error during login:', {
                    error: dbError.message,
                    stack: dbError.stack,
                    email: payload.email
                });
                return res.status(500).json({
                    error: 'Database error',
                    message: 'Failed to create or update user account'
                });
            }
        } catch (googleError) {
            console.error('Google token verification failed:', {
                error: googleError.message,
                stack: googleError.stack,
                credentialLength: credential?.length
            });
            res.status(400).json({
                error: 'Invalid Google credential',
                message: 'Failed to verify Google authentication token'
            });
        }

    } catch (error) {
        console.error('Unexpected login error:', {
            error: error.message,
            stack: error.stack
        });
        sendServerError(res, 'Login', error, 'Authentication failed');
    }
});

// Logout endpoint (enhanced with token revocation)
router.post('/logout', verifyTokenEnhanced, async (req, res) => {
    try {
        const { userId, sessionId, tokenId } = req.user;

        if (sessionId && tokenId) {
            logout(userId, sessionId, tokenId);
            console.log(`User ${userId} logged out, session ${sessionId} terminated`);
        }

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        sendServerError(res, 'Logout', error, 'Logout failed');
    }
});

// Token refresh endpoint
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return sendBadRequest(res, 'Refresh token is required');
        }

        const tokens = await refreshAccessToken(refreshToken);

        res.status(200).json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            error: 'Token refresh failed',
            message: error.message
        });
    }
});

// Get current user endpoint
router.get('/user', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            const dbUser = await getUserById(decoded.userId);
            
            if (!dbUser) {
                return res.status(401).json({ error: 'User not found' });
            }

            res.status(200).json({
                success: true,
                user: {
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.name,
                    picture: dbUser.profile_picture_url,
                    github_username: dbUser.github_username || null
                }
            });
        } catch (jwtError) {
            return res.status(401).json({ error: 'Invalid token' });
        }

    } catch (error) {
        sendServerError(res, 'User info', error, 'Failed to get user info');
    }
});

// Export user data endpoint (GDPR compliance)
router.get('/export-data', verifyTokenEnhanced, async (req, res) => {
    try {
        const userId = req.user.userId;

        console.log(`Data export requested by user: ${userId}`);

        const exportData = await exportUserData(userId);

        metricsCollector.recordSecurityEvent('data_export', { userId });

        res.status(200).json({
            success: true,
            data: exportData
        });

    } catch (error) {
        sendServerError(res, 'Data export', error, 'Failed to export user data');
    }
});

// Delete user account endpoint (GDPR right to be forgotten)
router.delete('/delete-account', verifyTokenEnhanced, async (req, res) => {
    try {
        const userId = req.user.userId;

        console.log(`Account deletion requested by user: ${userId}`);

        const result = await deleteUserAccount(userId);

        metricsCollector.recordSecurityEvent('account_deletion', { userId });

        res.status(200).json({
            success: true,
            message: 'Account successfully deleted',
            deletedAt: result.deletedAt
        });

    } catch (error) {
        sendServerError(res, 'Account deletion', error, 'Failed to delete account');
    }
});

module.exports = router;