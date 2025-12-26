# CV Landing Generator - Technical Documentation

**Last Updated**: December 26, 2025

Welcome to the comprehensive technical documentation for the CV Landing Generator. This documentation is designed to help new engineers understand, maintain, and extend the application.

---

## Quick Navigation

### Getting Started
- [Development Setup Guide](development/getting-started.md) - Set up your local environment in 30 minutes
- [Local Development](development/local-development.md) - Running backend and frontend locally
- [Environment Variables](deployment/environment-variables.md) - Complete list of configuration options

### Architecture
- [Architecture Overview](architecture/overview.md) - High-level system design and components
- [Backend Architecture](architecture/backend.md) - Express server, middleware, routes
- [Frontend Architecture](architecture/frontend.md) - Angular components and services
- [Database Architecture](architecture/database.md) - PostgreSQL schema and relationships
- [Data Flow Diagrams](architecture/data-flow.md) - How data moves through the system
- [File Storage System](architecture/file-storage.md) - Ephemeral vs persistent storage
- [Third-Party Integrations](architecture/third-party-integrations.md) - Google, GitHub, Gemini AI, Supabase

### Features
- [Authentication](features/authentication.md) - Google OAuth and JWT sessions
- [CV Processing Pipeline](features/cv-processing.md) - Upload → Extract → AI → Generate
- [Queue System](features/queue-system.md) - Single-job queue with position tracking
- [Landing Page Generation](features/landing-page-generation.md) - Template processing
- [GitHub Publishing](features/github-publishing.md) - OAuth and Pages deployment
- [File Cleanup](features/file-cleanup.md) - Automated cleanup strategies
- [Session Management](features/session-management.md) - Multi-device login support
- [Rate Limiting](features/rate-limiting.md) - IP-based and per-user limits

### API Reference
- [API Overview](api/overview.md) - Conventions, authentication, error handling
- [Auth Endpoints](api/auth-endpoints.md) - `/api/auth/*` with examples
- [CV Endpoints](api/cv-endpoints.md) - `/api/cv/*` with examples
- [GitHub Endpoints](api/github-endpoints.md) - `/api/github/*` with examples
- [Session Endpoints](api/session-endpoints.md) - `/api/session/*` with examples
- [Legal Endpoints](api/legal-endpoints.md) - `/api/legal/*` with examples
- [Health Endpoints](api/health-endpoints.md) - `/api/health/*` with examples

### Database
- [Database Schema](database/schema.md) - All 11 tables with field descriptions
- [Table Relationships](database/relationships.md) - Foreign keys and CASCADE rules
- [Database Indexes](database/indexes.md) - All 33 indexes explained
- [Database Functions](database/functions.md) - Cleanup and maintenance functions
- [Data Retention](database/data-retention.md) - What's kept and what's deleted
- [Common Queries](database/queries.md) - Query patterns and examples

### Security
- [Authentication Security](security/authentication.md) - OAuth, JWT, session tracking
- [Authorization](security/authorization.md) - Resource ownership verification
- [Rate Limiting](security/rate-limiting.md) - Global and per-user limits
- [Input Validation](security/input-validation.md) - File validation and sanitization
- [Encryption](security/encryption.md) - GitHub tokens and database SSL
- [CSRF Protection](security/csrf-protection.md) - Token generation and verification
- [Compliance](security/compliance.md) - GDPR, data export, account deletion

### Development
- [Getting Started](development/getting-started.md) - Environment setup
- [Local Development](development/local-development.md) - Running the app locally
- [Testing Strategy](development/testing.md) - LLM testing and test patterns
- [Debugging Guide](development/debugging.md) - Common issues and solutions
- [Code Style Guide](development/code-style.md) - Conventions and patterns
- [Contributing](development/contributing.md) - Git workflow and PR process

### Deployment
- [Production Checklist](deployment/production-checklist.md) - Pre-deployment verification
- [Environment Variables](deployment/environment-variables.md) - All env vars explained
- [Database Setup](deployment/database-setup.md) - Running schema migrations
- [Hosting Platforms](deployment/hosting-platforms.md) - Render, Heroku, Vercel
- [Monitoring](deployment/monitoring.md) - Health checks and metrics
- [Troubleshooting](deployment/troubleshooting.md) - Common production issues

### Code Reference
- [Backend Files](code/backend-files.md) - All backend files with purposes
- [Frontend Files](code/frontend-files.md) - All frontend files with purposes
- [Middleware Chain](code/middleware-chain.md) - Request processing pipeline
- [Utility Modules](code/utility-modules.md) - Encryption, sanitization, paths
- [Constants](code/constants.md) - Application constants explained

### Visual Diagrams
- [Architecture Diagram](diagrams/architecture-overview.md) - System components
- [CV Processing Flow](diagrams/data-flow-cv-processing.md) - Upload to download
- [Authentication Flow](diagrams/data-flow-authentication.md) - Login and sessions
- [GitHub Publishing Flow](diagrams/data-flow-github-publishing.md) - OAuth to deployment
- [Database ERD](diagrams/database-erd.md) - Entity relationship diagram
- [Middleware Pipeline](diagrams/middleware-chain.md) - Request processing
- [File Lifecycle](diagrams/file-lifecycle.md) - Upload and cleanup

### Additional Resources
- [Searchable Index](INDEX.md) - Find topics quickly
- [Glossary](GLOSSARY.md) - Technical terms explained
- [FAQ](FAQ.md) - Frequently asked questions

---

## What is CV Landing Generator?

CV Landing Generator is a full-stack web application that transforms CV/resume files into professional, responsive landing pages using AI-powered content extraction.

### Key Features:
- **AI-Powered Processing**: Google Gemini AI extracts and structures CV content
- **Multiple File Formats**: Supports PDF, DOC, DOCX uploads
- **Professional Templates**: Generates responsive HTML/CSS/JavaScript landing pages
- **GitHub Integration**: One-click publishing to GitHub Pages
- **Google OAuth**: Secure passwordless authentication
- **Free Tier Optimized**: Runs entirely on free infrastructure

### Technology Stack:
- **Backend**: Node.js, Express.js, PostgreSQL (Supabase)
- **Frontend**: Angular 20, Tailwind CSS
- **AI**: Google Gemini API
- **Authentication**: Google OAuth 2.0, JWT
- **Hosting**: Render/Heroku/Vercel (free tier)
- **File Storage**: Ephemeral file system (temporary)

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                           │
└────────────┬────────────────────────────────────┬────────────────┘
             │                                    │
             ▼                                    ▼
┌──────────────────────┐              ┌──────────────────────┐
│  Angular Frontend    │              │   Express Backend    │
│  (Port 4200)         │◄────────────►│   (Port 3000)        │
│                      │              │                      │
│  - Components        │              │  - Routes            │
│  - Services          │              │  - Controllers       │
│  - Guards            │              │  - Middleware        │
└──────────────────────┘              └──────┬───────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
         ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
         │  PostgreSQL DB   │    │  File Storage    │    │  Third-Party     │
         │  (Supabase)      │    │  (Ephemeral)     │    │  Services        │
         │                  │    │                  │    │                  │
         │  - Users         │    │  - uploads/      │    │  - Google OAuth  │
         │  - Sessions      │    │  - generated/    │    │  - Gemini AI     │
         │  - CV Data       │    │  (Temp files)    │    │  - GitHub API    │
         └──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## Core Data Flows

### 1. CV Processing Flow
```
User Uploads CV → File Validation → Text Extraction →
Gemini AI Processing → Structured Data → Template Generation →
Landing Page Files → User Downloads ZIP
```
[Detailed flow diagram →](diagrams/data-flow-cv-processing.md)

### 2. Authentication Flow
```
User Clicks Login → Google OAuth → Backend Validates →
JWT Token Generated → Session Created → Token to Frontend →
User Authenticated
```
[Detailed flow diagram →](diagrams/data-flow-authentication.md)

### 3. GitHub Publishing Flow
```
User Connects GitHub → GitHub OAuth → Encrypted Token Stored →
User Publishes Site → Repository Created → Files Pushed →
GitHub Pages Enabled → Live URL Returned
```
[Detailed flow diagram →](diagrams/data-flow-github-publishing.md)

---

## Quick Start Commands

### Development
```bash
# Install dependencies
npm install

# Start backend only
npm run dev:api

# Start frontend only
npm run dev:frontend

# Start both concurrently
npm run dev

# Test LLM client
npm run test:llm
```

### Database Setup
```bash
# Run complete schema in Supabase SQL Editor
# File: database/DATABASE_COMPLETE.sql
```

### Environment Variables
```bash
# Copy example configuration
cp .env.example .env

# Edit with your credentials
# Required: GEMINI_API_KEY, JWT_SECRET, DATABASE_URL,
#           GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
#           GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
```

---

## Documentation Principles

This documentation follows these principles:

1. **Hierarchy First**: Clear navigation with breadcrumbs
2. **Examples Always**: Every feature has working code examples
3. **File Links**: Code references link to actual files
4. **Visual Aids**: Diagrams for complex flows
5. **Searchable**: Comprehensive index and cross-references
6. **Beginner Friendly**: Assumes no prior knowledge of codebase
7. **Maintained**: Last updated dates on all files

---

## Need Help?

- **Can't find something?** Check the [Searchable Index](INDEX.md)
- **New to the project?** Start with [Getting Started Guide](development/getting-started.md)
- **Confused by a term?** See the [Glossary](GLOSSARY.md)
- **Common questions?** Check the [FAQ](FAQ.md)
- **Deployment issues?** See [Troubleshooting](deployment/troubleshooting.md)

---

## Contributing to Documentation

Found an error or want to improve the docs? See [Contributing Guide](development/contributing.md) for documentation contribution guidelines.

---

**Happy coding!**
