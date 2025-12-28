# CV Landing Page Generator

Transform your CV/resume into a professional, responsive landing page using AI-powered content extraction.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Angular](https://img.shields.io/badge/angular-20.0.0-red.svg)

## Overview

CV Landing Page Generator is a full-stack web application that allows users to upload their CV files (PDF, DOC, DOCX), processes them using Google Gemini AI, and generates beautiful, professional landing pages. The application includes Google OAuth authentication and GitHub integration for one-click publishing to GitHub Pages.

### Key Features

- **AI-Powered CV Processing**: Automatically extracts and structures CV content using Google Gemini AI
- **Multiple File Formats**: Supports PDF, DOC, and DOCX file uploads
- **Professional Templates**: Generates responsive, mobile-friendly landing pages
- **GitHub Integration**: One-click publishing to GitHub Pages
- **Secure Authentication**: Google OAuth 2.0 passwordless login
- **Session Management**: Multi-device login support with session tracking
- **Queue System**: Fair job processing with position tracking
- **Free Tier Optimized**: Runs entirely on free infrastructure (Supabase, Render/Vercel)

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini API / Ollama (local)
- **Authentication**: Google OAuth 2.0, JWT
- **File Processing**: Multer, pdf-parse, mammoth

### Frontend
- **Framework**: Angular 20 (standalone components)
- **Styling**: Tailwind CSS
- **Build Tool**: Angular CLI
- **State Management**: Services with RxJS

### Infrastructure
- **Hosting**: Render / Heroku / Vercel (free tier)
- **Database**: Supabase (free tier)
- **File Storage**: Ephemeral (temporary)
- **Version Control**: Git / GitHub

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- PostgreSQL database (Supabase recommended)
- Google OAuth credentials
- GitHub OAuth credentials (optional, for publishing)
- Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cv-landing-generator.git
   cd cv-landing-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   # Required
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Optional (for GitHub publishing)
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret

   # Optional (for local LLM)
   LLM_CLIENT_TYPE=gemini
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

4. **Set up the database**

   Run the SQL schema in your Supabase SQL Editor:
   ```bash
   # File: database/DATABASE_COMPLETE.sql
   ```

5. **Start the development servers**

   Backend only:
   ```bash
   npm run dev:backend
   ```

   Frontend only:
   ```bash
   npm run dev:frontend
   ```

   Both concurrently:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000

## Project Structure

```
cv-landing-generator/
├── frontend/                 # Angular 20 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── pages/        # Route components (home, dashboard, upload)
│   │   │   ├── services/     # API services
│   │   │   ├── app.routes.ts # Route configuration
│   │   │   └── app.config.ts # App configuration
│   │   ├── environments/     # Environment configs
│   │   └── styles.scss       # Global styles
│   ├── angular.json
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                   # Express backend
│   ├── server.js            # Main server file
│   ├── routes/              # API route handlers
│   │   ├── cv.js            # CV processing endpoints
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── github.js        # GitHub integration
│   │   ├── session.js       # Session management
│   │   ├── legal.js         # Legal documents
│   │   └── health.js        # Health checks
│   ├── middleware/          # Express middleware
│   │   ├── enhanced-auth.js # JWT authentication
│   │   ├── authorization.js # Resource authorization
│   │   ├── security.js      # Security headers
│   │   └── validation.js    # Input validation
│   ├── lib/                 # Business logic
│   │   ├── intelligent-cv-processor*.js # CV processing
│   │   ├── template-processor.js        # Template generation
│   │   ├── simple-queue-manager.js      # Job queue
│   │   ├── file-cleanup.js              # File cleanup
│   │   └── utils/                       # Utility functions
│   ├── database/            # Database layer
│   │   ├── index.js        # Database connection
│   │   ├── services.js     # Database operations
│   │   └── session-store.js # Session storage
│   ├── constants/          # Application constants
│   └── templates/          # Landing page templates
│       └── professional/   # Professional template
│
├── output/                  # Runtime file storage (ephemeral)
│   ├── uploads/            # Uploaded CV files (temporary)
│   └── generated/          # Generated landing pages (temporary)
│
├── database/               # Database schemas
│   └── DATABASE_COMPLETE.sql
│
├── docs/                   # Documentation
│   ├── README.md          # Documentation index
│   ├── architecture/      # System architecture
│   ├── database/         # Database docs
│   ├── development/      # Development guides
│   └── diagrams/         # Flow diagrams
│
├── tests/                 # Test files
│   ├── integration/      # Integration tests
│   └── server/           # Server tests
│
├── .env.example          # Environment template
├── .gitignore
├── CLAUDE.md             # Claude Code instructions
├── package.json
└── README.md             # This file
```

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
cd frontend && ng test   # Run Angular unit tests
```

### Full Stack Development
```bash
npm run dev             # Start both backend and frontend concurrently
npm run build           # Build frontend only
```

## API Documentation

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### CV Processing
- `POST /api/cv/upload` - Upload CV file
- `POST /api/cv/process` - Process uploaded CV
- `POST /api/cv/generate` - Generate landing page
- `GET /api/cv/preview` - Preview landing page
- `GET /api/cv/download` - Download as ZIP

### GitHub Integration
- `POST /api/github/connect` - Connect GitHub account
- `POST /api/github/publish` - Publish to GitHub Pages
- `GET /api/github/status` - Check connection status

For complete API documentation, see [docs/api/](docs/api/).

## Environment Variables

See `.env.example` for a complete list of configuration options.

### Required Variables
- `GEMINI_API_KEY` - Google Gemini API key for CV processing
- `JWT_SECRET` - Secret for JWT token signing
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Optional Variables
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `LLM_CLIENT_TYPE` - LLM provider (gemini/ollama, default: gemini)
- `OLLAMA_BASE_URL` - Ollama server URL (for local LLM)
- `OLLAMA_MODEL` - Ollama model name
- `NODE_ENV` - Environment mode (development/production)

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Google OAuth**: Passwordless login via Google
- **CSRF Protection**: Token-based CSRF prevention
- **Rate Limiting**: IP-based and per-user rate limits
- **Input Validation**: Comprehensive input sanitization
- **File Validation**: Strict file type and size validation
- **Path Traversal Prevention**: Secure file path handling
- **Encryption**: GitHub tokens encrypted at rest
- **Session Management**: Multi-device session tracking
- **GDPR Compliance**: Data export and account deletion

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Getting Started Guide](docs/development/getting-started.md)
- [Deployment Guide](docs/deployment/deployment-guide.md) - Platform comparison and Render setup
- [Architecture Overview](docs/architecture/)
- [API Reference](docs/api/)
- [Database Schema](docs/database/schema.md)
- [Development Guide](docs/development/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini AI for CV processing
- Supabase for database infrastructure
- Angular team for the frontend framework
- All contributors and users

## Support

For issues, questions, or contributions, please visit:
- [GitHub Issues](https://github.com/yourusername/cv-landing-generator/issues)
- [Documentation](docs/README.md)

---

**Built with by [Your Name]**
