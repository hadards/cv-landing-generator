# Database Schema

**Navigation**: [Documentation Home](../README.md) > [Database](data-retention.md) > Schema

**Last Updated**: December 26, 2025

---

## Overview

The CV Landing Generator uses **PostgreSQL** (hosted on Supabase free tier) with **11 tables**, **33 indexes**, and **automatic cleanup functions**. The schema is optimized for:

- **Free tier constraints**: Connection pooling (max 20 connections)
- **Data retention policies**: Automatic cleanup of ephemeral data
- **Multi-user support**: Session management and rate limiting
- **Performance**: Strategic indexes for common queries

---

## Complete Schema File

The entire database schema is defined in a single file:

**File**: [`database/DATABASE_COMPLETE.sql`](../../database/DATABASE_COMPLETE.sql)

**Run this once to create all tables, indexes, and functions.**

---

## Tables Overview

### Core Tables (6)

| Table | Purpose | Retention | Records |
|-------|---------|-----------|---------|
| `users` | User accounts (Google OAuth) | Until account deletion | ~1000s |
| `file_uploads` | CV file metadata | Until user deletes | ~10,000s |
| `user_sites` | Generated landing pages metadata | Until user deletes | ~10,000s |
| `cv_processing_sessions` | CV processing pipeline memory | 24 hours | ~100s |
| `processing_logs` | Operation logs for debugging | Indefinite | ~100,000s |
| `user_preferences` | User settings | Until account deletion | ~1000s |

### Security Tables (4)

| Table | Purpose | Retention | Records |
|-------|---------|-----------|---------|
| `user_sessions` | JWT session tracking | 24 hours | ~1000s |
| `token_blacklist` | Revoked JWT tokens | 7 days | ~1000s |
| `api_usage` | Daily API usage tracking | Indefinite (aggregated) | ~10,000s |
| `rate_limits` | Per-user rate limiting | 15-minute rolling window | ~1000s |

### Queue Table (1)

| Table | Purpose | Retention | Records |
|-------|---------|-----------|---------|
| `processing_jobs` | CV processing queue | 24 hours | ~10-100 |

---

## Core Tables

### 1. users

**Purpose**: User accounts created via Google OAuth

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    github_username VARCHAR(255),
    github_token TEXT,
    profile_picture_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Unique user identifier (UUID v4)
- `email`: User's email from Google OAuth (unique constraint)
- `name`: Full name from Google profile
- `google_id`: Google account identifier (unique)
- `github_username`: Connected GitHub username (optional)
- `github_token`: Encrypted GitHub access token (optional, AES-256)
- `profile_picture_url`: Google profile picture URL
- `is_active`: Account status (soft delete support)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp (auto-updated by trigger)

**Indexes**:
- `idx_users_email ON (email)` - Login lookups
- `idx_users_google_id ON (google_id) WHERE google_id IS NOT NULL` - OAuth validation
- `idx_users_github_username ON (github_username) WHERE github_username IS NOT NULL` - GitHub integration
- `idx_users_active ON (is_active) WHERE is_active = true` - Active user queries

**Relationships**:
- **One-to-many** with `file_uploads` (user can upload multiple CVs)
- **One-to-many** with `user_sites` (user can generate multiple landing pages)
- **One-to-one** with `user_preferences` (user has one preferences record)
- **One-to-many** with `user_sessions` (user can have max 5 active sessions)

**Code References**:
- User creation: [`server/routes/auth.js:100-150`](../../server/routes/auth.js)
- User lookup: [`server/database/services.js:20-50`](../../server/database/services.js)

---

### 2. file_uploads

**Purpose**: Tracks all uploaded CV files and processing status

```sql
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64),
    extracted_text TEXT,
    structured_data JSONB,
    processing_status VARCHAR(50) DEFAULT 'uploaded',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Unique upload identifier
- `user_id`: Owner of the upload (foreign key to `users.id`)
- `filename`: Stored filename (randomized for security)
- `original_filename`: Original filename from user
- `filepath`: Full path to file on disk (e.g., `uploads/abc123.pdf`)
- `file_size`: File size in bytes
- `mime_type`: MIME type (application/pdf, application/msword, etc.)
- `file_hash`: SHA-256 hash of file content (deduplication)
- `extracted_text`: Text extracted from PDF/DOC/DOCX
- `structured_data`: JSON data extracted by Gemini AI
- `processing_status`: Current status (`uploaded`, `extracting`, `extracted`, `processing`, `processed`, `error`)
- `created_at`: Upload timestamp
- `updated_at`: Last update timestamp

**Indexes**:
- `idx_file_uploads_user_id ON (user_id)` - User's files queries
- `idx_file_uploads_status ON (processing_status)` - Status filtering
- `idx_file_uploads_created ON (created_at)` - Chronological sorting
- `idx_file_uploads_hash ON (file_hash) WHERE file_hash IS NOT NULL` - Deduplication

**Relationships**:
- **Many-to-one** with `users` (CASCADE delete when user deleted)
- **One-to-many** with `user_sites` (one CV can generate multiple landing pages)

**Important**:
- `extracted_text` and `structured_data` are kept even after file deletion
- Actual file at `filepath` is deleted after 24 hours by file cleanup manager
- Metadata persists until user explicitly deletes it

**Code References**:
- File upload: [`server/routes/cv.js:20-50`](../../server/routes/cv.js)
- Text extraction: [`server/lib/cv-parser-modular.js:50-100`](../../server/lib/cv-parser-modular.js)

---

### 3. user_sites

**Purpose**: Metadata for generated landing pages

```sql
CREATE TABLE user_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_upload_id UUID REFERENCES file_uploads(id) ON DELETE SET NULL,
    site_name VARCHAR(255) NOT NULL,
    repo_name VARCHAR(255) NOT NULL DEFAULT 'cv-landing-page',
    github_url VARCHAR(500),
    pages_url VARCHAR(500),
    cv_data JSONB NOT NULL DEFAULT '{}',
    html_content TEXT,
    css_content TEXT,
    js_content TEXT,
    folder_path VARCHAR(500),
    deployment_status VARCHAR(50) DEFAULT 'generated',
    is_public BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Unique site identifier (also used as `siteId` in file paths)
- `user_id`: Owner of the site
- `file_upload_id`: Original CV file (SET NULL if file deleted)
- `site_name`: User-friendly name
- `repo_name`: GitHub repository name (if published)
- `github_url`: GitHub repository URL (e.g., `https://github.com/user/cv-landing-page`)
- `pages_url`: GitHub Pages URL (e.g., `https://user.github.io/cv-landing-page`)
- `cv_data`: Structured CV data (JSON) used for generation
- `html_content`: Generated HTML content (backup copy)
- `css_content`: Generated CSS content (backup copy)
- `js_content`: Generated JavaScript content (backup copy)
- `folder_path`: File system path (`generated/{userId}/{siteId}/`)
- `deployment_status`: Status (`generated`, `deploying`, `deployed`, `published`, `error`)
- `is_public`: Whether site is publicly discoverable
- `view_count`: Number of times site was previewed
- `created_at`: Site creation timestamp
- `updated_at`: Last modification timestamp

**Indexes**:
- `idx_user_sites_user_id ON (user_id)` - User's sites queries
- `idx_user_sites_status ON (deployment_status)` - Status filtering
- `idx_user_sites_public ON (is_public) WHERE is_public = true` - Public sites discovery
- `idx_user_sites_created ON (created_at)` - Chronological sorting

**Relationships**:
- **Many-to-one** with `users` (CASCADE delete)
- **Many-to-one** with `file_uploads` (SET NULL if file deleted)

**Important**:
- `cv_data`, `html_content`, `css_content`, `js_content` are database backups
- Actual files are at `folder_path` (deleted after 30 days)
- If `github_url` is set, landing page is permanently hosted on GitHub
- If files are cleaned up but GitHub published, user still has access

**Code References**:
- Site generation: [`server/lib/template-processor.js:100-300`](../../server/lib/template-processor.js)
- GitHub publishing: [`server/routes/github.js:50-200`](../../server/routes/github.js)

---

### 4. cv_processing_sessions

**Purpose**: Session memory for multi-step CV processing pipeline

```sql
CREATE TABLE cv_processing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_text_preview TEXT,
    session_data JSONB DEFAULT '{}',
    step_count INTEGER DEFAULT 0,
    current_step VARCHAR(50),
    processing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);
```

**Fields**:
- `id`: Unique session identifier
- `user_id`: User who created the session
- `cv_text_preview`: First 500 characters of extracted CV text (for UI preview)
- `session_data`: Full session data including CV text and processing steps
- `step_count`: Number of processing steps completed
- `current_step`: Current step in the pipeline (`upload`, `extract`, `process`, `generate`)
- `processing_metadata`: Additional processing information (timings, token counts, etc.)
- `created_at`: Session creation timestamp
- `updated_at`: Last session update timestamp
- `expires_at`: Session expiration (24 hours from creation)

**Indexes**:
- `idx_cv_sessions_user_id ON (user_id)` - User's sessions
- `idx_cv_sessions_expires ON (expires_at)` - Cleanup queries
- `idx_cv_sessions_created ON (created_at)` - Recent sessions

**Retention**:
- **24 hours**: Sessions automatically expire
- **Cleanup**: Every 6 hours by scheduled job
- **Purpose**: Prevents data leaks if user abandons processing mid-flow

**Code References**:
- Session creation: [`server/routes/cv.js:100-150`](../../server/routes/cv.js)
- Session cleanup: [`server/lib/services/cv-session-service.js:50-80`](../../server/lib/services/cv-session-service.js)
- Cleanup scheduling: [`server/server.js:322-329`](../../server/server.js)

---

### 5. processing_logs

**Purpose**: Operation logs for monitoring and debugging

```sql
CREATE TABLE processing_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_upload_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE,
    user_site_id UUID REFERENCES user_sites(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    processing_time_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Sequential log ID
- `user_id`: User who performed the operation (optional)
- `file_upload_id`: Related file upload (optional)
- `user_site_id`: Related site (optional)
- `operation`: Operation name (`cv_upload`, `cv_extraction`, `ai_processing`, `site_generation`, etc.)
- `status`: Operation result (`success`, `error`, `timeout`, `rate_limited`)
- `error_message`: Error details if status is `error`
- `processing_time_ms`: Time taken for operation (milliseconds)
- `metadata`: Additional context (file size, AI tokens used, etc.)
- `created_at`: Log entry timestamp

**Indexes**:
- `idx_processing_logs_user_id ON (user_id)` - User activity logs
- `idx_processing_logs_operation ON (operation)` - Operation filtering
- `idx_processing_logs_status ON (status)` - Error queries
- `idx_processing_logs_created ON (created_at)` - Time-based queries

**Retention**: Indefinite (used for analytics and debugging)

**Code References**:
- Logging: [`server/lib/services/logging-service.js`](../../server/lib/services/logging-service.js)

---

### 6. user_preferences

**Purpose**: User-specific application settings

```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    template_preference VARCHAR(50) DEFAULT 'professional',
    theme_preference VARCHAR(50) DEFAULT 'light',
    email_notifications BOOLEAN DEFAULT true,
    privacy_settings JSONB DEFAULT '{"profile_public": false, "sites_discoverable": false}',
    api_settings JSONB DEFAULT '{"github_enabled": false, "vercel_enabled": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Unique preferences ID
- `user_id`: User (one-to-one relationship, unique constraint)
- `template_preference`: Preferred landing page template
- `theme_preference`: UI theme (`light` or `dark`)
- `email_notifications`: Email notification preferences
- `privacy_settings`: Privacy configuration (JSON)
  - `profile_public`: Whether profile is public
  - `sites_discoverable`: Whether sites appear in public gallery
- `api_settings`: API integration settings (JSON)
  - `github_enabled`: GitHub integration enabled
  - `vercel_enabled`: Vercel integration enabled (future feature)
- `created_at`: Preferences creation timestamp
- `updated_at`: Last update timestamp

**Index**:
- `idx_user_preferences_user_id ON (user_id)` - User preferences lookup

**Code References**:
- Preferences management: [`server/routes/user.js:50-100`](../../server/routes/user.js)

---

## Security Tables

### 7. user_sessions

**Purpose**: JWT session tracking for multi-device support

```sql
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Fields**:
- `session_id`: Unique session identifier (random UUID, stored in JWT)
- `user_id`: User who created the session
- `token_id`: Unique token identifier (for blacklisting)
- `created_at`: Session creation timestamp
- `last_activity`: Last API request timestamp (updated on every request)
- `expires_at`: Session expiration (24 hours from creation)

**Indexes**:
- `idx_user_sessions_user_id ON (user_id)` - User's active sessions
- `idx_user_sessions_expires ON (expires_at)` - Cleanup queries

**Session Limits**:
- **Max sessions per user**: 5 concurrent sessions
- **Enforcement**: When creating 6th session, oldest is automatically deleted
- **Expiration**: 24 hours of inactivity

**Retention**:
- **24 hours**: Sessions expire automatically
- **Cleanup**: Daily by scheduled job
- **Manual deletion**: User logout immediately deletes session

**Code References**:
- Session creation: [`server/routes/auth.js:200-250`](../../server/routes/auth.js)
- Session validation: [`server/middleware/verify-token-enhanced.js:30-80`](../../server/middleware/verify-token-enhanced.js)
- Session cleanup: [`server/database/session-store.js:100-130`](../../server/database/session-store.js)

---

### 8. token_blacklist

**Purpose**: Revoked JWT tokens (logout support)

```sql
CREATE TABLE token_blacklist (
    token_id VARCHAR(255) PRIMARY KEY,
    blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Fields**:
- `token_id`: Unique token identifier (from JWT payload)
- `blacklisted_at`: When token was revoked
- `expires_at`: When token would have expired (cleanup after this time)

**Index**:
- `idx_token_blacklist_expires ON (expires_at)` - Cleanup queries

**Retention**:
- **7 days**: Blacklist entries kept for 7 days after token expiration
- **Cleanup**: Daily by scheduled job

**Purpose**:
- Prevents revoked tokens from being reused
- Supports immediate logout (token invalid even before expiration)
- Database-backed (persists across server restarts)

**Code References**:
- Token blacklisting: [`server/routes/auth.js:300-350`](../../server/routes/auth.js)
- Token verification: [`server/middleware/verify-token-enhanced.js:50-70`](../../server/middleware/verify-token-enhanced.js)

---

### 9. api_usage

**Purpose**: Track daily API usage for free tier compliance

```sql
CREATE TABLE api_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_type VARCHAR(50) NOT NULL,
    usage_date DATE NOT NULL,
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, api_type, usage_date)
);
```

**Fields**:
- `id`: Sequential ID
- `user_id`: User making the requests
- `api_type`: API service (`gemini_ai`, `github_api`, etc.)
- `usage_date`: Date of usage (DATE type for aggregation)
- `request_count`: Number of API requests made
- `token_count`: AI tokens consumed (for Gemini AI tracking)
- `created_at`: First request timestamp for this date
- `updated_at`: Last request timestamp for this date

**Indexes**:
- `idx_api_usage_user_id ON (user_id)` - User usage queries
- `idx_api_usage_user_date ON (user_id, usage_date)` - Daily usage lookups
- `idx_api_usage_created ON (created_at)` - Time-based analytics

**Unique Constraint**: `(user_id, api_type, usage_date)` - One record per user per API per day

**Retention**: Indefinite (aggregated for analytics)

**Free Tier Limits**:
- **Gemini AI**: 50 CV generations per user per day
- **GitHub API**: 20 requests per 15 minutes per user

**Code References**:
- Usage tracking: [`server/lib/services/api-usage-service.js`](../../server/lib/services/api-usage-service.js)
- Daily limit check: [`server/routes/cv.js:100-120`](../../server/routes/cv.js)

---

### 10. rate_limits

**Purpose**: Per-user rate limiting (rolling window)

```sql
CREATE TABLE rate_limits (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, endpoint, window_start)
);
```

**Fields**:
- `id`: Sequential ID
- `user_id`: User making the requests
- `endpoint`: API endpoint (e.g., `/api/cv/upload`, `/api/github/publish`)
- `request_count`: Number of requests in this window
- `window_start`: Start of the 15-minute window
- `created_at`: First request in this window
- `updated_at`: Last request in this window

**Indexes**:
- `idx_rate_limits_user_id ON (user_id)` - User rate limits
- `idx_rate_limits_user_endpoint ON (user_id, endpoint, window_start)` - Window lookups
- `idx_rate_limits_cleanup ON (created_at)` - Old records cleanup

**Unique Constraint**: `(user_id, endpoint, window_start)` - One record per user per endpoint per window

**Rate Limits**:
- **General API**: 100 requests per 15 minutes per user
- **CV Operations**: 10 requests per 15 minutes per user
- **GitHub Operations**: 5 requests per 15 minutes per user

**Retention**: Rolling 15-minute windows (old windows automatically deleted)

**Code References**:
- Rate limiting middleware: [`server/middleware/per-user-rate-limit.js`](../../server/middleware/per-user-rate-limit.js)

---

## Queue Table

### 11. processing_jobs

**Purpose**: CV processing queue (single concurrent job globally)

```sql
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL DEFAULT 'cv_processing',
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    position INTEGER DEFAULT 0,
    file_id TEXT,
    structured_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_seconds INTEGER DEFAULT 0,
    estimated_wait_minutes INTEGER DEFAULT 0
);
```

**Fields**:
- `id`: Unique job identifier
- `user_id`: User who submitted the job
- `job_type`: Type of job (currently only `cv_processing`)
- `status`: Job status (`queued`, `processing`, `completed`, `failed`)
- `position`: Queue position (1, 2, 3... or 0 when processing)
- `file_id`: File being processed
- `structured_data`: Result data from AI processing
- `error_message`: Error details if status is `failed`
- `created_at`: Job creation timestamp
- `updated_at`: Last status update timestamp
- `started_at`: When processing began
- `completed_at`: When processing finished
- `processing_time_seconds`: How long processing took
- `estimated_wait_minutes`: Estimated wait time for queued jobs

**Indexes**:
- `idx_processing_jobs_user_id ON (user_id)` - User's jobs
- `idx_processing_jobs_status ON (status)` - Status filtering
- `idx_processing_jobs_position ON (position)` - Queue ordering
- `idx_processing_jobs_created ON (created_at)` - FIFO ordering

**Queue Logic**:
- **Concurrent limit**: 1 job processing at a time (free tier constraint)
- **Position tracking**: Jobs assigned positions 1, 2, 3...
- **FIFO order**: First-in, first-out processing
- **Estimated wait**: Based on average processing time

**Retention**: 24 hours after completion

**Code References**:
- Queue management: [`server/lib/services/queue-service.js`](../../server/lib/services/queue-service.js)
- Job processing: [`server/routes/cv.js:200-300`](../../server/routes/cv.js)

---

## Database Functions

### cleanup_expired_auth_sessions()

**Purpose**: Cleanup expired authentication sessions and blacklisted tokens

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_auth_sessions()
RETURNS TABLE(sessions_deleted INTEGER, tokens_deleted INTEGER) AS $$
DECLARE
    session_count INTEGER;
    token_count INTEGER;
BEGIN
    -- Delete expired sessions
    WITH deleted_sessions AS (
        DELETE FROM user_sessions
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING 1
    )
    SELECT COUNT(*) INTO session_count FROM deleted_sessions;

    -- Delete expired blacklisted tokens
    WITH deleted_tokens AS (
        DELETE FROM token_blacklist
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING 1
    )
    SELECT COUNT(*) INTO token_count FROM deleted_tokens;

    RETURN QUERY SELECT session_count, token_count;
END;
$$ LANGUAGE plpgsql;
```

**Usage**:
```sql
SELECT * FROM cleanup_expired_auth_sessions();
```

**Returns**:
```
sessions_deleted | tokens_deleted
-----------------+----------------
               5 |              12
```

**Scheduled**: Daily by backend server

**Code Reference**: [`server/server.js:309-316`](../../server/server.js)

---

## Indexes Summary

**Total Indexes**: 33

**Users table**: 4 indexes
**File uploads**: 4 indexes
**User sites**: 4 indexes
**CV sessions**: 3 indexes
**Processing logs**: 4 indexes
**User preferences**: 1 index
**Processing jobs**: 4 indexes
**API usage**: 3 indexes
**Rate limits**: 3 indexes
**User sessions**: 2 indexes
**Token blacklist**: 1 index

**Purpose**: Optimize queries for:
- User lookups (email, google_id, github_username)
- File operations (user_id, status, created_at)
- Session validation (user_id, expires_at)
- Rate limiting (user_id, endpoint, window)
- Queue management (status, position)

---

## Triggers

**Purpose**: Automatically update `updated_at` timestamp on record changes

**Function**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Applied to tables**:
- `users`
- `file_uploads`
- `user_sites`
- `cv_processing_sessions`
- `user_preferences`
- `processing_jobs`
- `api_usage`
- `rate_limits`

**Execution**: Before every UPDATE operation

---

## Relationships Diagram

```
users (1) ──────┬──────── (many) file_uploads
                │
                ├──────── (many) user_sites
                │
                ├──────── (many) cv_processing_sessions
                │
                ├──────── (many) user_sessions (max 5)
                │
                ├──────── (many) processing_logs
                │
                ├──────── (many) processing_jobs
                │
                ├──────── (many) api_usage
                │
                └──────── (1) user_preferences

file_uploads (1) ──────── (many) user_sites

```

**CASCADE Rules**:
- Delete user → Deletes all related records (CASCADE)
- Delete file_upload → Sets `user_sites.file_upload_id` to NULL (SET NULL)

---

## Data Retention Summary

| Table | Persistent | Ephemeral | Cleanup |
|-------|-----------|-----------|---------|
| `users` | ✅ Until deletion | ❌ | Manual only |
| `file_uploads` | ✅ Metadata | ❌ | Manual only |
| `user_sites` | ✅ Metadata | ❌ | Manual only |
| `cv_processing_sessions` | ❌ | ✅ 24 hours | Every 6 hours |
| `processing_logs` | ✅ Indefinite | ❌ | Manual only |
| `user_preferences` | ✅ Until deletion | ❌ | Manual only |
| `user_sessions` | ❌ | ✅ 24 hours | Daily |
| `token_blacklist` | ❌ | ✅ 7 days | Daily |
| `api_usage` | ✅ Indefinite | ❌ | None |
| `rate_limits` | ❌ | ✅ 15 minutes | Real-time |
| `processing_jobs` | ❌ | ✅ 24 hours | Every 6 hours |

---

## Setup Instructions

### 1. Create Database (Supabase)

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create new project
3. Navigate to SQL Editor
4. Copy entire contents of `database/DATABASE_COMPLETE.sql`
5. Paste and click "Run"
6. Verify tables created (should see 11 tables)

### 2. Create Database (Local PostgreSQL)

```bash
# Create database
createdb cv_landing_generator

# Run schema
psql -U postgres -d cv_landing_generator -f database/DATABASE_COMPLETE.sql

# Verify tables
psql -U postgres -d cv_landing_generator -c "\dt"
```

### 3. Update .env File

```bash
# Supabase
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres

# Local PostgreSQL
DATABASE_URL=postgresql://localhost:5432/cv_landing_generator
```

---

## Related Documentation

- [Table Relationships](relationships.md) - Foreign keys and ER diagram
- [Database Indexes](indexes.md) - All 33 indexes explained
- [Database Functions](functions.md) - Cleanup and maintenance functions
- [Data Retention](data-retention.md) - What's kept and what's deleted
- [Common Queries](queries.md) - Query patterns and examples

---

**Complete Schema**: All tables, indexes, and functions are in [`database/DATABASE_COMPLETE.sql`](../../database/DATABASE_COMPLETE.sql). Run this file once to set up the entire database.
