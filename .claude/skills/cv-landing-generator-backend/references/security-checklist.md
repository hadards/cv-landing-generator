# Security Checklist - Landing Page CV

## Critical Security Rules - NON-NEGOTIABLE

### 1. Never Hardcode Secrets
**NEVER commit secrets to version control.**

```javascript
// ❌ SEVERE VIOLATION
const JWT_SECRET = "my-secret-key-12345";
const GOOGLE_CLIENT_SECRET = "GOCSPX-abc123def456";
const DATABASE_URL = "postgresql://user:password@localhost/db";

// ✅ CORRECT
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
```

### 2. Validate Environment Variables
**Check required secrets on startup.**

```javascript
// server/config/validate-env.js
function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GEMINI_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('[CONFIG] Missing required environment variables:', missing);
    process.exit(1);
  }
  
  // Validate JWT secret length
  if (process.env.JWT_SECRET.length < 32) {
    console.error('[CONFIG] JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
}

module.exports = validateEnvironment;
```

### 3. Never Commit .env Files
**Only commit .env.example with placeholders.**

```bash
# .env.example (safe to commit)
DATABASE_URL=postgresql://user:password@localhost:5432/cv_landing_page
JWT_SECRET=your_jwt_secret_minimum_32_characters
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# .env (NEVER commit this)
DATABASE_URL=postgresql://realuser:realpass@prod.example.com/db
JWT_SECRET=actual-production-secret-key-very-long
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-RealSecretHere123
```

---

## Authentication & Authorization

### JWT Token Security

#### Token Generation
```javascript
// server/services/auth.service.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateTokens(user, sessionId) {
  const tokenId = crypto.randomBytes(16).toString('hex');
  
  const payload = {
    userId: user.id,
    email: user.email,
    sessionId,
    tokenId,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256'
  });
  
  const refreshToken = jwt.sign(
    { userId: user.id, sessionId, tokenId },
    process.env.JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
  
  return { accessToken, refreshToken, tokenId };
}
```

#### Token Verification
```javascript
// server/middleware/verify-token-enhanced.js
async function verifyTokenEnhanced(req, res, next) {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    
    // Check session exists
    const session = await sessionStore.getSession(decoded.sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session not found' });
    }
    
    // Check session not expired
    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Check token not blacklisted
    const isBlacklisted = await sessionStore.isTokenBlacklisted(decoded.tokenId);
    if (isBlacklisted) {
      return res.status(403).json({ error: 'Token has been revoked' });
    }
    
    // Update last activity
    await sessionStore.updateLastActivity(decoded.sessionId);
    
    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      sessionId: decoded.sessionId,
      tokenId: decoded.tokenId
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
```

### OAuth Security

#### CSRF Protection
```javascript
// server/routes/auth.js
const crypto = require('crypto');

router.get('/google', async (req, res) => {
  // Generate CSRF token
  const state = crypto.randomBytes(32).toString('hex');
  
  // Store state with expiration
  await pool.query(
    'INSERT INTO oauth_states (state_token, expires_at) VALUES ($1, NOW() + INTERVAL \'10 minutes\')',
    [state]
  );
  
  // Build OAuth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&response_type=code` +
    `&scope=email%20profile` +
    `&state=${state}`;
  
  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Verify CSRF state
  const stateCheck = await pool.query(
    'SELECT * FROM oauth_states WHERE state_token = $1 AND expires_at > NOW()',
    [state]
  );
  
  if (stateCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Invalid or expired state token' });
  }
  
  // Delete used state
  await pool.query('DELETE FROM oauth_states WHERE state_token = $1', [state]);
  
  // Continue with OAuth flow...
});
```

### Session Management

#### Session Limits
```javascript
// server/services/auth.service.js
const MAX_SESSIONS_PER_USER = 5;

async function createSession(userId) {
  // Check session count
  const sessionCount = await sessionStore.getUserSessionCount(userId);
  
  if (sessionCount >= MAX_SESSIONS_PER_USER) {
    // Delete oldest session
    await sessionStore.deleteOldestSession(userId);
  }
  
  // Create new session
  const sessionId = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await sessionStore.createSession({
    sessionId,
    userId,
    tokenId,
    expiresAt
  });
  
  return sessionId;
}
```

#### Token Blacklisting
```javascript
// server/services/auth.service.js
async function logout(tokenId, sessionId) {
  // Blacklist token immediately
  await pool.query(
    `INSERT INTO token_blacklist (token_id, expires_at)
     VALUES ($1, NOW() + INTERVAL '7 days')`,
    [tokenId]
  );
  
  // Delete session
  await pool.query(
    'DELETE FROM user_sessions WHERE session_id = $1',
    [sessionId]
  );
}
```

---

## Input Validation

### File Upload Validation

#### File Type Validation
```javascript
// server/middleware/file-validation.js
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

function validateFileType(file) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ValidationError('Invalid file type');
  }
  
  // Verify magic bytes (first few bytes of file)
  const buffer = fs.readFileSync(file.path);
  const magicBytes = buffer.slice(0, 4).toString('hex');
  
  const validMagicBytes = {
    'application/pdf': '25504446',        // %PDF
    'application/msword': 'd0cf11e0',     // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '504b0304' // ZIP (DOCX)
  };
  
  const expectedMagic = validMagicBytes[file.mimetype];
  if (magicBytes !== expectedMagic) {
    throw new ValidationError('File type mismatch');
  }
}
```

#### Malware Scanning
```javascript
// server/middleware/file-validation.js
function scanForMalware(file) {
  const content = fs.readFileSync(file.path, 'utf8');
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /eval\(/i,
    /exec\(/i,
    /\.exe/i,
    /\.bat/i,
    /\.cmd/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      throw new SecurityError('Potentially malicious content detected');
    }
  }
}
```

### SQL Injection Prevention
**Always use parameterized queries.**

```javascript
// ❌ VULNERABLE TO SQL INJECTION
async function getUser(email) {
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  return await pool.query(query);
}
// Attacker input: "' OR '1'='1"
// Resulting query: SELECT * FROM users WHERE email = '' OR '1'='1'

// ✅ SAFE: Parameterized query
async function getUser(email) {
  const query = 'SELECT * FROM users WHERE email = $1';
  return await pool.query(query, [email]);
}
```

### XSS Prevention
**Sanitize user input before storing.**

```javascript
// server/lib/utils/sanitize.js
const validator = require('validator');

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Escape HTML entities
  return validator.escape(input);
}

function sanitizeEmail(email) {
  email = email.toLowerCase().trim();
  
  if (!validator.isEmail(email)) {
    throw new ValidationError('Invalid email format');
  }
  
  return validator.normalizeEmail(email);
}
```

---

## Rate Limiting

### Per-IP Rate Limiting
```javascript
// server/middleware/rate-limit.js
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

router.post('/upload', uploadLimiter, upload.single('cv'), uploadHandler);
```

### Per-User Rate Limiting
```javascript
// server/middleware/user-rate-limit.js
async function userRateLimiter(req, res, next) {
  const userId = req.user.id;
  const limit = 50; // 50 uploads per day
  
  const count = await pool.query(
    `SELECT COUNT(*) FROM cv_uploads
     WHERE user_id = $1 AND upload_date > CURRENT_DATE`,
    [userId]
  );
  
  if (parseInt(count.rows[0].count) >= limit) {
    return res.status(429).json({
      error: 'Daily upload limit exceeded',
      limit,
      resetAt: 'Tomorrow at 00:00 UTC'
    });
  }
  
  next();
}
```

---

## CORS Configuration

### Strict CORS Settings
```javascript
// server/server.js
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

---

## File System Security

### Safe File Paths
```javascript
const path = require('path');

// ❌ PATH TRAVERSAL VULNERABILITY
function getFile(filename) {
  return fs.readFileSync('./uploads/' + filename);
}
// Attacker input: "../../etc/passwd"

// ✅ SAFE: Validate and sanitize
function getFile(filename) {
  // Remove path traversal attempts
  const sanitized = path.basename(filename);
  
  // Build safe path
  const filePath = path.join(__dirname, 'uploads', sanitized);
  
  // Verify path is within uploads directory
  if (!filePath.startsWith(path.join(__dirname, 'uploads'))) {
    throw new SecurityError('Invalid file path');
  }
  
  return fs.readFileSync(filePath);
}
```

### File Permissions
```javascript
// server/lib/utils/file-utils.js
const fs = require('fs').promises;

async function createSecureFile(filePath, content) {
  // Write file with restricted permissions (owner only)
  await fs.writeFile(filePath, content, { mode: 0o600 });
}

async function createSecureDirectory(dirPath) {
  // Create directory with restricted permissions
  await fs.mkdir(dirPath, { recursive: true, mode: 0o700 });
}
```

---

## Logging Security

### Sanitize Logs
**Never log sensitive data.**

```javascript
// ❌ LOGS SENSITIVE DATA
logger.info('User login', {
  email: user.email,
  password: req.body.password,  // NEVER LOG PASSWORDS
  token: accessToken            // NEVER LOG TOKENS
});

// ✅ SAFE LOGGING
logger.info('User login', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString()
});
```

### Audit Trail
```javascript
// server/lib/utils/audit-logger.js
async function logSecurityEvent(event) {
  const entry = {
    event_type: event.type,
    user_id: event.userId,
    ip_address: event.ip,
    timestamp: new Date(),
    details: event.details
  };
  
  await pool.query(
    `INSERT INTO security_audit_log (event_type, user_id, ip_address, details)
     VALUES ($1, $2, $3, $4)`,
    [entry.event_type, entry.user_id, entry.ip_address, JSON.stringify(entry.details)]
  );
}

// Usage
await logSecurityEvent({
  type: 'LOGIN_SUCCESS',
  userId: user.id,
  ip: req.ip,
  details: { method: 'google_oauth' }
});
```

---

## Encryption

### Sensitive Data Encryption
```javascript
// server/lib/utils/encryption.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(encrypted.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## Security Checklist

Before deploying:

- [ ] No hardcoded secrets in code
- [ ] Environment variables validated on startup
- [ ] .env files not committed
- [ ] JWT tokens signed with strong secret (32+ chars)
- [ ] Session limits enforced (max 5 per user)
- [ ] Token blacklisting implemented
- [ ] CSRF protection on OAuth flow
- [ ] All database queries parameterized
- [ ] File uploads validated (type, size, malware)
- [ ] Rate limiting applied to all endpoints
- [ ] CORS configured with whitelist
- [ ] File paths sanitized (no path traversal)
- [ ] Sensitive data not logged
- [ ] Security audit log implemented
- [ ] Encryption used for sensitive data
