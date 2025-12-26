# File Storage Architecture

**Navigation**: [Documentation Home](../README.md) > [Architecture](overview.md) > File Storage

**Last Updated**: December 26, 2025

---

## Overview

The CV Landing Generator uses a **hybrid storage strategy** combining ephemeral file storage for temporary files and persistent PostgreSQL storage for metadata. This approach optimizes for free-tier hosting constraints while maintaining data integrity.

---

## Storage Types

### 1. Ephemeral File Storage (Temporary)

**What it is**: Files stored directly on the server's file system that are **automatically deleted** and **lost on platform restarts**.

**Why ephemeral**: Free-tier hosting platforms like Render and Heroku use **ephemeral disks** that reset when the server restarts. Files are never permanently stored.

**Used for**:
- Uploaded CV files
- Generated landing page websites
- Temporary processing data

---

### 2. Persistent Database Storage

**What it is**: Data stored in **PostgreSQL (Supabase)** that persists across platform restarts.

**Used for**:
- User account information
- CV metadata (filename, user_id, timestamps)
- Site metadata (site_id, user_id, URLs)
- Structured CV data (JSON extracted from CV)
- Session tracking
- Rate limit counters
- API usage statistics

**What's NOT stored**: The actual CV file contents or generated HTML/CSS/JavaScript files. Only metadata about these files.

---

## File Storage Locations

### CV Files: `server/uploads/` Directory

**Where are they saved?**
- Physical location: `C:\Coding\cv-landing-generator\server\uploads\` (local dev)
- Production: `./server/uploads/` on the hosting platform's ephemeral disk

**How are they saved?**
- Code location: [`server/routes/cv.js:20-30`](../../server/routes/cv.js)
- Multer middleware handles the file upload:
```javascript
const upload = multer({
    dest: 'uploads/',  // Files go to server/uploads/
    limits: {
        fileSize: 10 * 1024 * 1024  // 10MB max
    }
});
```

**When are they saved?**
- User uploads CV file via `POST /api/cv/upload` endpoint
- File is immediately written to `uploads/` directory
- Metadata (filename, path, size) is stored in `cv_uploads` table

**What happens to them?**
- **Deletion schedule**: 24 hours after upload
- **Cleanup runs**: Every 4 hours (configurable via `UPLOADS_CLEANUP_INTERVAL_HOURS`)
- **Emergency cleanup**: Triggered when memory usage exceeds 400MB
- **Lost on restart**: All files in `uploads/` are deleted when the platform restarts

**Configuration** (`.env` file):
```bash
UPLOADS_MAX_AGE_HOURS=24              # Keep files for 24 hours
UPLOADS_CLEANUP_INTERVAL_HOURS=4     # Run cleanup every 4 hours
```

**Cleanup implementation**: [`server/lib/file-cleanup.js:50-80`](../../server/lib/file-cleanup.js)

---

### Generated Websites: `server/generated/{userId}/{siteId}/` Directory

**Where are they saved?**
- Physical location: `C:\Coding\cv-landing-generator\server\generated\{userId}\{siteId}\` (local dev)
- Production: `./server/generated/{userId}/{siteId}/` on ephemeral disk

**Directory structure**:
```
server/generated/
└── {userId}/
    └── {siteId}/
        ├── index.html        # Main landing page
        ├── styles.css        # Styling
        ├── script.js         # Interactivity
        ├── data.js          # Structured CV data
        └── README.md        # Deployment instructions
```

**How are they saved?**
- Code location: [`server/lib/template-processor.js:200-300`](../../server/lib/template-processor.js)
- Template processor generates files from CV data:
```javascript
const outputDir = path.join(__dirname, '../generated', userId, siteId);
fs.mkdirSync(outputDir, { recursive: true });

// Generate each file
fs.writeFileSync(path.join(outputDir, 'index.html'), htmlContent);
fs.writeFileSync(path.join(outputDir, 'styles.css'), cssContent);
fs.writeFileSync(path.join(outputDir, 'script.js'), jsContent);
fs.writeFileSync(path.join(outputDir, 'data.js'), dataContent);
fs.writeFileSync(path.join(outputDir, 'README.md'), readmeContent);
```

**When are they saved?**
- User completes CV processing via `POST /api/cv/generate` endpoint
- Template processor creates directory and writes all 5 files
- Metadata stored in `generated_sites` table (user_id, site_id, created_at, file_path)

**What happens to them?**
- **Deletion schedule**: 30 days (720 hours) after creation
- **Cleanup runs**: Every 12 hours (configurable via `GENERATED_CLEANUP_INTERVAL_HOURS`)
- **Post-download grace period**: 5-minute timer starts after user downloads ZIP
- **Emergency cleanup**: Triggered during memory pressure
- **Lost on restart**: All files in `generated/` are deleted when platform restarts

**Configuration** (`.env` file):
```bash
GENERATED_MAX_AGE_HOURS=720           # 30 days = 720 hours
GENERATED_CLEANUP_INTERVAL_HOURS=12  # Run cleanup every 12 hours
```

**Cleanup implementation**: [`server/lib/file-cleanup.js:82-115`](../../server/lib/file-cleanup.js)

---

## Database Storage

### What's Stored in PostgreSQL (Supabase)

**Persistent data** (kept until account deletion):
- User accounts: `users` table
  - Google OAuth data (email, name, profile picture, google_id)
  - Account creation timestamp
  - GitHub integration status
- CV metadata: `cv_uploads` table
  - Filename, file size, MIME type
  - Upload timestamp, user_id
  - File hash for deduplication
- Site metadata: `generated_sites` table
  - site_id, user_id, created_at
  - File path, download count
  - GitHub repository URL (if published)
- Structured CV data: `cv_processing_sessions` table
  - JSON data extracted by Gemini AI
  - Processing steps and results
- GitHub integration: `github_connections` table
  - Encrypted GitHub access tokens
  - GitHub username, connection status
- User preferences: `user_preferences` table
  - Template selection, theme preferences

**Ephemeral data** (automatically deleted):
- Authentication sessions: `user_sessions` table (24 hours)
- Revoked tokens: `token_blacklist` table (7 days)
- CV processing sessions: `cv_processing_sessions` table (24 hours)
- Rate limit counters: `rate_limits` table (rolling 15-minute windows)
- API usage logs: `api_usage` table (retained for analytics)

**Database location**: [`database/DATABASE_COMPLETE.sql`](../../database/DATABASE_COMPLETE.sql)

---

## File Cleanup System

### Cleanup Manager

**Implementation**: [`server/lib/file-cleanup.js`](../../server/lib/file-cleanup.js)

**Cleanup strategies**:
1. **Scheduled cleanup**: Runs at regular intervals
2. **Age-based cleanup**: Deletes files older than configured maximum age
3. **Orphaned file cleanup**: Removes files without database references
4. **Emergency cleanup**: Triggered during memory pressure

**Cleanup triggers**:

| Trigger Type | Frequency | Target | Configuration |
|-------------|-----------|--------|---------------|
| Uploads cleanup | Every 4 hours | Files older than 24 hours | `UPLOADS_CLEANUP_INTERVAL_HOURS` |
| Generated sites cleanup | Every 12 hours | Files older than 30 days | `GENERATED_CLEANUP_INTERVAL_HOURS` |
| Orphaned files check | Every 24 hours | Files without DB records | `ORPHANED_CHECK_INTERVAL_HOURS` |
| CV processing sessions | Every 6 hours | Sessions older than 24 hours | Hardcoded in `server.js:322-329` |
| Auth sessions | Every 24 hours | Expired sessions/tokens | Hardcoded in `server.js:309-316` |
| Memory pressure | Real-time | All eligible files | Triggered at 400MB memory usage |

**Cleanup execution flow**:
```
1. Cleanup timer fires
2. Scan target directory (uploads/ or generated/)
3. Get file stats (creation time, size)
4. Compare age vs MAX_AGE configuration
5. Delete files exceeding age limit
6. Remove orphaned database records
7. Log cleanup results
```

**Emergency cleanup** (memory pressure):
- Code location: [`server/server.js:256-303`](../../server/server.js)
- Triggers when heap memory exceeds 400MB (configurable)
- Immediately deletes all eligible files
- Forces garbage collection if available
- Rejects new CV processing requests until memory stabilizes

---

## Platform Restart Behavior

### What Happens on Restart?

**Ephemeral storage reset**:
- **All files deleted**: `uploads/` and `generated/` directories are completely wiped
- **No recovery possible**: Files cannot be restored after platform restart
- **Database intact**: PostgreSQL data persists (user accounts, metadata remain)

**Why this happens**:
- Free-tier hosting platforms (Render, Heroku, Vercel) use **ephemeral file systems**
- Platform restarts occur during:
  - Automatic daily restarts (free tier limitation)
  - Deployments and updates
  - Platform maintenance
  - Resource allocation changes
  - Inactivity sleep (platform may sleep after 30 minutes of no requests)

**User impact**:
- Files must be downloaded before platform restart
- Generated sites should be published to GitHub Pages for persistence
- CV files are lost, but structured data remains in `cv_processing_sessions` table (for 24 hours)

---

## Data Retention Summary

### Quick Reference Table

| Data Type | Storage Location | Retention Period | Cleanup Frequency | Lost on Restart? |
|-----------|-----------------|------------------|-------------------|------------------|
| **Uploaded CV files** | `server/uploads/` | 24 hours | Every 4 hours | ✅ Yes |
| **Generated websites** | `server/generated/` | 30 days | Every 12 hours | ✅ Yes |
| **User accounts** | `users` table | Until deletion | N/A | ❌ No |
| **CV metadata** | `cv_uploads` table | Until deletion | N/A | ❌ No |
| **Structured CV data** | `cv_processing_sessions` | 24 hours | Every 6 hours | ❌ No |
| **Site metadata** | `generated_sites` table | Until deletion | N/A | ❌ No |
| **Auth sessions** | `user_sessions` table | 24 hours | Daily | ❌ No |
| **Revoked tokens** | `token_blacklist` table | 7 days | Daily | ❌ No |
| **GitHub tokens** | `github_connections` table | Until disconnected | N/A | ❌ No |
| **API usage stats** | `api_usage` table | Indefinite | N/A | ❌ No |
| **Rate limit counters** | In-memory | 15 minutes | Rolling window | ✅ Yes |

---

## Configuration Reference

### Environment Variables

File: [`.env`](../../.env)

```bash
# File Upload Configuration
MAX_FILE_SIZE=                          # Default: 50MB (for uploads)

# File Cleanup Configuration
UPLOADS_MAX_AGE_HOURS=24                # CV files retention (hours)
UPLOADS_MAX_FILES=1000                  # Max files in uploads/ (safety limit)
UPLOADS_CLEANUP_INTERVAL_HOURS=4        # How often to run uploads cleanup

GENERATED_MAX_AGE_HOURS=720             # Generated sites retention (30 days)
GENERATED_MAX_FILES=500                 # Max sites in generated/ (safety limit)
GENERATED_CLEANUP_INTERVAL_HOURS=12     # How often to run generated cleanup

ORPHANED_CHECK_INTERVAL_HOURS=24        # Orphaned file cleanup frequency

# Memory Pressure Configuration
MEMORY_PRESSURE_THRESHOLD=400           # Memory limit in MB before emergency cleanup
```

---

## Code References

### File Upload
- **Route**: [`server/routes/cv.js:20-50`](../../server/routes/cv.js)
- **Multer configuration**: `dest: 'uploads/'`
- **File validation**: [`server/middleware/file-validation.js`](../../server/middleware/file-validation.js)

### Landing Page Generation
- **Template processor**: [`server/lib/template-processor.js`](../../server/lib/template-processor.js)
- **Output directory**: `server/generated/{userId}/{siteId}/`
- **Files created**: index.html, styles.css, script.js, data.js, README.md

### File Cleanup
- **Manager**: [`server/lib/file-cleanup.js`](../../server/lib/file-cleanup.js)
- **Initialization**: [`server/server.js:359-365`](../../server/server.js)
- **Graceful shutdown**: [`server/server.js:372-432`](../../server/server.js)

### Memory Pressure
- **Monitoring**: [`server/server.js:256-290`](../../server/server.js)
- **Protection**: [`server/server.js:292-302`](../../server/server.js)
- **Check interval**: Every 30 seconds

### Database Schema
- **Complete schema**: [`database/DATABASE_COMPLETE.sql`](../../database/DATABASE_COMPLETE.sql)
- **Cleanup functions**: Lines 400-450 in schema file

---

## Related Documentation

- [Architecture Overview](overview.md) - System architecture
- [Data Flow Diagrams](data-flow.md) - How data moves through the system
- [File Cleanup Feature](../features/file-cleanup.md) - Detailed cleanup strategies
- [Database Schema](../database/schema.md) - Table structures
- [Data Retention](../database/data-retention.md) - What's kept and what's deleted
- [Deployment Guide](../deployment/production-checklist.md) - Production considerations

---

**Key Takeaway**: CV files are stored in `server/uploads/` (deleted after 24 hours), generated websites in `server/generated/{userId}/{siteId}/` (deleted after 30 days), and all files are lost on platform restarts. Only metadata persists in PostgreSQL.
