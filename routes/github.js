// File: routes/github.js - GitHub OAuth and API endpoints
const express = require('express');
const { Octokit } = require('@octokit/rest');
const { createOrUpdateUser, getUserById } = require('../database/services');
const jwt = require('jsonwebtoken');

const router = express.Router();

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/github/callback';

// Middleware to verify JWT and extract user
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// GitHub OAuth initiation - modified to work with frontend redirect
router.get('/auth', (req, res) => {
    console.log('GitHub auth route hit');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    const { userId } = req.query; // Get user ID from query parameter instead of JWT
    
    if (!userId) {
        console.log('No userId in query params');
        return res.status(400).json({ error: 'User ID is required in query parameter' });
    }
    
    console.log('User ID found:', userId);
    
    const scope = 'repo,user:email,write:repo_hook';
    const state = userId; // Use user ID as state parameter
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=${scope}&state=${state}`;
    
    console.log('Redirecting to GitHub:', authUrl);
    res.redirect(authUrl);
});

// GitHub OAuth callback
router.get('/callback', async (req, res) => {
    console.log('GitHub callback route hit');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    const { code, state } = req.query;

    if (!code) {
        console.log('No authorization code provided');
        return res.status(400).json({ error: 'Authorization code not provided' });
    }
    
    console.log('Processing OAuth callback with code:', code, 'state:', state);

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'CV-Landing-Generator'
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: GITHUB_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        // Get user info from GitHub
        const octokit = new Octokit({ auth: tokenData.access_token });
        const { data: githubUser } = await octokit.rest.users.getAuthenticated();

        // Update user in database with GitHub token and username
        if (state) {
            const user = await getUserById(state);
            if (user) {
                await createOrUpdateUser({
                    email: user.email,
                    name: user.name,
                    google_id: user.google_id,
                    github_username: githubUser.login,
                    github_token: tokenData.access_token
                });
            }
        }

        // Redirect to frontend debug dashboard with success message
        res.redirect('http://localhost:4200/github-debug?connected=true');
    } catch (error) {
        console.error('GitHub OAuth error:', error);
        res.redirect('http://localhost:4200/github-debug?error=' + encodeURIComponent(error.message));
    }
});

// Check GitHub connection status
router.get('/status', authenticateUser, async (req, res) => {
    console.log('GitHub status check route hit');
    console.log('User:', req.user);
    console.log('GitHub token exists:', !!req.user.github_token);
    console.log('GitHub username:', req.user.github_username);
    
    try {
        if (!req.user.github_token) {
            console.log('No GitHub token found for user');
            return res.json({
                connected: false,
                message: 'GitHub account not connected. Click "Connect to GitHub" to authorize.'
            });
        }

        console.log('Testing GitHub token...');
        // Test the GitHub token
        const octokit = new Octokit({ auth: req.user.github_token });
        const { data: user } = await octokit.rest.users.getAuthenticated();
        console.log('GitHub API response:', user);

        res.json({
            connected: true,
            username: user.login,
            message: `Connected to GitHub as ${user.login}`
        });
    } catch (error) {
        console.error('GitHub status check error:', error);
        
        if (error.status === 401) {
            console.log('GitHub token is invalid or expired');
            return res.json({
                connected: false,
                message: 'GitHub token expired or invalid. Please reconnect.'
            });
        }

        console.log('Other error during status check:', error.message);
        res.status(500).json({
            connected: false,
            message: 'Failed to check GitHub connection: ' + error.message
        });
    }
});

// List user repositories
router.get('/repositories', authenticateUser, async (req, res) => {
    try {
        if (!req.user.github_token) {
            return res.status(401).json({ error: 'GitHub not connected' });
        }

        const octokit = new Octokit({ auth: req.user.github_token });
        const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 50
        });

        // Check which repos have GitHub Pages enabled
        const reposWithPages = await Promise.all(
            repos.map(async (repo) => {
                try {
                    await octokit.rest.repos.getPages({
                        owner: repo.owner.login,
                        repo: repo.name
                    });
                    return { ...repo, has_pages: true };
                } catch (error) {
                    return { ...repo, has_pages: false };
                }
            })
        );

        res.json(reposWithPages);
    } catch (error) {
        console.error('List repositories error:', error);
        res.status(500).json({ error: 'Failed to fetch repositories: ' + error.message });
    }
});

// Create a new repository
router.post('/create-repository', authenticateUser, async (req, res) => {
    try {
        if (!req.user.github_token) {
            return res.status(401).json({ error: 'GitHub not connected' });
        }

        const { name, private: isPrivate, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Repository name is required' });
        }

        const octokit = new Octokit({ auth: req.user.github_token });
        
        const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
            name: name,
            description: description || 'Created via CV Landing Generator',
            private: Boolean(isPrivate),
            auto_init: true
        });

        res.json({
            success: true,
            repository: repo,
            message: `Repository '${name}' created successfully`
        });
    } catch (error) {
        console.error('Create repository error:', error);
        
        if (error.status === 422) {
            return res.status(400).json({ 
                error: 'Repository name already exists or is invalid' 
            });
        }

        res.status(500).json({ 
            error: 'Failed to create repository: ' + error.message 
        });
    }
});

// Upload test files to repository
router.post('/upload-test-files', authenticateUser, async (req, res) => {
    try {
        if (!req.user.github_token) {
            return res.status(401).json({ error: 'GitHub not connected' });
        }

        const { repository } = req.body;

        if (!repository) {
            return res.status(400).json({ error: 'Repository name is required' });
        }

        const octokit = new Octokit({ auth: req.user.github_token });

        // Test HTML content
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CV Landing Page - Test</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 800px;
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin: 2rem;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .header h1 {
            color: #333;
            margin-bottom: 0.5rem;
        }
        .header p {
            color: #666;
            font-size: 1.1rem;
        }
        .section {
            margin-bottom: 2rem;
        }
        .section h2 {
            color: #444;
            border-bottom: 2px solid #667eea;
            padding-bottom: 0.5rem;
        }
        .success-message {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 1rem;
            border-radius: 5px;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-message">
            🎉 GitHub integration test successful! Your CV landing page generator can now publish to GitHub.
        </div>
        
        <div class="header">
            <h1>Test User</h1>
            <p>Full Stack Developer & CV Landing Page Creator</p>
        </div>

        <div class="section">
            <h2>About</h2>
            <p>This is a test CV landing page generated by the CV Landing Generator application. 
               It demonstrates the successful integration with GitHub Pages for hosting your professional CV online.</p>
        </div>

        <div class="section">
            <h2>Features Tested</h2>
            <ul>
                <li>✅ GitHub OAuth authentication</li>
                <li>✅ Repository creation</li>
                <li>✅ File upload to GitHub</li>
                <li>✅ GitHub Pages deployment</li>
            </ul>
        </div>

        <div class="section">
            <h2>Next Steps</h2>
            <p>Now that the GitHub integration is working, you can:</p>
            <ul>
                <li>Upload your real CV and have it processed by AI</li>
                <li>Generate a personalized landing page</li>
                <li>Automatically publish it to your GitHub account</li>
                <li>Share your professional CV with the world!</li>
            </ul>
        </div>
    </div>
</body>
</html>`;

        // Upload the test index.html file
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: req.user.github_username,
            repo: repository,
            path: 'index.html',
            message: 'Add test CV landing page',
            content: Buffer.from(indexHtml).toString('base64')
        });

        res.json({
            success: true,
            message: `Test files uploaded to repository '${repository}'`,
            files: ['index.html']
        });
    } catch (error) {
        console.error('Upload test files error:', error);
        res.status(500).json({ 
            error: 'Failed to upload test files: ' + error.message 
        });
    }
});

// Enable GitHub Pages for repository
router.post('/enable-pages', authenticateUser, async (req, res) => {
    try {
        if (!req.user.github_token) {
            return res.status(401).json({ error: 'GitHub not connected' });
        }

        const { repository } = req.body;

        if (!repository) {
            return res.status(400).json({ error: 'Repository name is required' });
        }

        const octokit = new Octokit({ auth: req.user.github_token });

        try {
            // Try to enable GitHub Pages
            const { data: pages } = await octokit.rest.repos.createPagesSite({
                owner: req.user.github_username,
                repo: repository,
                source: {
                    branch: 'main',
                    path: '/'
                }
            });

            res.json({
                success: true,
                message: `GitHub Pages enabled for repository '${repository}'`,
                pages_url: pages.html_url,
                status: pages.status
            });
        } catch (error) {
            if (error.status === 409) {
                // Pages already enabled, get current status
                const { data: pages } = await octokit.rest.repos.getPages({
                    owner: req.user.github_username,
                    repo: repository
                });

                res.json({
                    success: true,
                    message: `GitHub Pages already enabled for repository '${repository}'`,
                    pages_url: pages.html_url,
                    status: pages.status
                });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Enable GitHub Pages error:', error);
        res.status(500).json({ 
            error: 'Failed to enable GitHub Pages: ' + error.message 
        });
    }
});

module.exports = router;