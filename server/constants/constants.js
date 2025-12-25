// All application constants in one place

module.exports = {
    // ===== TIME CONSTANTS (in milliseconds) =====
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
    FILE_CACHE_TTL_MS: 2 * 60 * 60 * 1000, // 2 hours
    ONE_HOUR_MS: 60 * 60 * 1000,
    THIRTY_SECONDS_MS: 30 * 1000,
    ONE_MINUTE_MS: 60 * 1000,
    TWO_SECONDS_MS: 2 * 1000,
    TEN_SECONDS_MS: 10 * 1000,
    QUEUE_CLEANUP_INTERVAL_MS: 60 * 1000,
    QUEUE_CHECK_INTERVAL_MS: 2 * 1000,
    GITHUB_SITE_CHECK_TIMEOUT_MS: 10 * 1000,

    // ===== FILE SIZE CONSTANTS (in bytes) =====
    MAX_FILE_UPLOAD_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_ARCHIVE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
    MAX_BASE64_IMAGE_SIZE_BYTES: 5 * 1000 * 1000, // 5MB
    MAX_README_SIZE_BYTES: 1024 * 1024, // 1MB

    // ===== RATE LIMIT CONSTANTS =====
    FREE_TIER_RATE_LIMIT: 20,
    DEFAULT_RATE_LIMIT_MAX_REQUESTS: 100,
    FILE_CACHE_MAX_SIZE: 100,
    MAX_SESSIONS_PER_USER: 5,
    TOKEN_BLACKLIST_MAX_SIZE: 10000,
    TOKEN_BLACKLIST_CLEANUP_SIZE: 5000,
    MAX_CONCURRENT_JOBS: 1,
    MEMORY_PRESSURE_THRESHOLD_MB: 400,
    MAX_RETRY_ATTEMPTS: 3,
    BACKOFF_MULTIPLIER: 2,
    MAX_REPO_NAME_ATTEMPTS: 10,

    // ===== SECURITY RATE LIMITS =====
    SECURITY_RATE_LIMITS: {
        CV_OPERATIONS: 50,
        GITHUB_OPERATIONS: 20,
        NO_LIMIT: 999999
    },

    // ===== MIME TYPES =====
    ALLOWED_MIME_TYPES: {
        PDF: 'application/pdf',
        DOC: 'application/msword',
        DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        TEXT: 'text/plain'
    },

    // ===== FILE EXTENSIONS =====
    FILE_EXTENSIONS: {
        CSS: '.css',
        JS: '.js',
        HTML: '.html',
        JSON: '.json',
        PNG: '.png',
        JPG: '.jpg',
        JPEG: '.jpeg'
    },

    // ===== CONTENT TYPES =====
    CONTENT_TYPES: {
        CSS: 'text/css; charset=utf-8',
        JS: 'application/javascript; charset=utf-8',
        HTML: 'text/html; charset=utf-8',
        JSON: 'application/json; charset=utf-8',
        PNG: 'image/png',
        JPEG: 'image/jpeg'
    },

    // ===== GENERATED FILES =====
    GENERATED_FILES: {
        INDEX: 'index.html',
        STYLES: 'styles.css',
        SCRIPT: 'script.js',
        DATA: 'data.js',
        README: 'README.md'
    },

    // ===== JOB STATUS =====
    JOB_STATUS: {
        QUEUED: 'queued',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        FAILED: 'failed',
        UPLOADED: 'uploaded',
        CANCELLED: 'cancelled'
    },

    // ===== DEPLOYMENT STATUS =====
    DEPLOYMENT_STATUS: {
        GENERATED: 'generated',
        PUBLISHED: 'published',
        DEPLOYED: 'deployed'
    },

    // ===== VALIDATION LIMITS =====
    STRING_LIMITS: {
        FILENAME_MAX: 100,
        FILENAME_SANITIZED_MAX: 255,
        SHORT_TEXT_MAX: 500,
        MEDIUM_TEXT_MAX: 2000,
        LONG_TEXT_MAX: 5000,
        VERY_LONG_TEXT_MAX: 10000
    },

    // ===== OTHER =====
    FILE_ENTROPY_THRESHOLD: 7.5
};
