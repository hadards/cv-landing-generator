# CV Landing Generator - Technical Documentation

**Last Updated**: December 26, 2025

Welcome to the comprehensive technical documentation for the CV Landing Generator. This documentation is designed to help new engineers understand, maintain, and extend the application.

---

## Quick Navigation

### Getting Started
- [Development Setup Guide](development/getting-started.md) ✓ - Set up your local environment

### Deployment
- [Deployment Guide](deployment/deployment-guide.md) ✓ - Platform comparison and Render setup

### Architecture
- [File Storage System](architecture/file-storage.md) ✓ - Ephemeral vs persistent storage

### Database
- [Database Schema](database/schema.md) ✓ - All tables with field descriptions

### Visual Diagrams
- [CV Processing Flow](diagrams/data-flow-cv-processing.md) ✓ - Upload to download
- [Authentication Flow](diagrams/data-flow-authentication.md) ✓ - Login and sessions

---

## Documentation Status

The following documentation is currently available (marked with ✓). Additional documentation can be created as needed.

### Completed Documentation
- Getting Started Guide
- Deployment Guide
- File Storage Architecture
- Database Schema
- CV Processing Flow Diagram
- Authentication Flow Diagram

### Planned Documentation (Not Yet Created)
See the section below for documentation that is referenced but not yet written. These can be created on demand.

<details>
<summary>Click to see planned documentation outline</summary>

### Architecture (Planned)
- Architecture Overview - High-level system design and components
- Backend Architecture - Express server, middleware, routes
- Frontend Architecture - Angular components and services
- Database Architecture - PostgreSQL schema and relationships
- Data Flow Diagrams - How data moves through the system
- Third-Party Integrations - Google, GitHub, Gemini AI, Supabase

### Features (Planned)
- Authentication - Google OAuth and JWT sessions
- CV Processing Pipeline - Upload → Extract → AI → Generate
- Queue System - Single-job queue with position tracking
- Landing Page Generation - Template processing
- GitHub Publishing - OAuth and Pages deployment
- File Cleanup - Automated cleanup strategies
- Session Management - Multi-device login support
- Rate Limiting - IP-based and per-user limits

### API Reference (Planned)
- API Overview - Conventions, authentication, error handling
- Auth Endpoints - `/api/auth/*` with examples
- CV Endpoints - `/api/cv/*` with examples
- GitHub Endpoints - `/api/github/*` with examples
- Session Endpoints - `/api/session/*` with examples
- Legal Endpoints - `/api/legal/*` with examples
- Health Endpoints - `/api/health/*` with examples

### Database (Planned)
- Table Relationships - Foreign keys and CASCADE rules
- Database Indexes - All indexes explained
- Database Functions - Cleanup and maintenance functions
- Data Retention - What's kept and what's deleted
- Common Queries - Query patterns and examples

### Security (Planned)
- Authentication Security - OAuth, JWT, session tracking
- Authorization - Resource ownership verification
- Rate Limiting - Global and per-user limits
- Input Validation - File validation and sanitization
- Encryption - GitHub tokens and database SSL
- CSRF Protection - Token generation and verification
- Compliance - GDPR, data export, account deletion

### Development (Planned)
- Local Development - Running the app locally
- Testing Strategy - LLM testing and test patterns
- Debugging Guide - Common issues and solutions
- Code Style Guide - Conventions and patterns
- Contributing - Git workflow and PR process

### Deployment
- ✓ Deployment Guide - Platform comparison and Render setup
- (Planned) Advanced Cloudflare deployment
- (Planned) Custom domain setup
- (Planned) CI/CD pipeline configuration

### Code Reference (Planned)
- Backend Files - All backend files with purposes
- Frontend Files - All frontend files with purposes
- Middleware Chain - Request processing pipeline
- Utility Modules - Encryption, sanitization, paths
- Constants - Application constants explained

### Visual Diagrams (Planned)
- Architecture Diagram - System components
- GitHub Publishing Flow - OAuth to deployment
- Database ERD - Entity relationship diagram
- Middleware Pipeline - Request processing
- File Lifecycle - Upload and cleanup

### Additional Resources (Planned)
- Searchable Index - Find topics quickly
- Glossary - Technical terms explained
- FAQ - Frequently asked questions

</details>

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
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Start both concurrently
npm run dev

# Test database connection
npm run db:test
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
- **Deployment issues?** See [Deployment Guide - Troubleshooting](deployment/deployment-guide.md#troubleshooting)

---

## Contributing to Documentation

Found an error or want to improve the docs? See [Contributing Guide](development/contributing.md) for documentation contribution guidelines.

---

**Happy coding!**
