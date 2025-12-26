# Getting Started

**Navigation**: [Documentation Home](../README.md) > [Development](local-development.md) > Getting Started

**Last Updated**: December 26, 2025

---

## Overview

This guide will help you set up the CV Landing Generator project on your local machine in approximately **30 minutes**. By the end, you'll have both the backend API and frontend application running.

---

## Prerequisites

### Required Software

Install the following before starting:

| Software | Version | Purpose | Download |
|----------|---------|---------|----------|
| **Node.js** | 18.x or 20.x | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x or higher | Package manager | Included with Node.js |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/) |
| **PostgreSQL** | 14.x or higher | Database (or use Supabase) | [postgresql.org](https://www.postgresql.org/) |
| **Code Editor** | Any | VSCode recommended | [code.visualstudio.com](https://code.visualstudio.com/) |

### Optional Software

| Software | Purpose |
|----------|---------|
| **Postman** or **Insomnia** | API testing |
| **pgAdmin** | Database management (if using local PostgreSQL) |

### Verify Installation

```bash
# Check Node.js version
node --version
# Expected: v18.x.x or v20.x.x

# Check npm version
npm --version
# Expected: 9.x.x or higher

# Check Git version
git --version
# Expected: git version 2.x.x
```

---

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-repo/cv-landing-generator.git

# Navigate to project directory
cd cv-landing-generator

# Check project structure
ls -la
# Expected: .env, server/, frontend/, database/, package.json, etc.
```

**Project Structure**:
```
cv-landing-generator/
├── .env                    # Environment configuration
├── package.json           # Backend dependencies
├── server/                # Backend (Express.js)
│   ├── server.js         # Main entry point
│   ├── routes/           # API routes
│   ├── lib/              # Business logic
│   ├── database/         # Database utilities
│   ├── middleware/       # Express middleware
│   ├── templates/        # Landing page templates
│   ├── uploads/          # Temporary CV uploads
│   └── generated/        # Generated landing pages
├── frontend/              # Frontend (Angular)
│   ├── src/
│   │   ├── app/
│   │   ├── assets/
│   │   └── environments/
│   ├── package.json      # Frontend dependencies
│   └── angular.json      # Angular configuration
├── database/             # Database schema
│   └── DATABASE_COMPLETE.sql
├── docs/                 # Documentation (you are here!)
└── README.md             # Project README
```

---

## Step 2: Install Dependencies

### Backend Dependencies

```bash
# From project root directory
npm install
```

**What gets installed**:
- **Express.js**: Web server framework
- **Multer**: File upload handling
- **JWT**: Authentication tokens
- **PostgreSQL (pg)**: Database client
- **Gemini AI SDK**: AI-powered CV processing
- **Archiver**: ZIP file creation
- **pdf-parse**: PDF text extraction
- **mammoth**: DOC/DOCX text extraction
- **And more...**

**Installation time**: 2-3 minutes

**Expected output**:
```
added 234 packages, and audited 235 packages in 2m
found 0 vulnerabilities
```

### Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install Angular dependencies
npm install

# Return to project root
cd ..
```

**What gets installed**:
- **Angular 20**: Frontend framework
- **Tailwind CSS**: Styling framework
- **RxJS**: Reactive programming
- **Angular Router**: Routing
- **HttpClient**: API communication
- **And more...**

**Installation time**: 3-5 minutes

---

## Step 3: Set Up Environment Variables

### Copy Environment Template

```bash
# Copy the .env file (it already exists in this project)
# If you need a fresh copy:
cp .env .env.backup
```

### Required Configuration

Open `.env` file and configure the following:

#### 1. Google OAuth (Required for Authentication)

**Get credentials**: [Google Cloud Console](https://console.cloud.google.com/)

1. Create a new project or select existing
2. Enable **Google+ API**
3. Create **OAuth 2.0 Client ID** credentials
4. Set authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Copy Client ID and Secret

```bash
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret-here
```

#### 2. Gemini AI (Required for CV Processing)

**Get API key**: [Google AI Studio](https://makersuite.google.com/app/apikey)

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

**Note**: Free tier includes 60 requests per minute, 100,000 tokens per month

#### 3. Database (Required)

**Option A: Supabase (Recommended for beginners)**

1. Create account at [supabase.com](https://supabase.com/)
2. Create new project
3. Get connection string from Settings > Database
4. Update `.env`:

```bash
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

**Option B: Local PostgreSQL**

```bash
DATABASE_URL=postgresql://localhost:5432/cv_landing_generator
```

Then create the database:
```bash
createdb cv_landing_generator
```

#### 4. JWT Secret (Required for Authentication)

Generate a random secret:

```bash
# Linux/Mac
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Windows PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to `.env`:

```bash
JWT_SECRET=generated-random-string-here
```

#### 5. Encryption Key (Required for GitHub Tokens)

Generate another random key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
ENCRYPTION_KEY=another-generated-random-string-here
```

#### 6. GitHub OAuth (Optional - for publishing feature)

**Get credentials**: [GitHub Developer Settings](https://github.com/settings/developers)

1. Create new OAuth App
2. Set Homepage URL: `http://localhost:3000`
3. Set Authorization callback URL: `http://localhost:3000/api/github/callback`
4. Copy Client ID and Secret

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback
```

### Complete .env File Example

```bash
# Environment
NODE_ENV=development
PORT=3000

# LLM Configuration
LLM_CLIENT_TYPE=gemini

# Google OAuth
GOOGLE_CLIENT_ID=123456-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Security
ENCRYPTION_KEY=abc123...  # 64 characters
JWT_SECRET=def456...      # 64 characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
MAX_SESSIONS_PER_USER=5
SESSION_TIMEOUT_MS=86400000

# Gemini AI
GEMINI_API_KEY=AIzaSy...

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/cv_landing_generator
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=60000
DATABASE_CONNECTION_TIMEOUT=5000
DATABASE_ACQUIRE_TIMEOUT=10000

# GitHub Integration (Optional)
GITHUB_CLIENT_ID=Ov23ct...
GITHUB_CLIENT_SECRET=1b8449...
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback

# URLs
FRONTEND_URL=http://localhost:4200
API_URL=http://localhost:3000

# CORS
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Cleanup
UPLOADS_MAX_AGE_HOURS=24
UPLOADS_MAX_FILES=1000
UPLOADS_CLEANUP_INTERVAL_HOURS=4
GENERATED_MAX_AGE_HOURS=720
GENERATED_MAX_FILES=500
GENERATED_CLEANUP_INTERVAL_HOURS=12
ORPHANED_CHECK_INTERVAL_HOURS=24
```

---

## Step 4: Set Up Database

### Run Database Schema

#### Supabase:

1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to SQL Editor
3. Copy contents of `database/DATABASE_COMPLETE.sql`
4. Paste and click "Run"
5. Verify tables created (should see 11 tables)

#### Local PostgreSQL:

```bash
# Run schema file
psql -U postgres -d cv_landing_generator -f database/DATABASE_COMPLETE.sql

# Verify tables created
psql -U postgres -d cv_landing_generator -c "\dt"
```

### Verify Database Setup

```bash
# Test connection (backend must be running)
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-12-26T10:30:00Z"
}
```

---

## Step 5: Start the Application

### Option A: Start Both Backend and Frontend Together (Recommended)

```bash
# From project root
npm run dev
```

This runs both servers concurrently:
- Backend: http://localhost:3000
- Frontend: http://localhost:4200

**Expected output**:
```
[backend] CV Landing Generator API Server
[backend] Server: http://localhost:3000
[backend] Health: http://localhost:3000/api/health
[backend] Database connection verified
[frontend] Angular Live Development Server is listening on localhost:4200
[frontend] Compiled successfully.
```

### Option B: Start Backend and Frontend Separately

**Terminal 1 - Backend**:
```bash
npm run dev:api
```

**Terminal 2 - Frontend**:
```bash
npm run dev:frontend
```

### Verify Application is Running

1. **Backend Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Frontend**:
   - Open browser to http://localhost:4200
   - You should see the homepage with "Sign in with Google" button

3. **Database Connection**:
   - Check backend logs for "Database connection verified"

---

## Step 6: Test the Application

### Test Authentication

1. Go to http://localhost:4200
2. Click "Sign in with Google"
3. Sign in with your Google account
4. You should be redirected to the dashboard

### Test CV Upload and Processing

1. From dashboard, click "Upload CV"
2. Select a PDF, DOC, or DOCX CV file (max 10MB)
3. Click "Upload"
4. Click "Process CV"
5. Review extracted text preview
6. Click "Generate Landing Page"
7. Wait 10-20 seconds for AI processing
8. Preview the generated landing page
9. Download the ZIP file

### Test GitHub Publishing (Optional)

1. From dashboard, click "Connect GitHub"
2. Authorize the application
3. Select a generated landing page
4. Click "Publish to GitHub"
5. Repository should be created at `github.com/your-username/cv-landing-page`

---

## Troubleshooting

### Backend Won't Start

**Error**: `Missing required environment variables`

**Solution**: Check `.env` file has all required variables:
```bash
grep -E "GOOGLE_CLIENT_ID|JWT_SECRET|DATABASE_URL|GEMINI_API_KEY" .env
```

---

**Error**: `Database connection failed`

**Solution**:
1. Verify DATABASE_URL is correct
2. Check database is running (Supabase or local PostgreSQL)
3. Run schema file if tables don't exist

---

**Error**: `Port 3000 already in use`

**Solution**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

Or change port in `.env`:
```bash
PORT=3001
```

---

### Frontend Won't Start

**Error**: `Cannot find module '@angular/...'`

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
npm run dev:frontend
```

---

**Error**: `Port 4200 already in use`

**Solution**: Kill the process or use different port:
```bash
cd frontend
ng serve --port 4201
```

---

### CV Processing Fails

**Error**: `Gemini API key invalid`

**Solution**: Verify API key at [Google AI Studio](https://makersuite.google.com/app/apikey)

---

**Error**: `Daily limit exceeded`

**Solution**: Free tier limits to 50 CVs per day. Wait 24 hours or upgrade Gemini API plan.

---

**Error**: `Failed to extract text from PDF`

**Solution**:
1. Verify file is valid PDF (not corrupted)
2. Try different PDF (some PDFs are image-only, no text)
3. Check backend logs for detailed error

---

### Google OAuth Fails

**Error**: `Redirect URI mismatch`

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Edit OAuth client
3. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`

---

**Error**: `Access blocked: This app is not verified`

**Solution**:
1. Click "Advanced" → "Go to app (unsafe)"
2. Or add your email to test users in Google Cloud Console

---

## Development Tools

### Recommended VSCode Extensions

- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Angular Language Service**: Angular intellisense
- **REST Client**: Test API endpoints
- **PostgreSQL**: Database management

### Backend Testing

```bash
# Test LLM client (Gemini or Ollama)
npm run test:llm

# Test Gemini API specifically
npm run test:gemini
```

### Frontend Testing

```bash
cd frontend
npm test
```

---

## Next Steps

Now that you have the application running:

1. **Explore the Code**:
   - [Architecture Overview](../architecture/overview.md)
   - [Backend Architecture](../architecture/backend.md)
   - [Frontend Architecture](../architecture/frontend.md)

2. **Understand Data Flows**:
   - [CV Processing Flow](../diagrams/data-flow-cv-processing.md)
   - [Authentication Flow](../diagrams/data-flow-authentication.md)

3. **Learn About Features**:
   - [CV Processing](../features/cv-processing.md)
   - [File Cleanup](../features/file-cleanup.md)
   - [Session Management](../features/session-management.md)

4. **API Documentation**:
   - [API Overview](../api/overview.md)
   - [CV Endpoints](../api/cv-endpoints.md)
   - [Auth Endpoints](../api/auth-endpoints.md)

5. **Development Guides**:
   - [Local Development](local-development.md)
   - [Testing](testing.md)
   - [Debugging](debugging.md)

---

## Quick Reference Commands

```bash
# Install dependencies
npm install && cd frontend && npm install && cd ..

# Start both servers
npm run dev

# Start backend only
npm run dev:api

# Start frontend only
npm run dev:frontend

# Test LLM client
npm run test:llm

# Build frontend for production
cd frontend && ng build

# Run database schema
psql -U postgres -d cv_landing_generator -f database/DATABASE_COMPLETE.sql
```

---

## Common Development Workflow

1. **Start application**: `npm run dev`
2. **Make code changes** in backend (`server/`) or frontend (`frontend/src/`)
3. **Backend auto-reloads** with nodemon
4. **Frontend auto-recompiles** with Angular CLI
5. **Test changes** in browser at http://localhost:4200
6. **Check logs** in terminal for errors
7. **Commit changes**: `git add . && git commit -m "Description"`

---

## Getting Help

- **Documentation**: Browse other docs in this folder
- **FAQ**: [Frequently Asked Questions](../FAQ.md)
- **Troubleshooting**: [Deployment Troubleshooting](../deployment/troubleshooting.md)
- **Code Reference**: [Backend Files](../code/backend-files.md), [Frontend Files](../code/frontend-files.md)

---

**Congratulations!** You now have a fully functional local development environment for the CV Landing Generator. Happy coding!
