# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CV Landing Page Generator is a full-stack application that allows users to upload their CV files (PDF, DOC, DOCX), processes them using AI (Gemini API), and generates professional landing pages. The application includes user authentication via Google OAuth and GitHub integration for publishing generated sites.

## Development Commands

### Backend Development
```bash
npm run dev:api          # Start backend server on port 3000
node server.js           # Direct backend start
npm run test:llm         # Test LLM clients (Gemini/Ollama)
npm run test:gemini      # Test Gemini API specifically
npm run test:ollama      # Test Ollama client specifically
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

### Angular CLI Commands (in frontend directory)
```bash
ng generate component component-name    # Generate new component
ng generate service service-name        # Generate new service
ng generate --help                      # List all available schematics
```

## Architecture Overview

### Backend Structure
- **Express Server** (`server.js`): Main API server with CORS, file upload support (50MB limit), and route mounting
- **Routes** (`routes/`):
  - `cv.js`: CV upload, processing, generation, preview, and download endpoints
  - `auth.js`: Authentication routes (Google OAuth, GitHub integration)
  - `github.js`: GitHub repository creation and management
  - `health.js`: Health check endpoints
- **Controllers** (`controllers/`): Business logic handlers
- **Database** (`database/`): PostgreSQL/Supabase integration with user management and site tracking services
- **CV Processing** (`lib/`):
  - `cv-parser-modular.js`: Main CV parsing with modular processors
  - `cv-processors/`: Specialized processors for different CV sections
  - `template-processor.js`: Landing page generation from templates
  - `utils/`: LLM client factory supporting Gemini and Ollama

### Frontend Structure
- **Angular 20** with standalone components
- **Routing**: Lazy-loaded components using `loadComponent`
- **Pages**: Home, Dashboard, Upload with dedicated route handling
- **Components**: Modular UI components including CV wizard, file upload, preview modal
- **Services**: API communication, authentication, CV processing, file upload management
- **Styling**: Tailwind CSS with PostCSS configuration

### Database Integration
- **PostgreSQL/Supabase**: User management, site tracking, processing logs
- **Services**: Centralized database operations in `database/services.js`
- **Authentication**: JWT-based with Google OAuth integration

### LLM Integration
- **Multi-provider support**: Gemini (primary) and Ollama (local)
- **Factory pattern**: `LLMClientFactory` for client creation and testing
- **CV Processing Pipeline**: Text extraction → AI structuring → Template generation

## Environment Configuration

### Required Environment Variables
```
GEMINI_API_KEY=your_gemini_api_key        # Required for CV processing
JWT_SECRET=your_jwt_secret                # Required for authentication
SUPABASE_URL=your_supabase_url           # Database connection
SUPABASE_KEY=your_supabase_key           # Database authentication
GOOGLE_CLIENT_ID=your_google_client_id   # OAuth authentication
GOOGLE_CLIENT_SECRET=your_google_secret  # OAuth authentication
GITHUB_CLIENT_ID=your_github_client_id   # GitHub integration
GITHUB_CLIENT_SECRET=your_github_secret  # GitHub integration
```

### Optional Environment Variables
```
LLM_CLIENT_TYPE=gemini                   # Choose LLM provider (gemini/ollama)
OLLAMA_BASE_URL=http://localhost:11434   # Ollama server URL
OLLAMA_MODEL=llama2                      # Ollama model name
NODE_ENV=development                     # Environment mode
```

## Key Data Flow

1. **File Upload**: User uploads CV → Multer processes → Temporary storage
2. **CV Processing**: File → Text extraction → AI structuring → Database storage
3. **Landing Page Generation**: Structured data → Template processor → Static files
4. **Preview/Download**: Generated files → ZIP archive or direct preview
5. **GitHub Publishing**: Landing page → GitHub repository creation → Live deployment

## File Storage Structure
- `uploads/`: Temporary CV file storage (cleaned after processing)
- `generated/`: User-specific landing page output directories
- `templates/professional/`: Base template files for landing page generation

## Authentication Flow
- JWT-based authentication with Google OAuth
- Protected routes require `Authorization: Bearer <token>` header
- User data stored in PostgreSQL with GitHub integration support

## Template System
- Professional template with responsive design
- Generated files: `index.html`, `styles.css`, `script.js`, `data.js`, `README.md`
- Customizable layout, styling, and functionality
- Browser support: Chrome 60+, Firefox 60+, Safari 12+, Edge 79+

## API Endpoints Overview
- `POST /api/cv/upload`: File upload with authentication
- `POST /api/cv/process`: CV text extraction and AI processing
- `POST /api/cv/generate`: Landing page generation
- `GET /api/cv/preview`: Preview generated landing page
- `GET /api/cv/download`: Download landing page as ZIP
- `POST /api/auth/*`: Authentication endpoints
- `POST /api/github/*`: GitHub integration endpoints

## Coding Guidelines

### Logging and Debugging
- **Logging Best Practices**:
  - do not add icons to console logs

## Development Principles

- When adding features to cv-wizard, create separate components
- cv-wizard should remain a small file that calls other small components with separate functionality

## Project Interaction Notes

- Port and Server Interaction:
  - Don't run the project yourself without prior confirmation
  - Always ask for permission before executing project scripts
  - Most times, the project owner prefers to run it themselves to avoid port conflicts

### Batch Commands
- batch commands should be windows os