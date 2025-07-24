// routes/sites.js
const express = require('express');
const router = express.Router();

// List user's sites - GET /api/sites/list
router.get('/list', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        console.log('📋 Sites list request for user:', userId);

        // Check if user has GitHub connection stored in memory
        let hasGitHubConnection = false;
        let githubUsername = null;
        
        if (global.githubTokens && global.githubTokens[userId]) {
            hasGitHubConnection = true;
            githubUsername = global.githubTokens[userId].username;
            console.log('✅ GitHub connection found in memory for user:', userId, 'username:', githubUsername);
        } else {
            console.log('❌ No GitHub connection found in memory for user:', userId);
            console.log('   Available tokens:', global.githubTokens ? Object.keys(global.githubTokens) : 'none');
        }

        // Get user's sites from database (placeholder for now)
        let sites = [];
        
        // TODO: Implement database query
        // try {
        //     const database = require('../lib/database');
        //     sites = await database.getUserSites(userId);
        // } catch (dbError) {
        //     console.log('⚠️ Database not available:', dbError.message);
        // }

        const result = {
            success: true,
            userId: userId,
            sites: sites,
            sitesCount: sites.length,
            hasGitHubConnection: hasGitHubConnection,
            // Debug info
            debug: {
                hasGlobalGithubTokens: !!global.githubTokens,
                availableTokenUsers: global.githubTokens ? Object.keys(global.githubTokens) : [],
                userTokenExists: !!(global.githubTokens && global.githubTokens[userId]),
                githubUsername: githubUsername
            }
        };

        console.log('✅ Sites list retrieved:', {
            userId: userId,
            sitesCount: sites.length,
            hasGitHubConnection: hasGitHubConnection,
            githubUsername: githubUsername || 'none'
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Sites list error:', error);
        res.status(500).json({
            error: 'Failed to retrieve sites',
            details: error.message
        });
    }
});

// Create new site - POST /api/sites/create
router.post('/create', async (req, res) => {
    try {
        const { userId, siteName, cvData } = req.body;

        if (!userId || !siteName || !cvData) {
            return res.status(400).json({ error: 'User ID, site name, and CV data required' });
        }

        console.log('🚀 Creating new site for user:', userId, 'with name:', siteName);

        // Check if user has GitHub connection
        if (!global.githubTokens || !global.githubTokens[userId]) {
            return res.status(400).json({ error: 'GitHub connection required' });
        }

        // TODO: Implement site creation logic
        res.json({
            success: true,
            message: 'Site creation endpoint - implementation pending',
            siteName: siteName,
            userId: userId
        });

    } catch (error) {
        console.error('❌ Site creation error:', error);
        res.status(500).json({
            error: 'Failed to create site',
            details: error.message
        });
    }
});

module.exports = router;