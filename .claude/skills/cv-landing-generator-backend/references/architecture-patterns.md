# Architecture Patterns - Landing Page CV

## Layer Architecture

### Overview
The backend follows a strict 3-layer architecture:
1. **Presentation Layer** (Routes)
2. **Business Logic Layer** (Services)
3. **Data Access Layer** (Database)

Each layer has specific responsibilities and should never bypass the layer below it.

---

## Pattern 1: Route → Service → Database

### Rule
Routes must NEVER directly access the database. All database operations go through services.

### Why
- **Testability**: Services can be unit tested without HTTP
- **Reusability**: Services can be called from multiple routes
- **Separation**: HTTP concerns stay in routes, business logic in services

### Example: CV Upload Flow

```javascript
// ❌ ANTI-PATTERN: Route directly accessing database
router.post('/upload', upload.single('cv'), async (req, res) => {
  const query = 'INSERT INTO cv_uploads (user_id, filename) VALUES ($1, $2)';
  const result = await pool.query(query, [req.user.id, req.file.filename]);
  res.json({ uploadId: result.rows[0].id });
});

// ✅ CORRECT PATTERN: Route → Service → Database
// Route (server/routes/cv.js)
router.post('/upload', upload.single('cv'), async (req, res, next) => {
  try {
    const result = await cvService.uploadCV(req.user.id, req.file);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Service (server/services/cv.service.js)
class CVService {
  async uploadCV(userId, file) {
    const dailyCount = await cvDatabase.getUserDailyUploadCount(userId);
    if (dailyCount >= MAX_DAILY_UPLOADS) {
      throw new QuotaExceededError();
    }
    return await cvDatabase.saveUpload(userId, file);
  }
}

// Database (server/database/cv-database.js)
class CVDatabase {
  async saveUpload(userId, file) {
    const query = 'INSERT INTO cv_uploads (user_id, filename) VALUES ($1, $2) RETURNING upload_id';
    const result = await pool.query(query, [userId, file.filename]);
    return { uploadId: result.rows[0].upload_id };
  }
}
```

---

## Pattern 2: Service Composition

### Rule
Services can call other services, but should never create circular dependencies.

### Example: CV Processing Chain

```javascript
// server/services/cv.service.js
class CVService {
  async generateLandingPage(userId, sessionId) {
    // Step 1: Get structured data
    const session = await this.getSession(sessionId);
    
    // Step 2: Verify ownership
    await authService.verifyResourceOwnership(userId, session.user_id);
    
    // Step 3: Generate site
    const siteFiles = await templateService.generateSite(session.structured_data);
    
    // Step 4: Save metadata
    const siteId = await cvDatabase.saveSite(userId, sessionId, siteFiles);
    
    return { siteId, files: siteFiles };
  }
}
```

### Dependency Graph
```
CVService
  ├── AuthService (for verification)
  ├── TemplateService (for generation)
  └── CVDatabase (for persistence)
```

---

## Pattern 3: Error Handling Strategy

### Custom Error Classes
Define domain-specific errors that carry semantic meaning.

```javascript
// server/lib/errors/custom-errors.js
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class QuotaExceededError extends Error {
  constructor(message = 'Quota exceeded') {
    super(message);
    this.name = 'QuotaExceededError';
    this.statusCode = 429;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}
```

### Service Layer Error Throwing
```javascript
// server/services/cv.service.js
async uploadCV(userId, file) {
  if (!file) {
    throw new ValidationError('No file provided');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(ERRORS.FILE_TOO_LARGE);
  }
  
  const dailyCount = await cvDatabase.getUserDailyUploadCount(userId);
  if (dailyCount >= MAX_DAILY_UPLOADS) {
    throw new QuotaExceededError(ERRORS.QUOTA_EXCEEDED);
  }
  
  // Continue processing...
}
```

### Centralized Error Handler
```javascript
// server/middleware/error-handler.js
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error('ERROR', message, {
    error: err.name,
    stack: err.stack,
    path: req.path
  });
  
  res.status(statusCode).json({
    error: {
      message,
      type: err.name,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

module.exports = errorHandler;
```

---

## Pattern 4: Transaction Management

### Database Transactions
Wrap multi-step database operations in transactions.

```javascript
// server/database/cv-database.js
async createProcessingSession(userId, uploadId, extractedText, structuredData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Create session
    const sessionResult = await client.query(
      'INSERT INTO cv_processing_sessions (user_id, upload_id, extracted_text) VALUES ($1, $2, $3) RETURNING session_id',
      [userId, uploadId, extractedText]
    );
    const sessionId = sessionResult.rows[0].session_id;
    
    // Step 2: Update upload status
    await client.query(
      'UPDATE cv_uploads SET status = $1 WHERE upload_id = $2',
      ['processed', uploadId]
    );
    
    // Step 3: Save structured data
    await client.query(
      'UPDATE cv_processing_sessions SET structured_data = $1 WHERE session_id = $2',
      [JSON.stringify(structuredData), sessionId]
    );
    
    await client.query('COMMIT');
    return sessionId;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Pattern 5: Async Operations

### Promise Chaining vs Async/Await
Always use async/await for better readability and error handling.

```javascript
// ❌ BAD: Promise chaining
function processCV(uploadId) {
  return cvDatabase.getUpload(uploadId)
    .then(upload => parser.extractText(upload.file_path))
    .then(text => llmClient.structureData(text))
    .then(data => cvDatabase.saveStructuredData(uploadId, data))
    .catch(error => {
      logger.error('Error', error);
      throw error;
    });
}

// ✅ GOOD: Async/await
async function processCV(uploadId) {
  try {
    const upload = await cvDatabase.getUpload(uploadId);
    const text = await parser.extractText(upload.file_path);
    const data = await llmClient.structureData(text);
    await cvDatabase.saveStructuredData(uploadId, data);
  } catch (error) {
    logger.error('Error processing CV', error);
    throw error;
  }
}
```

### Parallel Operations
Use `Promise.all()` when operations are independent.

```javascript
// ✅ GOOD: Parallel execution
async function getUserDashboardData(userId) {
  const [uploads, sessions, sites] = await Promise.all([
    cvDatabase.getUserUploads(userId),
    cvDatabase.getUserSessions(userId),
    cvDatabase.getUserSites(userId)
  ]);
  
  return { uploads, sessions, sites };
}
```

---

## Pattern 6: Dependency Injection

### Service Dependencies
Pass dependencies through constructors for better testability.

```javascript
// server/services/cv.service.js
class CVService {
  constructor(database, parser, llmClient, logger) {
    this.database = database;
    this.parser = parser;
    this.llmClient = llmClient;
    this.logger = logger;
  }
  
  async processCV(userId, uploadId) {
    const upload = await this.database.getUpload(uploadId);
    const text = await this.parser.extractText(upload.file_path);
    const data = await this.llmClient.structureData(text);
    
    this.logger.info('CV processed', { userId, uploadId });
    
    return data;
  }
}

// Export singleton with injected dependencies
module.exports = new CVService(
  require('../database/cv-database'),
  require('../lib/cv-parser-modular'),
  require('../lib/utils/llm-client-factory'),
  require('../lib/utils/logger')
);
```

---

## Pattern 7: Configuration Management

### Environment-Based Configuration
Separate config from code.

```javascript
// server/config/index.js
const { MAX_FILE_SIZE, MAX_DAILY_UPLOADS } = require('./constants');

module.exports = {
  port: process.env.PORT || 3000,
  
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000
    }
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  upload: {
    maxSize: MAX_FILE_SIZE,
    dailyLimit: MAX_DAILY_UPLOADS,
    allowedTypes: ['.pdf', '.doc', '.docx']
  },
  
  llm: {
    type: process.env.LLM_CLIENT_TYPE || 'gemini',
    apiKey: process.env.GEMINI_API_KEY
  }
};

// Validate required config on startup
function validateConfig() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateConfig();
```

---

## Pattern 8: Resource Cleanup

### File Cleanup Pattern
Always clean up temporary files.

```javascript
// server/services/cv.service.js
async downloadSite(userId, siteId) {
  const zipPath = await this.createZip(userId, siteId);
  
  try {
    // Send file to user
    await this.sendFile(zipPath);
    
  } finally {
    // Always clean up, even if send fails
    setTimeout(() => {
      fs.unlink(zipPath, (err) => {
        if (err) logger.error('Failed to delete temp file', err);
      });
    }, 5 * 60 * 1000); // 5 minutes
  }
}
```

---

## Anti-Patterns to Avoid

### 1. God Objects
❌ Don't create classes that do everything.

```javascript
// BAD
class CVManager {
  uploadFile() { }
  validateFile() { }
  extractText() { }
  processWithAI() { }
  generateTemplate() { }
  saveToDatabase() { }
  sendEmail() { }
  createZip() { }
  // ... 20 more methods
}
```

✅ Split into focused services:
- `CVUploadService`
- `CVProcessingService`
- `TemplateService`
- `NotificationService`

### 2. Callback Hell
❌ Avoid nested callbacks.

```javascript
// BAD
function processCV(uploadId, callback) {
  getUpload(uploadId, (err, upload) => {
    extractText(upload.path, (err, text) => {
      structureData(text, (err, data) => {
        saveData(data, (err, result) => {
          callback(null, result);
        });
      });
    });
  });
}
```

✅ Use async/await (see Pattern 5).

### 3. Tight Coupling
❌ Don't hardcode dependencies.

```javascript
// BAD
class CVService {
  processCV() {
    // Hardcoded dependency
    const db = require('../database/cv-database');
    return db.query(...);
  }
}
```

✅ Use dependency injection (see Pattern 6).

---

## Summary Checklist

When implementing a new feature:

- [ ] Route only handles HTTP (no business logic)
- [ ] Service contains business logic
- [ ] Database layer handles data only
- [ ] Errors are custom classes with proper status codes
- [ ] Async/await used consistently
- [ ] Transactions used for multi-step DB operations
- [ ] Dependencies injected, not hardcoded
- [ ] Configuration from environment variables
- [ ] Resources cleaned up properly
- [ ] No circular dependencies
