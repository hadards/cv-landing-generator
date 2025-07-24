// routes/github.js
// Create this file for GitHub OAuth endpoints

const express = require('express');
const router = express.Router();

// Initiate GitHub OAuth flow
router.post('/connect', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        console.log('🔗 GitHub OAuth connect request for user:', userId);

        // Get environment variables
        const clientId = process.env.GITHUB_CLIENT_ID;
        const redirectUri = process.env.GITHUB_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            console.error('❌ Missing GitHub OAuth configuration');
            return res.status(500).json({ 
                error: 'GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_REDIRECT_URI' 
            });
        }

        console.log('✅ GitHub OAuth configuration found:', {
            clientId: clientId.substring(0, 8) + '...',
            redirectUri: redirectUri
        });

        // Generate GitHub OAuth URL
        const state = `user_${userId}_${Date.now()}`; // Include user ID in state
        
        const oauthUrl = `https://github.com/login/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=repo,user:email&` +
            `state=${state}`;

        console.log('✅ Generated OAuth URL for GitHub integration');

        res.status(200).json({ 
            success: true, 
            oauthUrl,
            message: 'GitHub OAuth URL generated'
        });

    } catch (error) {
        console.error('❌ GitHub OAuth connect error:', error);
        res.status(500).json({ 
            error: 'Failed to initiate GitHub OAuth',
            details: error.message 
        });
    }
});

// Handle OAuth callback and store GitHub token
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        console.log('🔄 GitHub OAuth callback received:', { 
            hasCode: !!code, 
            hasState: !!state 
        });

        if (!code || !state) {
            return res.status(400).json({ error: 'Missing OAuth code or state' });
        }

        // Extract user ID from state
        const userIdMatch = state.match(/user_(\d+)_/);
        if (!userIdMatch) {
            return res.status(400).json({ error: 'Invalid OAuth state' });
        }
        const userId = userIdMatch[1];

        console.log('🔄 Processing OAuth for user:', userId);

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(`GitHub OAuth error: ${tokenData.error_description}`);
        }

        console.log('✅ Successfully exchanged code for GitHub token');

        // Get GitHub user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${tokenData.access_token}`,
                'User-Agent': 'CV-Landing-Generator'
            }
        });

        const githubUser = await userResponse.json();

        console.log('✅ GitHub integration successful:', {
            githubUsername: githubUser.login,
            userId: userId,
            tokenReceived: !!tokenData.access_token
        });

        // TODO: Store in database
        console.log('✅ GitHub OAuth completed successfully for user:', userId);
        console.log('   GitHub Username:', githubUser.login);
        console.log('   Token ready to store in database');

        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        res.redirect(`${frontendUrl}?github_connected=true`);

    } catch (error) {
        console.error('❌ GitHub OAuth callback error:', error);
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        res.redirect(`${frontendUrl}?github_error=true`);
    }
});

// Remove GitHub connection
router.post('/disconnect', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        console.log('🔗 GitHub disconnect request for user:', userId);

        // TODO: Remove GitHub credentials from database

        res.status(200).json({ 
            success: true, 
            message: 'GitHub account disconnected'
        });

    } catch (error) {
        console.error('❌ GitHub disconnect error:', error);
        res.status(500).json({ 
            error: 'Failed to disconnect GitHub account',
            details: error.message 
        });
    }
});

// Test endpoint
router.get('/test', async (req, res) => {
    try {
        // Test environment variables
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        const redirectUri = process.env.GITHUB_REDIRECT_URI;

        console.log('🧪 Testing GitHub Integration Setup:');
        console.log('✅ Client ID:', clientId ? `${clientId.substring(0, 8)}...` : '❌ MISSING');
        console.log('✅ Client Secret:', clientSecret ? `${clientSecret.substring(0, 8)}...` : '❌ MISSING');
        console.log('✅ Redirect URI:', redirectUri || '❌ MISSING');

        const result = {
            success: true,
            environment: {
                clientId: clientId ? '✅ Configured' : '❌ Missing GITHUB_CLIENT_ID',
                clientSecret: clientSecret ? '✅ Configured' : '❌ Missing GITHUB_CLIENT_SECRET',
                redirectUri: redirectUri ? '✅ Configured' : '❌ Missing GITHUB_REDIRECT_URI'
            },
            timestamp: new Date().toISOString()
        };

        console.log('✅ GitHub Integration Test Complete:', result);

        res.status(200).json(result);

    } catch (error) {
        console.error('❌ GitHub Integration Test Failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;