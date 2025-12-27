---
name: cv-landing-generator-backend
description: Maintains backend architecture consistency for landing-page-cv project. Use when implementing new features, refactoring code, or modifying backend structure to ensure proper separation of concerns, no code duplication, centralized constants, SQL-first database approach, and security best practices. Enforces Windows VS Code workflow conventions.
---

# Backend Infrastructure Maintenance Skill

## Core Principles

### 1. Security & Secrets - NON-NEGOTIABLE
- **NEVER hardcode secrets**: OAuth credentials, DB URLs, API keys, JWT secrets
- **NEVER commit .env files**: Only `.env.example` with placeholders
- **Runtime config only**: Use `process.env` for all sensitive data
- Always validate environment variables on startup

### 2. Database - SQL-First Approach
- **NO runtime schema management**: Never use auto-migrate, schema sync, or ORM schema generation in application code
- **Every schema change requires**:
  1. New migration file: `database/migrations/YYYYMMDD_description.sql`
  2. Updated canonical schema: `database/DATABASE_COMPLETE.sql`
- Keep migrations and canonical schema consistent
- Use raw SQL queries, not ORMs for schema definition

### 3. Constants - Zero Magic Values
- **NO shared constants** between client and server
- **Each side maintains its own constants file**:
  - Server: `server/config/constants.js`
  - Client: `frontend/src/app/config/constants.ts`
- Centralize ALL repeated literals:
  - URLs and endpoints
  - Timeouts and durations
  - Limits and quotas
  - Route strings
  - Error messages
  - Status codes
- Use descriptive names: `MAX_CV_UPLOADS_PER_DAY` not `50`

### 4. Separation of Concerns
- **No business logic duplication**: Extract and reuse
- **Clear boundaries**:
  - **Routes** (`server/routes/*.js`): HTTP request/response handling only
  - **Middleware** (`server/middleware/*.js`): Cross-cutting concerns (auth, validation, logging)
  - **Services** (`server/services/*.js`): Business logic, orchestration
  - **Utils** (`server/lib/utils/*.js`): Pure functions, helpers
  - **Database** (`server/database/*.js`): Data access layer only
  - **Integrations** (`server/lib/*.js`): External APIs (Gemini, GitHub, OAuth)

## Directory Structure

```
server/
├── server.js                 # Entry point, server initialization
├── config/
│   └── constants.js         # Centralized server constants
├── routes/                   # HTTP endpoints (thin layer)
│   ├── auth.js              # Authentication routes
│   ├── cv.js                # CV processing routes
│   ├── github.js            # GitHub integration routes
│   └── index.js             # Route aggregator
├── middleware/               # Request/response interceptors
│   ├── verify-token-enhanced.js
│   ├── rate-limit.js
│   ├── file-validation.js
│   └── error-handler.js
├── services/                 # Business logic layer
│   ├── auth.service.js      # Authentication logic
│   ├── cv.service.js        # CV processing orchestration
│   └── github.service.js    # GitHub operations
├── database/                 # Data access layer
│   ├── session-store.js     # Session CRUD
│   └── db-pool.js           # Connection pool
├── lib/                      # Domain logic & integrations
│   ├── cv-parser-modular.js
│   ├── template-processor.js
│   └── utils/
│       ├── llm-client-factory.js
│       └── encryption.js
└── templates/                # Landing page templates
```

## Implementation Patterns

### Route Pattern (Thin Layer)
Routes should ONLY handle HTTP concerns. No business logic.

```javascript
// ❌ BAD: Business logic in route
router.post('/cv/upload', async (req, res) => {
  const file = req.file;
  const userId = req.user.id;
  
  // Validate file
  if (file.size > 10 * 1024 * 1024) {
    return res.status(413).json({ error: 'File too large' });
  }
  
  // Save to database
  const result = await db.query(
    'INSERT INTO cv_uploads (user_id, filename) VALUES ($1, $2)',
    [userId, file.filename]
  );
  
  res.json({ uploadId: result.rows[0].id });
});

// ✅ GOOD: Delegate to service
router.post('/cv/upload', async (req, res, next) => {
  try {
    const result = await cvService.uploadCV(req.user.id, req.file);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

### Service Pattern (Business Logic)
Services orchestrate business operations. No HTTP concerns.

```javascript
// server/services/cv.service.js
const { MAX_FILE_SIZE, MAX_DAILY_UPLOADS } = require('../config/constants');
const cvDatabase = require('../database/cv-database');
const parser = require('../lib/cv-parser-modular');

class CVService {
  async uploadCV(userId, file) {
    // Validate against business rules
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError('File size exceeds limit');
    }
    
    const dailyCount = await cvDatabase.getUserDailyUploadCount(userId);
    if (dailyCount >= MAX_DAILY_UPLOADS) {
      throw new QuotaExceededError('Daily upload limit reached');
    }
    
    // Delegate to data layer
    const uploadId = await cvDatabase.saveUpload(userId, file);
    
    return { uploadId, filename: file.originalname };
  }
  
  async processCV(userId, uploadId) {
    const upload = await cvDatabase.getUpload(uploadId);
    
    // Verify ownership
    if (upload.user_id !== userId) {
      throw new UnauthorizedError('Not your upload');
    }
    
    // Extract text
    const text = await parser.extractText(upload.file_path);
    
    // Save session
    const sessionId = await cvDatabase.createSession(userId, uploadId, text);
    
    return { sessionId, preview: text.substring(0, 500) };
  }
}

module.exports = new CVService();
```

### Database Pattern (Data Access)
Pure data operations. No business logic.

```javascript
// server/database/cv-database.js
const pool = require('./db-pool');

class CVDatabase {
  async saveUpload(userId, file) {
    const query = `
      INSERT INTO cv_uploads (user_id, filename, file_size, file_path)
      VALUES ($1, $2, $3, $4)
      RETURNING upload_id
    `;
    
    const result = await pool.query(query, [
      userId,
      file.originalname,
      file.size,
      file.path
    ]);
    
    return result.rows[0].upload_id;
  }
  
  async getUserDailyUploadCount(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM cv_uploads
      WHERE user_id = $1
        AND upload_date > CURRENT_DATE
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = new CVDatabase();
```

### Constants Pattern
Centralize ALL repeated values.

```javascript
// server/config/constants.js
module.exports = {
  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.pdf', '.doc', '.docx'],
  UPLOAD_DIR: './uploads',
  
  // Rate Limits
  MAX_DAILY_UPLOADS: 50,
  MAX_REQUESTS_PER_15_MIN: 100,
  
  // Session
  JWT_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAX_SESSIONS_PER_USER: 5,
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000,
  
  // Routes
  ROUTES: {
    AUTH: '/api/auth',
    CV: '/api/cv',
    GITHUB: '/api/github'
  },
  
  // Error Messages
  ERRORS: {
    FILE_TOO_LARGE: 'File size exceeds 10MB limit',
    INVALID_FILE_TYPE: 'Only PDF, DOC, DOCX files are supported',
    QUOTA_EXCEEDED: 'Daily upload limit of 50 CVs reached',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied'
  }
};
```

## Before Adding New Features

### Pre-Implementation Checklist
1. **Read existing code** in relevant modules
2. **Check for similar patterns** that can be reused
3. **Identify which layer** the feature belongs to (route/service/database)
4. **Plan constants** that will be needed
5. **Review database schema** - does it need a migration?

### New Feature Template

When adding a new feature:

1. **Database Layer** (if needed):
   - Create migration: `database/migrations/20251227_add_feature.sql`
   - Update schema: `database/DATABASE_COMPLETE.sql`
   - Add data access: `server/database/feature-database.js`

2. **Service Layer**:
   - Create service: `server/services/feature.service.js`
   - Implement business logic
   - Use constants from `config/constants.js`

3. **Route Layer**:
   - Add route: `server/routes/feature.js`
   - Register in `server/routes/index.js`
   - Keep thin - delegate to service

4. **Middleware** (if needed):
   - Add to `server/middleware/`
   - Apply in route or globally

## Common Anti-Patterns to Avoid

### ❌ Hardcoded Values
```javascript
// BAD
if (file.size > 10485760) { ... }
if (req.path === '/api/cv/upload') { ... }

// GOOD
const { MAX_FILE_SIZE, ROUTES } = require('../config/constants');
if (file.size > MAX_FILE_SIZE) { ... }
if (req.path === ROUTES.CV + '/upload') { ... }
```

### ❌ Business Logic in Routes
```javascript
// BAD - Route contains validation, DB access, orchestration
router.post('/process', async (req, res) => {
  const count = await db.query('SELECT COUNT...');
  if (count > 50) return res.status(429).json(...);
  const text = await extractText(...);
  await db.query('INSERT...');
  res.json(...);
});

// GOOD - Route delegates to service
router.post('/process', async (req, res, next) => {
  try {
    const result = await cvService.processCV(req.user.id, req.body.uploadId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

### ❌ Duplicate Code
```javascript
// BAD - Repeated validation
function uploadCV(file) {
  if (!file || file.size > 10MB) throw Error('Invalid');
}
function updateCV(file) {
  if (!file || file.size > 10MB) throw Error('Invalid');
}

// GOOD - Shared validation
const { validateFile } = require('./validators');
function uploadCV(file) {
  validateFile(file);
}
function updateCV(file) {
  validateFile(file);
}
```

### ❌ Schema in Application Code
```javascript
// BAD - Never do this
async function initialize() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email VARCHAR(255)
    )
  `);
}

// GOOD - Use migrations only
// Create: database/migrations/20251227_create_users.sql
// Update: database/DATABASE_COMPLETE.sql
```

## Windows VS Code Workflow

### Batch Commands
All scripts must be Windows-compatible:

```javascript
// package.json
"scripts": {
  "dev:backend": "node server/server.js",
  "dev:frontend": "cd frontend && ng serve",
  "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
  "db:test": "node server/database/test-connection.js"
}
```

### File Paths
Use `path.join()` for cross-platform compatibility:

```javascript
const path = require('path');

// ❌ BAD
const file = './uploads/' + filename;

// ✅ GOOD
const file = path.join(__dirname, 'uploads', filename);
```

## Logging Standards

### No Icons in Console Logs
```javascript
// ❌ BAD
console.log('✅ Database connected');
console.error('❌ Connection failed');

// ✅ GOOD
console.log('[DB] Connected successfully');
console.error('[DB] Connection failed');
```

### Structured Logging
```javascript
const logger = {
  info: (module, message, data = {}) => {
    console.log(`[${module}] ${message}`, data);
  },
  error: (module, message, error) => {
    console.error(`[${module}] ${message}`, error);
  }
};

// Usage
logger.info('AUTH', 'User logged in', { userId: user.id });
logger.error('CV', 'Processing failed', error);
```

## Testing New Features

Before submitting work:

1. **Verify constants usage**: No hardcoded values
2. **Check layer separation**: Route → Service → Database
3. **Review database changes**: Migration + canonical schema updated
4. **Test error handling**: All errors caught and properly formatted
5. **Validate file paths**: Use `path.join()` consistently
6. **Check for duplication**: Similar logic extracted and reused

## Reference Documentation

Read these before implementing features:
- `references/architecture-patterns.md` - Detailed architecture patterns
- `references/database-guidelines.md` - Database best practices
- `references/security-checklist.md` - Security requirements
