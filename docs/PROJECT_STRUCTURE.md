# Project Structure Reference

**Last Updated**: December 27, 2025

This document provides a complete reference of the CV Landing Generator project structure.

## Directory Overview

```
cv-landing-generator/
├── frontend/           # Angular 20 frontend application
├── server/            # Express.js backend server
├── output/            # Runtime file storage (ephemeral, not in git)
├── database/          # Database schemas and SQL files
├── docs/              # Project documentation
├── tests/             # Test files and test utilities
└── [config files]     # Root-level configuration
```

## Detailed Structure

### Frontend (`frontend/`)

Angular 20 application with standalone components.

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── cv-wizard/
│   │   │   ├── file-upload/
│   │   │   ├── preview-modal/
│   │   │   ├── github-publish-button/
│   │   │   ├── login/
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   ├── legal-viewer/
│   │   │   └── terms-acceptance/
│   │   ├── pages/           # Route components
│   │   │   ├── home/
│   │   │   ├── dashboard/
│   │   │   └── upload/
│   │   ├── services/        # Angular services
│   │   │   ├── api.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── cv-processing.service.ts
│   │   │   ├── file-upload.service.ts
│   │   │   ├── landing-page.service.ts
│   │   │   ├── github-publish.service.ts
│   │   │   ├── preview.service.ts
│   │   │   ├── queue.service.ts
│   │   │   └── legal.service.ts
│   │   ├── app.ts           # Root component
│   │   ├── app.config.ts    # App configuration
│   │   └── app.routes.ts    # Route configuration
│   ├── environments/        # Environment configurations
│   ├── assets/             # Static assets
│   ├── styles.scss         # Global styles
│   └── index.html          # Main HTML file
├── angular.json            # Angular CLI configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Frontend dependencies
```

### Backend (`server/`)

Express.js server with modular architecture.

```
server/
├── server.js              # Main server entry point
├── routes/               # API route handlers
│   ├── cv.js            # CV processing endpoints
│   ├── auth.js          # Authentication endpoints
│   ├── github.js        # GitHub integration endpoints
│   ├── session.js       # Session management endpoints
│   ├── legal.js         # Legal documents endpoints
│   └── health.js        # Health check endpoints
├── middleware/          # Express middleware
│   ├── enhanced-auth.js     # JWT authentication
│   ├── authorization.js     # Resource authorization
│   ├── security.js          # Security headers (Helmet, CORS)
│   ├── per-user-rate-limit.js # User-specific rate limiting
│   ├── csrf-protection.js   # CSRF protection
│   ├── validation.js        # Input validation
│   └── monitoring.js        # Request logging and metrics
├── lib/                 # Business logic
│   ├── intelligent-cv-processor.js       # CV processor factory
│   ├── intelligent-cv-processor-base.js  # Base processor class
│   ├── intelligent-cv-processor-gemini.js # Gemini implementation
│   ├── intelligent-cv-processor-ollama.js # Ollama implementation
│   ├── template-processor.js # Landing page generation
│   ├── simple-queue-manager.js # Job queue system
│   ├── file-cleanup.js      # Automated file cleanup
│   ├── health-monitor.js    # System health monitoring
│   ├── metrics-collector.js # Performance metrics
│   ├── services/
│   │   └── cv-session-service.js # CV session management
│   └── utils/
│       ├── gemini-client.js     # Gemini API client
│       ├── ollama-client.js     # Ollama API client
│       ├── llm-client-base.js   # LLM base class
│       ├── encryption.js        # Data encryption
│       ├── input-sanitizer.js   # Input sanitization
│       ├── secure-paths.js      # Path security
│       ├── text-cleaner.js      # Text processing
│       └── response-helpers.js  # API response helpers
├── database/            # Database layer
│   ├── index.js        # Database connection
│   ├── services.js     # Database operations
│   └── session-store.js # Session storage
├── constants/          # Application constants
│   ├── constants.js
│   └── index.js
└── templates/          # Landing page templates
    └── professional/   # Professional template
        ├── index.html
        ├── styles.css
        ├── script.js
        ├── data.js.template
        └── README.md
```

### File Storage (`output/`)

Runtime file storage (ephemeral, not committed to git).

```
output/
├── uploads/           # Temporary uploaded CV files
│   └── [user-id]/    # User-specific upload directories
└── generated/        # Temporary generated landing pages
    └── [user-id]/    # User-specific output directories
```

### Database (`database/`)

Database schemas and migration files.

```
database/
└── DATABASE_COMPLETE.sql    # Complete database schema (19KB)
```

**Schema includes**:
- Users table with OAuth integration
- Sessions table for multi-device support
- CV processing data tables
- GitHub integration tables
- Legal acceptance tracking
- Indexes and functions

### Documentation (`docs/`)

Project documentation organized by topic.

```
docs/
├── README.md                        # Documentation index
├── architecture/
│   └── file-storage.md             # File storage architecture
├── database/
│   └── schema.md                   # Database schema documentation
├── development/
│   └── getting-started.md          # Development setup guide
└── diagrams/
    ├── data-flow-cv-processing.md  # CV processing flow diagram
    └── data-flow-authentication.md # Authentication flow diagram
```

### Tests (`tests/`)

Test files and utilities.

```
tests/
├── integration/
│   └── test-queue-mock.js          # Queue system tests
├── server/
│   ├── test-intelligent-processor-gemini.js # Gemini processor tests
│   └── test-session-memory.js      # Session management tests
├── test-auth-comprehensive.js      # Comprehensive auth tests
├── test-live-auth.js              # Live authentication tests
└── test-multiple-users.html       # Multi-user test interface
```

### Root Configuration Files

```
cv-landing-generator/
├── .env.example          # Environment variable template with full documentation
├── .env                  # Local environment (not in git)
├── .gitignore           # Git ignore rules
├── .dockerignore        # Docker ignore rules
├── package.json         # Root package dependencies
├── package-lock.json    # Locked dependencies
├── docker-compose.yml   # Docker composition
├── Dockerfile           # Docker build configuration
├── CLAUDE.md           # Claude Code instructions
├── README.md           # Project overview and quickstart
├── DISCLAIMER.md       # Project disclaimer
├── PRIVACY_POLICY.md   # Privacy policy
└── TERMS_OF_SERVICE.md # Terms of service
```

## File Naming Conventions

### Backend Files
- **Routes**: `kebab-case.js` (e.g., `cv.js`, `session.js`)
- **Middleware**: `kebab-case.js` (e.g., `enhanced-auth.js`)
- **Services**: `kebab-case.js` (e.g., `cv-session-service.js`)
- **Utilities**: `kebab-case.js` (e.g., `input-sanitizer.js`)

### Frontend Files
- **Components**: `kebab-case/` directories with `component.ts`, `component.html`, `component.scss`
- **Services**: `kebab-case.service.ts` (e.g., `auth.service.ts`)
- **Pages**: Component format in `pages/` directory

## Key Files Reference

### Most Frequently Modified Files

**Backend:**
- `server/server.js` - Main server configuration (437 lines)
- `server/routes/cv.js` - CV processing endpoints
- `server/lib/intelligent-cv-processor-gemini.js` - AI processing logic

**Frontend:**
- `frontend/src/app/components/cv-wizard/` - Main user interface
- `frontend/src/app/services/cv-processing.service.ts` - CV processing logic
- `frontend/src/app/app.routes.ts` - Route configuration

### Configuration Files

- `.env` - Environment variables (not in git)
- `.env.example` - Environment template (in git)
- `frontend/angular.json` - Angular CLI configuration
- `frontend/tailwind.config.js` - Tailwind CSS customization
- `server/constants/constants.js` - Application constants

## File Size Reference

**Largest Files:**
- `package-lock.json`: 134KB
- `database/DATABASE_COMPLETE.sql`: 19KB
- `PRIVACY_POLICY.md`: 20KB
- `DISCLAIMER.md`: 16KB
- `TERMS_OF_SERVICE.md`: 15KB
- `server/server.js`: 15KB
- `.env.example`: 9KB

## Temporary Files (Git Ignored)

The following directories are created at runtime and should not be committed:

- `node_modules/` - Node.js dependencies
- `output/` - Runtime file storage (contains uploads/ and generated/ subdirectories)
- `.env` - Local environment variables
- `frontend/dist/` - Angular build output
- `frontend/.angular/` - Angular cache

## Notes

- **File Storage**: All file storage is ephemeral and cleaned automatically
- **Database Files**: Only schema files are committed, not data
- **Environment Files**: `.env` is never committed, only `.env.example`
- **Build Artifacts**: Frontend builds are not committed

---

**For detailed architecture documentation, see [docs/README.md](README.md)**
