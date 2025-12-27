# Database Guidelines - Landing Page CV

## Core Principle: SQL-First

**No runtime schema management in application code.**

Every database change follows this process:
1. Create migration SQL file
2. Update canonical schema file
3. Run migration manually

---

## Migration Files

### Location
`database/migrations/YYYYMMDD_description.sql`

### Naming Convention
- **Format**: `YYYYMMDD_short_description.sql`
- **Examples**:
  - `20251227_create_users_table.sql`
  - `20251227_add_profile_picture_to_users.sql`
  - `20251228_create_cv_uploads_index.sql`

### Migration Template

```sql
-- Migration: Add feature X
-- Created: 2025-12-27
-- Description: Adds table/column/index for feature X

-- ============================================================
-- UP MIGRATION
-- ============================================================

-- Create new table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes
CREATE INDEX idx_table_name_user_id ON table_name(user_id);
CREATE INDEX idx_table_name_created_at ON table_name(created_at);

-- ============================================================
-- DOWN MIGRATION (for rollback)
-- ============================================================

-- DROP INDEX idx_table_name_created_at;
-- DROP INDEX idx_table_name_user_id;
-- DROP TABLE IF EXISTS table_name;
```

---

## Canonical Schema

### Location
`database/DATABASE_COMPLETE.sql`

### Purpose
- Single source of truth for current database state
- Must always reflect the sum of all migrations
- Used for fresh database setups
- Used as reference documentation

### Update Process
After creating a migration:
1. Apply the same changes to `DATABASE_COMPLETE.sql`
2. Keep tables in alphabetical order
3. Keep indexes grouped with their tables

### Example Section
```sql
-- ============================================================
-- CV UPLOADS TABLE
-- ============================================================

CREATE TABLE cv_uploads (
  upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100),
  file_hash VARCHAR(64),
  status VARCHAR(50) DEFAULT 'uploaded',
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_cv_uploads_user_id ON cv_uploads(user_id);
CREATE INDEX idx_cv_uploads_status ON cv_uploads(status);
CREATE INDEX idx_cv_uploads_upload_date ON cv_uploads(upload_date);
```

---

## Query Patterns

### Use Parameterized Queries
**Always use $1, $2, etc. to prevent SQL injection.**

```javascript
// ❌ BAD: String concatenation (SQL injection risk)
const query = `SELECT * FROM users WHERE email = '${email}'`;
const result = await pool.query(query);

// ✅ GOOD: Parameterized query
const query = 'SELECT * FROM users WHERE email = $1';
const result = await pool.query(query, [email]);
```

### SELECT Specific Columns
**Never use SELECT * in production code.**

```javascript
// ❌ BAD: Returns all columns (wasteful)
const query = 'SELECT * FROM users WHERE id = $1';

// ✅ GOOD: Select only needed columns
const query = `
  SELECT id, email, name, profile_picture
  FROM users
  WHERE id = $1
`;
```

### Use RETURNING Clause
**For INSERT/UPDATE, return the affected data.**

```javascript
// ❌ BAD: Two queries needed
await pool.query('INSERT INTO users (email) VALUES ($1)', [email]);
const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

// ✅ GOOD: Single query with RETURNING
const query = `
  INSERT INTO users (email, name, google_id)
  VALUES ($1, $2, $3)
  RETURNING id, email, name
`;
const result = await pool.query(query, [email, name, googleId]);
const user = result.rows[0];
```

---

## Indexing Strategy

### When to Add Indexes

1. **Foreign Keys**: Always index columns used in JOINs
   ```sql
   CREATE INDEX idx_cv_uploads_user_id ON cv_uploads(user_id);
   ```

2. **WHERE Clauses**: Index columns frequently filtered
   ```sql
   CREATE INDEX idx_cv_uploads_status ON cv_uploads(status);
   ```

3. **ORDER BY**: Index columns used for sorting
   ```sql
   CREATE INDEX idx_cv_uploads_upload_date ON cv_uploads(upload_date DESC);
   ```

4. **Composite Indexes**: For queries filtering multiple columns
   ```sql
   CREATE INDEX idx_sessions_user_expires ON user_sessions(user_id, expires_at);
   ```

### Index Naming Convention
- **Format**: `idx_{table}_{column(s)}`
- **Examples**:
  - `idx_users_email`
  - `idx_cv_uploads_user_id`
  - `idx_sessions_user_expires`

---

## Data Types

### Use Appropriate Types

```sql
-- UUID for primary keys and foreign keys
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- VARCHAR with reasonable limits
email VARCHAR(255) NOT NULL
name VARCHAR(255)

-- TEXT for long content
extracted_text TEXT
file_path TEXT

-- INTEGER for counts and sizes
file_size INTEGER
download_count INTEGER DEFAULT 0

-- BOOLEAN for flags
email_verified BOOLEAN DEFAULT FALSE
is_active BOOLEAN DEFAULT TRUE

-- TIMESTAMP WITH TIME ZONE for all dates
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
last_login TIMESTAMP WITH TIME ZONE

-- JSONB for structured data
structured_data JSONB
metadata JSONB
```

### JSON vs JSONB
**Always use JSONB for JSON columns.**

```sql
-- ❌ BAD: JSON (slower queries, no indexing)
metadata JSON

-- ✅ GOOD: JSONB (faster, indexable)
metadata JSONB
```

---

## Constraints

### Foreign Keys with Cascade
**Always specify ON DELETE behavior.**

```sql
-- ❌ BAD: No cascade defined
FOREIGN KEY (user_id) REFERENCES users(id)

-- ✅ GOOD: Cascade deletion
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- ✅ GOOD: Prevent deletion
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
```

### NOT NULL Constraints
**Be explicit about nullable columns.**

```sql
CREATE TABLE cv_uploads (
  upload_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,              -- Required
  filename VARCHAR(255) NOT NULL,     -- Required
  description TEXT,                   -- Optional (NULL allowed)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Unique Constraints
```sql
-- Single column unique
email VARCHAR(255) UNIQUE NOT NULL

-- Multi-column unique
UNIQUE (user_id, session_id)
```

---

## Query Optimization

### Use EXISTS Instead of COUNT
**For checking existence, use EXISTS.**

```javascript
// ❌ BAD: Counts all rows (slow)
const query = 'SELECT COUNT(*) FROM cv_uploads WHERE user_id = $1';
const result = await pool.query(query, [userId]);
const hasUploads = result.rows[0].count > 0;

// ✅ GOOD: Stops at first match (fast)
const query = 'SELECT EXISTS(SELECT 1 FROM cv_uploads WHERE user_id = $1)';
const result = await pool.query(query, [userId]);
const hasUploads = result.rows[0].exists;
```

### LIMIT Queries
**Always use LIMIT for lists.**

```javascript
// ❌ BAD: Returns all rows (could be millions)
const query = 'SELECT * FROM cv_uploads WHERE user_id = $1';

// ✅ GOOD: Limits results
const query = `
  SELECT upload_id, filename, created_at
  FROM cv_uploads
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT 50
`;
```

### Use JOINs Wisely
**Prefer JOINs over multiple queries.**

```javascript
// ❌ BAD: N+1 query problem
const uploads = await pool.query('SELECT * FROM cv_uploads');
for (const upload of uploads.rows) {
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [upload.user_id]);
}

// ✅ GOOD: Single JOIN query
const query = `
  SELECT 
    u.upload_id,
    u.filename,
    users.name as user_name,
    users.email as user_email
  FROM cv_uploads u
  JOIN users ON users.id = u.user_id
`;
const result = await pool.query(query);
```

---

## Connection Pooling

### Pool Configuration
```javascript
// server/database/db-pool.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                      // Maximum pool size
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 2000 // Fail fast if no connection available
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[DB] Connection failed:', err);
    process.exit(1);
  }
  console.log('[DB] Connected successfully');
});

module.exports = pool;
```

### Connection Best Practices

```javascript
// ✅ GOOD: Use pool for simple queries
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// ✅ GOOD: Get client for transactions
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple queries
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release(); // ALWAYS release
}
```

---

## Error Handling

### Database Error Codes
```javascript
// server/database/cv-database.js
const { DatabaseError } = require('pg');

async function saveUpload(userId, file) {
  try {
    const query = 'INSERT INTO cv_uploads (user_id, filename) VALUES ($1, $2)';
    return await pool.query(query, [userId, file.filename]);
    
  } catch (error) {
    // Handle specific PostgreSQL errors
    if (error.code === '23505') { // Unique violation
      throw new ConflictError('File already exists');
    }
    if (error.code === '23503') { // Foreign key violation
      throw new NotFoundError('User not found');
    }
    
    // Re-throw unknown errors
    throw error;
  }
}
```

### Common PostgreSQL Error Codes
- `23505`: Unique violation
- `23503`: Foreign key violation
- `23502`: Not null violation
- `42P01`: Undefined table
- `42703`: Undefined column

---

## Cleanup and Maintenance

### Scheduled Cleanup Jobs
```javascript
// server/jobs/cleanup-expired-sessions.js
const cron = require('node-cron');
const pool = require('../database/db-pool');

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[CLEANUP] Starting expired session cleanup');
  
  const query = `
    DELETE FROM user_sessions
    WHERE expires_at < NOW()
  `;
  
  const result = await pool.query(query);
  console.log(`[CLEANUP] Deleted ${result.rowCount} expired sessions`);
});
```

---

## Testing Database Code

### Use Transactions in Tests
```javascript
// test/cv-database.test.js
describe('CVDatabase', () => {
  let client;
  
  beforeEach(async () => {
    // Get client and start transaction
    client = await pool.connect();
    await client.query('BEGIN');
  });
  
  afterEach(async () => {
    // Rollback all changes
    await client.query('ROLLBACK');
    client.release();
  });
  
  it('should save upload', async () => {
    const result = await cvDatabase.saveUpload(userId, file);
    expect(result.uploadId).toBeDefined();
  });
});
```

---

## Summary Checklist

Before committing database changes:

- [ ] Migration file created in `database/migrations/`
- [ ] Canonical schema updated in `DATABASE_COMPLETE.sql`
- [ ] Parameterized queries used (no string concatenation)
- [ ] Appropriate indexes added
- [ ] Foreign keys have ON DELETE behavior
- [ ] NOT NULL constraints explicit
- [ ] TIMESTAMP WITH TIME ZONE used for dates
- [ ] JSONB used instead of JSON
- [ ] Connection pool used correctly
- [ ] Errors handled appropriately
- [ ] Cleanup jobs configured if needed
