# CLAUDE.md

This file defines how Claude Code must work in this repository on a Windows (VS Code) workflow.

## Non-negotiable rules

### Security / secrets
- Never hardcode secrets (OAuth secrets, DB credentials, API keys, tokens).
- Never commit any `.env` file.
- Do not edit or create real `.env` values in the repo.
- If configuration is needed, use environment variables at runtime and (optionally) maintain a `.env.example` with placeholders only.

### Database (SQL-first)
- Do not add runtime schema creation, schema sync, or “auto-migrate” logic in application code.
- Every database schema change must include:
  1) a new SQL migration file
  2) an updated canonical “current schema” SQL snapshot file for this repo
- Keep migrations and the canonical schema snapshot consistent.

### Constants
- Do not share constants between client and server.
- Within each side, centralize repeated literals (URLs, durations, limits, route strings, etc.) into a dedicated constants module for that side.
- Prefer descriptive constant names over “magic numbers/strings”.

### Design
- No business logic duplication. When logic appears twice, extract and reuse.
- Keep responsibilities separated:
  - UI rendering concerns stay in UI code
  - HTTP/request wiring stays at the HTTP boundary
  - business rules remain centralized (single source of truth)
  - integrations (DB/OAuth/AI) remain isolated from business rules

## Project Overview

CV Landing Page Generator is a full-stack application that allows users to upload their CV files (PDF, DOC, DOCX), processes them using AI (Gemini API), and generates professional landing pages. The application includes user authentication via Google OAuth and GitHub integration for publishing generated sites.

## Development Commands

### Backend Development
```bash
npm run dev:backend      # Start backend server on port 3000
node server/server.js    # Direct backend start
npm run db:test          # Test database connection
```

### Frontend Development
```bash
npm run dev:frontend     # Start Angular dev server on port 4200
cd frontend && ng serve  # Direct Angular start
cd frontend && ng build  # Build frontend for production
```

### Full Stack Development
```bash
npm run dev             # Start both backend and frontend concurrently
npm run build           # Build frontend only
```

## Architecture Overview

### Backend (`server/`)
- **Express Server**: Main API server with CORS, file upload support (50MB limit)
- **Routes**: API endpoints (cv, auth, github, health, legal, session)
- **Middleware**: Security, authentication, validation, rate limiting
- **Database**: PostgreSQL/Supabase integration
- **CV Processing**: Intelligent CV processor with Gemini/Ollama support
- **Templates**: Professional landing page templates

### Frontend (`frontend/`)
- **Angular 20** with standalone components
- **Lazy-loaded routing** with dedicated pages (home, dashboard, upload)
- **Tailwind CSS** for styling
- **Services** for API communication and state management

### File Storage
- `output/uploads/`: Temporary CV file storage (cleaned after processing)
- `output/generated/`: User-specific landing page output directories

## Environment Configuration

See `.env.example` for complete configuration details.

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing (minimum 32 characters)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `GEMINI_API_KEY`: Google Gemini API key (if using Gemini)

### Optional Variables
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: GitHub integration
- `LLM_CLIENT_TYPE`: Choose LLM provider (gemini/ollama)
- `ENCRYPTION_KEY`: For encrypting GitHub tokens

## Key Features

- **AI-Powered CV Processing**: Google Gemini AI or local Ollama
- **Google OAuth Authentication**: Passwordless login
- **Session Management**: Multi-device login support
- **GitHub Integration**: One-click publishing to GitHub Pages
- **Queue System**: Fair job processing with position tracking
- **File Cleanup**: Automated cleanup for ephemeral storage
- **Rate Limiting**: IP-based and per-user limits
- **Security**: JWT, CSRF protection, input validation

## Coding Guidelines

### General Principles
- Keep components small and focused
- Use existing file structure patterns
- Follow Angular standalone component conventions
- Avoid adding features beyond what's requested

### Logging
- Do not add icons to console logs

### CV Wizard Development
- When adding features to cv-wizard, create separate components
- cv-wizard should remain a small file that calls other components

## Project Interaction

### Running the Project
- **IMPORTANT**: Don't run the project yourself without prior confirmation
- Always ask for permission before executing project scripts
- The project owner prefers to run it themselves to avoid port conflicts

### Batch Commands
- Batch commands should be for Windows OS

## Documentation

For detailed documentation, see:
- `README.md`: Project overview and quick start
- `docs/`: Comprehensive technical documentation
- `.env.example`: Environment configuration guide
