// File: routes/github.js - GitHub OAuth and API endpoints
const express = require('express');
const { Octokit } = require('@octokit/rest');
const { createOrUpdateUser, getUserById } = require('../database/services');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs').promises;

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
    // Remove CSP headers for OAuth redirect
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    console.log('GitHub auth route hit');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    const { userId, returnUrl } = req.query; // Get user ID and return URL
    
    if (!userId) {
        console.log('No userId in query params');
        return res.status(400).json({ error: 'User ID is required in query parameter' });
    }
    
    console.log('User ID found:', userId);
    console.log('Return URL:', returnUrl);
    
    const scope = 'repo,user:email,write:repo_hook';
    // Encode return URL in state parameter along with user ID
    const state = JSON.stringify({ userId, returnUrl: returnUrl || '/github-debug' });
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=${scope}&state=${encodeURIComponent(state)}`;
    
    console.log('Redirecting to GitHub:', authUrl);
    res.redirect(authUrl);
});

// GitHub OAuth callback
router.get('/callback', async (req, res) => {
    // Remove CSP headers for OAuth callback
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
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

        // Parse state parameter and get user ID and return URL
        let userId = null;
        let returnUrl = '/github-debug';
        
        if (state) {
            try {
                const stateData = JSON.parse(decodeURIComponent(state));
                userId = stateData.userId;
                returnUrl = stateData.returnUrl || '/github-debug';
            } catch (error) {
                console.error('Failed to parse state parameter:', error);
                // Fallback to treating state as just userId for backward compatibility
                userId = state;
            }
        }

        // Update user in database with GitHub token and username
        if (userId) {
            const user = await getUserById(userId);
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

        // Redirect to the appropriate frontend page with success message
        res.redirect(`http://localhost:4200${returnUrl}?connected=true`);
    } catch (error) {
        console.error('GitHub OAuth error:', error);
        // Try to get return URL from state for error redirect too
        let errorReturnUrl = '/github-debug';
        if (state) {
            try {
                const stateData = JSON.parse(decodeURIComponent(state));
                errorReturnUrl = stateData.returnUrl || '/github-debug';
            } catch (parseError) {
                // Ignore parse error, use default
            }
        }
        res.redirect(`http://localhost:4200${errorReturnUrl}?error=` + encodeURIComponent(error.message));
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

// Test push CV site to GitHub repository (for debugging)
router.post('/test-push-cv', authenticateUser, async (req, res) => {
    try {
        if (!req.user.github_token) {
            return res.status(401).json({ error: 'GitHub not connected' });
        }

        const { jobId, repoName, private: isPrivate = false } = req.body;

        if (!jobId) {
            return res.status(400).json({ error: 'Job ID is required' });
        }

        // Construct path to generated site files
        const siteDirectory = path.join(__dirname, '..', 'generated', req.user.id, jobId);
        
        // Check if site directory exists
        try {
            await fs.access(siteDirectory);
        } catch (error) {
            return res.status(404).json({ 
                error: `Generated site files not found for job ID: ${jobId}. Please generate your CV first.` 
            });
        }

        // Generate repository name if not provided
        let finalRepoName = repoName;
        if (!finalRepoName) {
            try {
                // Try to read CV data for naming
                const dataFilePath = path.join(siteDirectory, 'data.js');
                const dataContent = await fs.readFile(dataFilePath, 'utf8');
                const jsonMatch = dataContent.match(/const\s+cvData\s*=\s*({[\s\S]*});/);
                if (jsonMatch) {
                    const cvData = JSON.parse(jsonMatch[1]);
                    if (cvData.personalInfo) {
                        const firstName = cvData.personalInfo.firstName || '';
                        const lastName = cvData.personalInfo.lastName || '';
                        if (firstName || lastName) {
                            finalRepoName = `${firstName}-${lastName}`.toLowerCase()
                                .replace(/[^a-z0-9-]/g, '-')
                                .replace(/-+/g, '-')
                                .replace(/^-|-$/g, '') + '-cv-test';
                        }
                    }
                }
            } catch (error) {
                console.log('Could not extract name from CV data:', error.message);
            }
            
            // Fallback name
            if (!finalRepoName) {
                finalRepoName = `cv-test-${Date.now()}`;
            }
        }

        const octokit = new Octokit({ auth: req.user.github_token });

        // Check if repository name already exists
        let attempts = 0;
        let availableRepoName = finalRepoName;
        while (attempts < 10) {
            try {
                await octokit.rest.repos.get({
                    owner: req.user.github_username,
                    repo: availableRepoName
                });
                // Repository exists, try with suffix
                attempts++;
                availableRepoName = `${finalRepoName}-${attempts}`;
            } catch (error) {
                if (error.status === 404) {
                    // Repository doesn't exist, we can use this name
                    break;
                }
                throw error;
            }
        }

        // Create repository
        const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
            name: availableRepoName,
            description: 'Test CV Landing Page - Generated by CV Landing Generator',
            private: Boolean(isPrivate),
            auto_init: false,
            has_issues: false,
            has_projects: false,
            has_wiki: false
        });

        // Upload all site files
        const siteFiles = ['index.html', 'styles.css', 'script.js', 'data.js', 'README.md'];
        const uploadResults = [];

        for (const fileName of siteFiles) {
            const filePath = path.join(siteDirectory, fileName);
            
            try {
                // Check if file exists
                await fs.access(filePath);
                
                // Read file content
                const content = await fs.readFile(filePath, 'utf8');
                
                // Upload to GitHub
                await octokit.rest.repos.createOrUpdateFileContents({
                    owner: req.user.github_username,
                    repo: availableRepoName,
                    path: fileName,
                    message: `Add ${fileName} - Test CV Landing Page`,
                    content: Buffer.from(content).toString('base64')
                });
                
                uploadResults.push({
                    file: fileName,
                    success: true
                });
            } catch (error) {
                console.error(`Failed to upload ${fileName}:`, error.message);
                uploadResults.push({
                    file: fileName,
                    success: false,
                    error: error.message
                });
            }
        }

        // Enable GitHub Pages
        let pagesUrl = null;
        try {
            const { data: pages } = await octokit.rest.repos.createPagesSite({
                owner: req.user.github_username,
                repo: availableRepoName,
                source: {
                    branch: 'main',
                    path: '/'
                }
            });
            pagesUrl = pages.html_url;
        } catch (error) {
            console.error('Failed to enable GitHub Pages:', error.message);
        }

        const successfulUploads = uploadResults.filter(r => r.success).length;
        const failedUploads = uploadResults.filter(r => !r.success).length;

        res.json({
            success: true,
            message: `Test CV site pushed successfully! ${successfulUploads} files uploaded${failedUploads > 0 ? `, ${failedUploads} failed` : ''}.`,
            repository: {
                name: availableRepoName,
                url: repo.html_url,
                clone_url: repo.clone_url
            },
            pages: {
                url: pagesUrl,
                message: pagesUrl ? 'GitHub Pages enabled' : 'GitHub Pages setup failed'
            },
            uploadResults: uploadResults,
            jobId: jobId
        });

    } catch (error) {
        console.error('Test push CV error:', error);
        res.status(500).json({ 
            error: 'Failed to push CV site: ' + error.message 
        });
    }
});

// Check if GitHub Pages site is live
router.post('/check-site-status', authenticateUser, async (req, res) => {
    try {
        const { siteUrl } = req.body;
        
        if (!siteUrl) {
            return res.status(400).json({ error: 'Site URL is required' });
        }

        console.log('Checking site status for:', siteUrl);

        // Try to fetch the site with a timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(siteUrl, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'GitHub-Pages-Status-Checker'
            }
        });

        clearTimeout(timeout);

        if (response.ok) {
            res.json({
                live: true,
                status: response.status,
                message: 'Site is live and accessible'
            });
        } else {
            res.json({
                live: false,
                status: response.status,
                message: `Site returned status ${response.status}`
            });
        }

    } catch (error) {
        console.log('Site not yet accessible:', error.message);
        res.json({
            live: false,
            status: null,
            message: error.message || 'Site not accessible'
        });
    }
});

module.exports = router;