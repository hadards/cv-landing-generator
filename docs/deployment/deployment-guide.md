# Deployment Guide

**Last Updated**: December 27, 2025

This guide covers deploying CV Landing Generator to production. We'll explore different hosting platforms and provide detailed setup instructions for the recommended free-tier deployment.

---

## Table of Contents

1. [Platform Comparison](#platform-comparison)
2. [Recommended Setup: Render Free Tier](#recommended-setup-render-free-tier)
3. [Alternative Platforms](#alternative-platforms)
4. [Pre-Deployment Checklist](#pre-deployment-checklist)
5. [Troubleshooting](#troubleshooting)

---

## Platform Comparison

### Overview

Your application stack includes:
- Node.js/Express backend with file uploads (up to 50MB)
- Angular 20 frontend
- PostgreSQL database (Supabase)
- Long-running AI processing (Gemini API)
- OAuth integrations (Google, GitHub)

Here's how different platforms handle this stack:

### Render (Recommended for First Deployment)

**Pros:**
- ✅ Completely free tier (750 hours/month)
- ✅ Zero refactoring required - deploy as-is
- ✅ No request size limits
- ✅ No execution time limits
- ✅ Auto-deploy from GitHub
- ✅ Easy environment variable management
- ✅ Built-in SSL/HTTPS

**Cons:**
- ❌ Service sleeps after 15 minutes of inactivity
- ❌ Cold start takes 30-60 seconds on first request after sleep
- ❌ Only one free web service per account

**Best for:** First deployment, low-traffic apps, development/testing

### Railway

**Pros:**
- ✅ No sleep/cold starts
- ✅ No request size or time limits
- ✅ Simple GitHub integration
- ✅ Great developer experience

**Cons:**
- ❌ Not truly free - $5/month credits, then pay-as-you-go
- ❌ Typical cost: $5-15/month after credits

**Best for:** Production apps with consistent traffic, when you have budget

### Cloudflare Workers + Pages

**Pros:**
- ✅ Truly free tier (100k requests/day)
- ✅ No cold starts - globally distributed
- ✅ Excellent performance
- ✅ Free R2 storage (10GB)
- ✅ Free Pages hosting (unlimited)

**Cons:**
- ❌ Requires significant refactoring
- ❌ Workers have 25MB request body limit (your app supports 50MB)
- ❌ 30-second maximum execution time
- ❌ Need to migrate file storage to R2
- ❌ More complex architecture

**Best for:** High-traffic apps, when performance matters, after you're validated

### Vercel

**Pros:**
- ✅ Free tier available
- ✅ Excellent for frontend hosting
- ✅ Auto-deploy from GitHub

**Cons:**
- ❌ Serverless functions have 10-second timeout (free tier)
- ❌ Not ideal for long-running AI processing
- ❌ Better suited for API routes, not full Express apps

**Best for:** JAMstack apps, when you separate frontend/backend

### Heroku

**Pros:**
- ✅ Simple deployment
- ✅ Mature platform

**Cons:**
- ❌ No longer has a free tier (starts at $5/month per dyno)

**Best for:** When you have budget and want simplicity

---

## Recommended Setup: Render Free Tier

This is the simplest path to get your app live with zero refactoring.

### Architecture

```
User Browser
    ↓
Render Web Service (Node.js/Express)
├── Serves Angular frontend (static files)
├── API endpoints (/api/*)
├── File uploads to ephemeral storage
└── Connects to Supabase PostgreSQL

External Services:
├── Supabase (PostgreSQL database)
├── Google OAuth
├── GitHub OAuth
└── Gemini AI API
```

### Step 1: Code Changes

You'll need to make minimal changes to support production deployment.

#### 1.1 Update package.json

Add these scripts to your root `package.json`:

```json
{
  "scripts": {
    "start": "node server/server.js",
    "build": "cd frontend && npm install && ng build",
    "postinstall": "npm run build"
  }
}
```

**What this does:**
- `start`: Production start command (Render runs this)
- `build`: Builds Angular to static files
- `postinstall`: Automatically runs build after npm install

#### 1.2 Update server/server.js

Add static file serving for production. Add this code **after all your API routes** but **before app.listen()**:

```javascript
// Serve Angular static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../frontend/dist/cv-landing-generator/browser');

    app.use(express.static(frontendPath));

    // Send all non-API requests to Angular
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}
```

**Important:** Make sure this comes **after** all `/api/*` routes so API requests aren't caught by the wildcard.

#### 1.3 Update CORS Configuration

In `server/server.js`, update your CORS configuration to include your Render URL:

```javascript
const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'https://your-app-name.onrender.com'
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
```

#### 1.4 Update Frontend API URL

Update `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
    production: true,
    apiUrl: '' // Empty string uses same domain (relative URLs)
};
```

Update your API service to use this:

```typescript
// In your API service
import { environment } from '../../environments/environment';

const API_BASE = environment.apiUrl || '';

// Use relative URLs
fetch(`${API_BASE}/api/auth/me`)
```

#### 1.5 Update OAuth Redirect URIs

You'll need to update redirect URIs in:

**Google OAuth Console:**
- Add `https://your-app-name.onrender.com` to Authorized JavaScript origins
- Add `https://your-app-name.onrender.com/api/auth/google/callback` to Authorized redirect URIs

**GitHub OAuth App:**
- Set Homepage URL: `https://your-app-name.onrender.com`
- Set Authorization callback URL: `https://your-app-name.onrender.com/api/github/callback`

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

### Step 3: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:

**Basic Settings:**
- Name: `cv-landing-generator` (or your preferred name)
- Region: Choose closest to your users
- Branch: `main` (or your default branch)
- Root Directory: (leave empty)
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

**Instance Type:**
- Select "Free"

### Step 4: Environment Variables

Add all your environment variables from `.env`:

**Required Variables:**

```bash
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=your_supabase_database_url

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
LLM_CLIENT_TYPE=gemini

# Frontend URL (for CORS)
FRONTEND_URL=https://your-app-name.onrender.com
```

**How to add them in Render:**
1. In your service dashboard, go to "Environment" tab
2. Click "Add Environment Variable"
3. Add each variable one by one
4. Click "Save Changes"

### Step 5: Deploy

1. Click "Create Web Service"
2. Render will:
   - Clone your repository
   - Run `npm install` (which triggers `postinstall` → builds frontend)
   - Run `npm start` to start the server
3. Watch the logs for any errors
4. Once deployed, you'll get a URL like `https://cv-landing-generator-abc123.onrender.com`

### Step 6: Test Your Deployment

1. Visit your Render URL
2. Test the full flow:
   - ✅ Frontend loads
   - ✅ Google OAuth login works
   - ✅ Upload CV file
   - ✅ Process CV with AI
   - ✅ Generate landing page
   - ✅ Download ZIP
   - ✅ GitHub publishing (if configured)

### Step 7: Enable Auto-Deploy

In your Render service settings:
1. Go to "Settings" tab
2. Find "Auto-Deploy" section
3. Enable "Auto-Deploy" for your branch
4. Now every push to `main` automatically deploys

---

## Alternative Platforms

### Deploying to Railway

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables
6. Railway auto-detects Node.js and deploys

**Note:** Same code changes as Render apply.

### Deploying to Cloudflare (Advanced)

Requires significant refactoring. High-level steps:

**Changes needed:**
1. Refactor file uploads to use Cloudflare R2
2. Split long-running AI processing into async jobs
3. Create Cloudflare Worker for API
4. Deploy Angular to Cloudflare Pages
5. Update request handling for 25MB limit

**When to consider:**
- After validating your app works
- When you need global performance
- When traffic exceeds free tiers elsewhere

Not recommended for first deployment.

---

## Pre-Deployment Checklist

Before deploying, ensure:

### Code
- [ ] All code changes from Step 1 are committed
- [ ] Frontend builds successfully locally: `cd frontend && ng build`
- [ ] Backend starts successfully: `node server/server.js`
- [ ] No hardcoded secrets in code
- [ ] `.env` is in `.gitignore`

### Database
- [ ] Supabase database is set up
- [ ] Schema from `database/DATABASE_COMPLETE.sql` is applied
- [ ] Database connection works from local environment
- [ ] Database URL is secured (not public)

### OAuth Setup
- [ ] Google OAuth credentials created
- [ ] GitHub OAuth app created
- [ ] Redirect URIs updated with production domain
- [ ] Test OAuth flow locally first

### Environment Variables
- [ ] All required variables are documented
- [ ] JWT_SECRET is strong (minimum 32 characters)
- [ ] ENCRYPTION_KEY is 32 characters
- [ ] No `.env` file in repository

### Testing
- [ ] Full CV processing flow tested locally
- [ ] Authentication tested locally
- [ ] File upload/download tested locally
- [ ] GitHub publishing tested locally (if using)

---

## Troubleshooting

### Service Won't Start

**Check logs in Render dashboard:**

**Error: Missing environment variable**
- Solution: Add missing variable in Render environment settings

**Error: Cannot connect to database**
- Solution: Check DATABASE_URL is correct, Supabase allows connections from Render IPs

**Error: Port already in use**
- Solution: Ensure you're using `process.env.PORT` in server.js

### Frontend Not Loading

**Blank page or 404:**
- Check that frontend built successfully in deploy logs
- Verify static file serving code is after API routes
- Check browser console for errors
- Ensure `NODE_ENV=production` is set

**API calls failing:**
- Check CORS configuration includes Render URL
- Verify API routes use `/api/*` prefix
- Check browser network tab for errors

### OAuth Not Working

**Google OAuth fails:**
- Verify redirect URI in Google Console matches exactly
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
- Ensure HTTPS is enabled (Render provides this automatically)

**GitHub OAuth fails:**
- Update GitHub OAuth app callback URL
- Check GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET

### File Upload Fails

**413 Payload Too Large:**
- Render free tier should handle 50MB
- Check your Express middleware: `app.use(express.json({ limit: '50mb' }))`

**Files disappearing:**
- This is expected on Render free tier (ephemeral storage)
- Files are cleaned up after processing (by design)
- On service restart, all files are lost (this is fine for your cleanup strategy)

### Cold Starts (Render Free Tier)

**First request takes 30-60 seconds:**
- This is normal behavior for Render free tier
- Service sleeps after 15 minutes of inactivity
- Solutions:
  - Upgrade to paid tier ($7/month)
  - Use a ping service (e.g., UptimeRobot) to keep it awake
  - Accept the cold start (fine for low-traffic apps)

### AI Processing Timeout

**Gemini API calls timing out:**
- Check GEMINI_API_KEY is correct
- Verify you're not hitting rate limits
- Check Gemini API quota in Google Cloud Console
- Ensure network can reach Gemini API

### Database Connection Issues

**Connection timeout:**
- Verify Supabase allows connections from Render
- Check DATABASE_URL format is correct
- Ensure database is not paused (Supabase free tier)

---

## Monitoring Your Deployment

### Render Dashboard

**Metrics available:**
- CPU usage
- Memory usage
- Request count
- Response times
- Error rates

**Logs:**
- Real-time log streaming
- Search and filter logs
- Download logs

### Health Checks

Your app includes a health endpoint: `/api/health`

**Use it to monitor:**
- Database connectivity
- Service uptime
- Memory usage

**Set up external monitoring:**
- UptimeRobot (free)
- Pingdom
- StatusCake

---

## Cost Optimization

### Render Free Tier Limits

**What you get:**
- 750 hours/month (one service running 24/7)
- Sleeps after 15 minutes inactivity
- Shared CPU/RAM

**Staying within limits:**
- Only one web service per account
- Accept cold starts
- Clean up old deployments

### When to Upgrade

Consider paid tier ($7/month) when:
- You need 24/7 uptime without cold starts
- You need better performance
- You're getting consistent traffic
- Cold starts hurt user experience

---

## Next Steps

After successful deployment:

1. **Set up monitoring**
   - Add UptimeRobot to check service health
   - Monitor error logs in Render dashboard

2. **Configure domain (optional)**
   - Buy a custom domain
   - Add to Render service settings
   - Update OAuth redirect URIs

3. **Enable analytics**
   - Add Google Analytics (optional)
   - Track user behavior

4. **Set up CI/CD**
   - Auto-deploy is already enabled
   - Consider adding tests before deploy

5. **Backup strategy**
   - Supabase handles database backups
   - Code is in GitHub
   - No need to backup ephemeral files

---

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Angular Deployment Guide](https://angular.dev/tools/cli/deployment)
- [Express Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**Need help?** Check [Troubleshooting](#troubleshooting) or open an issue on GitHub.
