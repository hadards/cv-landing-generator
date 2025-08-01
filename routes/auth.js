// File: routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { createOrUpdateUser, getUserById } = require('../database/services');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        // Development mode: allow mock credential for testing
        if (process.env.NODE_ENV === 'development' && credential === 'mock_google_jwt_token_for_testing') {
            // Create or get real database user for testing
            const dbUser = await createOrUpdateUser({
                email: 'test@example.com',
                name: 'Test User',
                google_id: 'test_google_123'
            });

            const user = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                picture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGVzdCBVc2VyPC90ZXh0Pgo8L3N2Zz4K',
                verified: true
            };

            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                success: true,
                user: user,
                token: token,
                message: 'Development login successful'
            });
        }

        // Verify Google JWT token
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            
            if (!payload) {
                return res.status(400).json({ error: 'Invalid Google token' });
            }

            // Create or update user in database
            const dbUser = await createOrUpdateUser({
                email: payload.email,
                name: payload.name,
                google_id: payload.sub
            });

            const user = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                picture: payload.picture,
                verified: payload.email_verified
            };

            const token = jwt.sign(
                { userId: dbUser.id, email: dbUser.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(200).json({
                success: true,
                user: user,
                token: token,
                message: 'Login successful'
            });
        } catch (googleError) {
            console.error('Google token verification failed:', googleError);
            res.status(400).json({ error: 'Invalid Google credential' });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
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
                    picture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGVzdCBVc2VyPC90ZXh0Pgo8L3N2Zz4K'
                }
            });
        } catch (jwtError) {
            return res.status(401).json({ error: 'Invalid token' });
        }

    } catch (error) {
        console.error('User info error:', error);
        res.status(500).json({
            error: 'Failed to get user info',
            message: error.message
        });
    }
});

module.exports = router;