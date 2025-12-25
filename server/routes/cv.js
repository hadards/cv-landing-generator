// File: server/routes/cv.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { body, param, query, validationResult } = require('express-validator');

const IntelligentCVProcessor = require('../lib/intelligent-cv-processor');
const TemplateProcessor = require('../lib/template-processor');
const securePaths = require('../lib/utils/secure-paths');
const InputSanitizer = require('../lib/utils/input-sanitizer');
const {
    saveGeneratedSite,
    getGeneratedSiteById,
    updateSiteDeployment,
    logProcessing,
    createOrUpdateUser,
    getUserById,
    saveFileUpload,    // Added for persistence
    updateFileUpload   // Added for persistence
} = require('../database/services');
const {
    monitorFileUpload,
    recordCVProcessing,
    recordLandingPageGeneration
} = require('../middleware/monitoring');
const { authorizeResourceOwnership, authorizeFileAccess } = require('../middleware/authorization');
const { verifyTokenEnhanced } = require('../middleware/enhanced-auth');
const { cvSecurity, rateLimitOnly } = require('../middleware/security');
const { handleValidationErrors } = require('../middleware/validation');
const metricsCollector = require('../lib/metrics-collector');
const { sendServerError, sendBadRequest } = require('../lib/utils/response-helpers');

// Import constants
const {
    MAX_FILE_UPLOAD_SIZE_BYTES,
    MAX_ARCHIVE_SIZE_BYTES,
    MAX_BASE64_IMAGE_SIZE_BYTES,
    MAX_README_SIZE_BYTES,
    ALLOWED_MIME_TYPES,
    FILE_EXTENSIONS,
    CONTENT_TYPES,
    GENERATED_FILES,
    FILE_ENTROPY_THRESHOLD,
    FILE_CACHE_TTL_MS,
    FILE_CACHE_MAX_SIZE,
    JOB_STATUS
} = require('../constants');

const router = express.Router();

// Initialize services
const templateProcessor = new TemplateProcessor();
const intelligentProcessor = new IntelligentCVProcessor();

// Initialize simple queue manager (will be created after tempFileCache)
let queueManager;

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: MAX_FILE_UPLOAD_SIZE_BYTES,
    },
    fileFilter: (req, file, cb) => {
        // Basic MIME type validation
        const allowedTypes = [
            ALLOWED_MIME_TYPES.PDF,
            ALLOWED_MIME_TYPES.DOC,
            ALLOWED_MIME_TYPES.DOCX,
            // Allow text files for testing
            ALLOWED_MIME_TYPES.TEXT
        ];

        // Sanitize filename - remove dangerous characters
        const sanitizedFilename = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .substring(0, 100); // Limit filename length

        file.originalname = sanitizedFilename;

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
        }
    }
});

// Helper function to calculate Shannon entropy (for malware detection)
function calculateEntropy(buffer) {
    const frequencies = new Map();
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
    }

    let entropy = 0;
    for (const count of frequencies.values()) {
        const probability = count / buffer.length;
        entropy -= probability * Math.log2(probability);
    }

    return entropy;
}

/**
 * Set CORS headers and handle OPTIONS preflight requests
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {string} allowedMethods - Comma-separated list of allowed HTTP methods
 * @param {string} allowedHeaders - Comma-separated list of allowed headers
 * @returns {boolean} True if OPTIONS request was handled, false otherwise
 */
function handleCors(req, res, allowedMethods = 'GET, OPTIONS', allowedHeaders = 'Content-Type') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }

    return false;
}

/**
 * Get site record and output directory, or send 404 response
 * @param {string} siteId - The site ID
 * @param {object} res - Express response object
 * @param {string} notFoundMessage - Error message for 404 response
 * @returns {Promise<{siteRecord: object, outputDir: string}|null>} Site data or null if not found
 */
async function getSiteRecordAndPath(siteId, res, notFoundMessage = 'Site not found') {
    const siteRecord = await getGeneratedSiteById(siteId);

    if (!siteRecord) {
        res.status(404).json({ error: notFoundMessage });
        return null;
    }

    const { siteDir: outputDir } = securePaths.getSecureGeneratedPath(siteRecord.user_id, siteRecord.id);

    return { siteRecord, outputDir };
}

// File content validation middleware
const validateFileContent = async (req, res, next) => {
    console.log('File validation middleware hit, file:', req.file ? req.file.originalname : 'no file');
    if (!req.file) {
        console.log('Validation failed: No file in request');
        return sendBadRequest(res, 'No file uploaded');
    }

    try {
        const file = req.file;
        const filePath = file.path;
        
        // Read first few bytes to check file signature
        const buffer = await fs.promises.readFile(filePath);
        const fileSignature = buffer.toString('hex', 0, 8).toLowerCase();
        
        // File signature validation with enhanced DOCX checking
        const validSignatures = {
            'pdf': ['25504446'], // %PDF
            'doc': ['d0cf11e0'], // Microsoft Office
            'docx': ['504b0304'], // ZIP signature (DOCX is a ZIP file)
        };
        
        let isValidFile = false;
        let detectedType = null;
        
        for (const [type, signatures] of Object.entries(validSignatures)) {
            if (signatures.some(sig => fileSignature.startsWith(sig))) {
                detectedType = type;
                isValidFile = true;
                break;
            }
        }
        
        // Enhanced DOCX validation - check for Office document structure
        if (detectedType === 'docx') {
            try {
                // Read more bytes to validate DOCX structure
                const extendedBuffer = buffer.slice(0, Math.min(2048, buffer.length));
                const zipContent = extendedBuffer.toString('latin1'); // Use latin1 for better binary compatibility
                
                // Check for Office document indicators in ZIP structure
                const hasContentTypes = zipContent.includes('Content_Types') || zipContent.includes('[Content_Types].xml');
                const hasWordDir = zipContent.includes('word/') || zipContent.includes('document.xml');
                
                // Be more lenient - if it's a ZIP file and has some Office indicators, allow it
                if (!hasContentTypes && !hasWordDir) {
                    console.log('DOCX validation warning: May not be a valid Office document, but allowing ZIP file');
                    // Don't fail validation, just log warning
                }
            } catch (zipError) {
                console.log('DOCX validation warning: Cannot fully parse ZIP structure, but allowing', zipError.message);
                // Don't fail validation for parsing errors
            }
        }
        
        if (!isValidFile) {
            console.log('File validation failed:', {
                filename: file.originalname,
                mimetype: file.mimetype,
                signature: fileSignature,
                detectedType: detectedType,
                fileSize: buffer.length
            });
            // Clean up invalid file
            await fs.promises.unlink(filePath).catch(() => {});
            return res.status(400).json({ 
                error: 'Invalid file content. File signature does not match expected format.' 
            });
        }
        
        // Additional size check (double-checking multer limits)
        if (buffer.length > 10 * 1024 * 1024) {
            await fs.promises.unlink(filePath).catch(() => {});
            return res.status(400).json({ 
                error: 'File too large. Maximum size is 10MB.' 
            });
        }
        
        // ENHANCED: Check for potential malicious content patterns (deeper scan)
        const scanSize = Math.min(8192, buffer.length); // Scan first 8KB
        const fileContent = buffer.toString('utf8', 0, scanSize);

        // Enhanced malicious patterns detection
        const maliciousPatterns = [
            /<script/i,
            /javascript:/i,
            /vbscript:/i,
            /onload=/i,
            /onerror=/i,
            /onclick=/i,
            /onmouseover=/i,
            /<iframe/i,
            /<embed/i,
            /<object/i,
            /eval\(/i,
            /Function\(/i,
            /\.exe\b/i,
            /\.bat\b/i,
            /\.cmd\b/i,
            /\.sh\b/i,
            /base64.*eval/i
        ];

        if (maliciousPatterns.some(pattern => pattern.test(fileContent))) {
            metricsCollector.recordSecurityEvent('malicious_file_upload', {
                filename: file.originalname,
                mimetype: file.mimetype,
                size: buffer.length
            });
            await fs.promises.unlink(filePath).catch(() => {});
            return res.status(400).json({
                error: 'File contains potentially malicious content.'
            });
        }

        // ENHANCED: PDF-specific validation
        if (detectedType === 'pdf') {
            // Check for PDF with JavaScript (common attack vector)
            if (buffer.toString('utf8').includes('/JavaScript')) {
                console.log('PDF contains JavaScript - potential security risk');
                await fs.promises.unlink(filePath).catch(() => {});
                return res.status(400).json({
                    error: 'PDF files with JavaScript are not allowed for security reasons.'
                });
            }

            // Check for embedded files in PDF
            if (buffer.toString('utf8').includes('/EmbeddedFile')) {
                console.log('PDF contains embedded files - potential security risk');
                await fs.promises.unlink(filePath).catch(() => {});
                return res.status(400).json({
                    error: 'PDF files with embedded files are not allowed for security reasons.'
                });
            }
        }

        // ENHANCED: Check file entropy (high entropy may indicate encrypted/packed malware)
        const entropy = calculateEntropy(buffer.slice(0, Math.min(4096, buffer.length)));
        if (entropy > FILE_ENTROPY_THRESHOLD) {
            console.log('File has unusually high entropy:', entropy);
            // Don't reject automatically but log warning
            console.warn('Warning: High entropy file detected - possible encryption or compression');
        }

        // Sanitize filename before proceeding
        file.originalname = InputSanitizer.sanitizeFilename(file.originalname);

        next();
    } catch (error) {
        console.error('File validation error:', error);
        if (req.file && req.file.path) {
            await fs.promises.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ error: 'File validation failed' });
    }
};

// Note: Using enhanced JWT verification from middleware/enhanced-auth.js

// Enhanced authentication that accepts tokens from headers or query parameters
const verifyTokenEnhancedWithQuery = async (req, res, next) => {
    try {
        // Check for token in Authorization header first
        let token = null;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            // Allow token as query parameter for iframe requests
            token = req.query.token;
        }
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_TOKEN'
            });
        }
        
        // Create a temporary request object with the token in the header format
        req.headers.authorization = `Bearer ${token}`;
        
        // Use the existing enhanced verification
        return verifyTokenEnhanced(req, res, next);
        
    } catch (error) {
        console.error('Token verification with query error:', error);
        res.status(500).json({ 
            error: 'Authentication verification failed',
            code: 'AUTH_ERROR'
        });
    }
};

// File processing storage - now using database instead of in-memory Maps
// Keep temporary file cache for processing (files are cleaned up after processing)
class SecureFileCache {
    constructor(maxSize = FILE_CACHE_MAX_SIZE, ttlMs = FILE_CACHE_TTL_MS) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }

    set(key, value) {
        // Remove expired entries
        this.cleanExpired();
        
        // Enforce size limit
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value: value,
            timestamp: Date.now()
        });
    }

    get(key) {
        this.cleanExpired();
        const entry = this.cache.get(key);
        return entry ? entry.value : undefined;
    }

    cleanExpired() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttlMs) {
                this.cache.delete(key);
            }
        }
    }

    delete(key) {
        return this.cache.delete(key);
    }
}

const tempFileCache = new SecureFileCache();

// Initialize simple queue manager with file cache access
const SimpleQueueManager = require('../lib/simple-queue-manager');
const { query: dbQuery } = require('../database/index');
queueManager = new SimpleQueueManager({ query: dbQuery }, tempFileCache);

// Export for external access if needed
module.exports.tempFileCache = tempFileCache;

// File upload endpoint (uses rateLimitOnly - file uploads are exempt from CSRF)
router.post('/upload', verifyTokenEnhanced, ...rateLimitOnly, upload.single('cvFile'), validateFileContent, monitorFileUpload, async (req, res) => {
    try {
        console.log('Upload endpoint hit, file:', req.file ? req.file.originalname : 'no file');
        const uploadedFile = req.file;
        
        if (!uploadedFile) {
            console.log('Upload failed: No file uploaded');
            return sendBadRequest(res, 'No file uploaded');
        }

        const fileInfo = {
            id: randomUUID(),
            originalName: uploadedFile.originalname,
            filename: uploadedFile.filename,
            path: uploadedFile.path,
            size: uploadedFile.size,
            mimetype: uploadedFile.mimetype,
            uploadedAt: new Date().toISOString(),
            userId: req.user.userId,
            status: 'uploaded'
        };

        // Store temporarily for processing
        tempFileCache.set(fileInfo.id, fileInfo);
        
        // PERSISTENCE: Save to Database immediately
        try {
            await saveFileUpload({
                id: fileInfo.id,
                user_id: req.user.userId,
                filename: fileInfo.filename,
                original_filename: fileInfo.originalName, // Note: services.js needs to handle this or ignore it
                filepath: fileInfo.path,
                file_size: fileInfo.size,
                mime_type: fileInfo.mimetype,
                extracted_text: null,
                structured_data: null
            });
            console.log('File metadata persisted to DB:', fileInfo.id);
        } catch (dbError) {
            console.error('Failed to persist file upload to DB:', dbError.message);
            // Continue processing even if DB save fails, relying on cache as fallback
        }
        
        // Log file upload to database
        await logProcessing(req.user.userId, 'file_upload', 'success', null, null);

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            file: fileInfo
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
});

// Process CV file endpoint
router.post('/process',
    verifyTokenEnhanced,
    ...rateLimitOnly,
    [
        body('fileId').isString().trim().isLength({ min: 1, max: 100 })
            .withMessage('Valid file ID is required'),
        body('profilePicture').optional().isString()
            .isLength({ max: 5000000 }) // ~5MB base64 limit
            .withMessage('Profile picture too large')
    ],
    handleValidationErrors,
    authorizeFileAccess(tempFileCache),
    async (req, res) => {
        console.log('=== CV Processing Request ===');
        console.log('User:', req.user ? `${req.user.userId} (${req.user.email})` : 'None');
        console.log('Body:', { fileId: req.body?.fileId, hasProfilePicture: !!req.body?.profilePicture });
    try {
        const { fileId } = req.body;
        
        if (!fileId) {
            return res.status(400).json({ error: 'File ID is required' });
        }

        const fileInfo = tempFileCache.get(fileId);
        if (!fileInfo) {
            return res.status(404).json({ error: 'File not found' });
        }

        console.log('Processing CV file:', fileInfo.originalName);
        const processingStartTime = Date.now();

        // Extract text from the uploaded file
        console.log('Extracting text from file...');
        const extractedText = await intelligentProcessor.extractTextFromFile(fileInfo.path, fileInfo.mimetype);
        console.log('Extracted text length:', extractedText.length);

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from the file');
        }

        // Store extracted text in file info for queue processing
        fileInfo.extractedText = extractedText;
        tempFileCache.set(fileId, fileInfo);

        // PERSISTENCE: Update Database with extracted text
        try {
            await updateFileUpload(fileId, {
                extracted_text: extractedText,
                structured_data: {} // Initialize structured data
            });
            console.log('Extracted text persisted to DB for file:', fileId);
        } catch (dbError) {
            console.error('Failed to update file upload in DB:', dbError.message);
            // Continue processing
        }

        // Add job to queue
        console.log('Adding CV processing job to queue...');
        const queueResult = await queueManager.addJob(req.user.userId, fileId);
        
        // Update file status to queued
        fileInfo.status = JOB_STATUS.QUEUED;
        fileInfo.queuedAt = new Date().toISOString();
        fileInfo.jobId = queueResult.jobId;
        tempFileCache.set(fileId, fileInfo);

        // Return queue information
        res.status(202).json({
            success: true,
            message: `You are #${queueResult.position} in line. Estimated wait time: ${queueResult.estimatedWaitMinutes} minutes`,
            jobId: queueResult.jobId,
            position: queueResult.position,
            estimatedWaitMinutes: queueResult.estimatedWaitMinutes,
            fileId: fileId,
            status: JOB_STATUS.QUEUED,
            queuedAt: queueResult.queuedAt
        });

    } catch (error) {
        console.error('CV processing error:', error);
        res.status(500).json({
            error: 'CV processing failed',
            message: error.message
        });
    }
});

// Get file status endpoint
router.get('/status', 
    verifyTokenEnhanced, 
    authorizeFileAccess(tempFileCache), 
    async (req, res) => {
    try {
        const { fileId } = req.query;
        
        if (!fileId) {
            return res.status(400).json({ error: 'File ID is required' });
        }

        const fileInfo = tempFileCache.get(fileId);
        if (!fileInfo) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.status(200).json({
            success: true,
            file: fileInfo
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Status check failed',
            message: error.message
        });
    }
});

// Generate landing page endpoint
router.post('/generate',
    verifyTokenEnhanced,
    ...rateLimitOnly,
    [
        body('structuredData').isObject().withMessage('Structured CV data is required'),
        body('structuredData.personalInfo').isObject().withMessage('Personal information is required'),
        body('structuredData.personalInfo.name').isString().trim().isLength({ min: 1, max: 100 })
            .withMessage('Valid name is required'),
        body('structuredData.personalInfo.email').isEmail().normalizeEmail()
            .withMessage('Valid email is required')
    ],
    handleValidationErrors,
    async (req, res) => {
    try {
        let { structuredData } = req.body;

        if (!structuredData) {
            return res.status(400).json({ error: 'Structured CV data is required' });
        }

        // Validate that this is real CV data, not mock
        if (!structuredData.personalInfo?.name || !structuredData.personalInfo?.email) {
            return res.status(400).json({ error: 'Invalid CV data - missing required personal information' });
        }

        // SECURITY: Sanitize all user input to prevent XSS attacks
        structuredData = InputSanitizer.sanitizeCVData(structuredData);

        // Validate profile picture if present
        if (structuredData.personalInfo?.profilePicture) {
            const validation = InputSanitizer.validateBase64Image(structuredData.personalInfo.profilePicture);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
        }

        console.log('Generating landing page for:', structuredData.personalInfo.name);
        console.log('User ID:', req.user.userId);
        const generationStartTime = Date.now();

        // Create site record in database first to get the ID
        const siteName = `${structuredData.personalInfo.name} CV Landing Page`;

        const siteRecord = await saveGeneratedSite({
            id: randomUUID(),
            user_id: req.user.userId,
            name: siteName,
            structured_data: structuredData,
            html_content: null, // Will be set after generation
            css_content: null,  // Will be set after generation
            folder_path: null   // Will be set after generation
        });

        // Generate the landing page using the site ID as directory name
        const { siteDir: outputDir } = securePaths.getSecureGeneratedPath(req.user.userId, siteRecord.id);
        console.log('CV Generation - Creating directory:', outputDir);
        console.log('CV Generation - User ID:', req.user.userId);
        console.log('CV Generation - Site ID:', siteRecord.id);
        await securePaths.ensureSecureDirectory(outputDir);
        const result = await templateProcessor.generateLandingPage(structuredData, outputDir);
        
        // Update the site record with generated content and paths
        const htmlContent = fs.existsSync(path.join(outputDir, 'index.html')) ? 
            fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8') : null;
        const cssContent = fs.existsSync(path.join(outputDir, 'styles.css')) ? 
            fs.readFileSync(path.join(outputDir, 'styles.css'), 'utf8') : null;
        
        await updateSiteDeployment(siteRecord.id, {
            deployment_status: 'generated',
            html_content: htmlContent,
            css_content: cssContent,
            folder_path: outputDir
        });
        
        const generationTime = Date.now() - generationStartTime;
        recordLandingPageGeneration(req.user.userId, generationTime);

        // Store generation info (keeping for compatibility)
        const generationInfo = {
            id: siteRecord.id,
            userId: req.user.userId,
            outputDir: outputDir,
            generatedAt: new Date().toISOString(),
            files: result.files,
            cvData: structuredData,
            personName: structuredData.personalInfo.name
        };
        
        // Log successful generation
        await logProcessing(req.user.userId, 'landing_page_generation', 'success', null, null);

        console.log('Landing page generated successfully for:', structuredData.personalInfo.name);

        res.status(200).json({
            success: true,
            message: `Landing page generated successfully for ${structuredData.personalInfo.name}`,
            generation: generationInfo,
            previewUrl: `/preview/${generationInfo.id}`
        });

    } catch (error) {
        console.error('Landing page generation error:', error);
        res.status(500).json({
            error: 'Generation failed',
            message: error.message
        });
    }
});

// Preview landing page endpoint
router.get('/preview', 
    [
        query('previewId').isUUID().withMessage('Valid preview ID is required')
    ],
    handleValidationErrors,
    verifyTokenEnhancedWithQuery,
    authorizeResourceOwnership('generated_site'),
    async (req, res) => {
    // Set CORS headers for iframe embedding
    if (handleCors(req, res, 'GET, POST, PUT, DELETE, OPTIONS', 'Content-Type, Authorization')) return;

    try {
        const { previewId } = req.query;
        
        if (!previewId) {
            return res.status(400).json({ error: 'Preview ID is required' });
        }

        console.log('Loading preview for ID:', previewId);

        // Get site info from database
        const result = await getSiteRecordAndPath(previewId, res, 'Preview not found');
        if (!result) return;
        const { siteRecord, outputDir } = result;

        // Build generation info for compatibility
        const generationInfo = {
            id: siteRecord.id,
            userId: siteRecord.user_id,
            outputDir: outputDir,
            personName: siteRecord.cv_data?.personalInfo?.name || 'User'
        };

        const indexPath = path.join(outputDir, 'index.html');
        
        // Read the HTML file atomically to avoid TOCTOU
        let htmlContent;
        try {
            htmlContent = fs.readFileSync(indexPath, 'utf8');
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({ error: 'Generated files not found' });
            }
            throw error;
        }

        // Update relative paths to work with our static file server
        // Include token in static file URLs for iframe access
        const token = req.query.token || req.headers.authorization?.substring(7);
        const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
        const baseUrl = `${req.protocol}://${req.get('host')}/api/cv/static?previewId=${previewId}&file=`;
        
        // Replace CSS and JS references
        htmlContent = htmlContent.replace(
            /href="styles\.css"/g, 
            `href="${baseUrl}styles.css${tokenParam}"`
        );
        
        htmlContent = htmlContent.replace(
            /src="data\.js"/g, 
            `src="${baseUrl}data.js${tokenParam}"`
        );
        
        htmlContent = htmlContent.replace(
            /src="script\.js"/g, 
            `src="${baseUrl}script.js${tokenParam}"`
        );

        // Set proper headers
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        
        console.log('Serving preview HTML for:', generationInfo.personName);
        res.status(200).send(htmlContent);

    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({
            error: 'Preview failed',
            message: error.message
        });
    }
});

// Static file handler for CSS, JS, and other assets
router.get('/static', 
    [
        query('previewId').isUUID().withMessage('Valid preview ID is required'),
        query('file').isString().trim().isLength({ min: 1, max: 50 })
            .matches(/^[a-zA-Z0-9.-]+$/).withMessage('Invalid file name')
    ],
    handleValidationErrors,
    verifyTokenEnhancedWithQuery,
    authorizeResourceOwnership('generated_site'),
    async (req, res) => {
    // Set CORS headers for static asset serving
    if (handleCors(req, res)) return;

    try {
        const { previewId, file } = req.query;
        
        if (!previewId || !file) {
            return res.status(400).json({ error: 'Preview ID and file name are required' });
        }

        console.log('Serving static file:', file, 'for preview:', previewId);

        // Get site info from database
        const result = await getSiteRecordAndPath(previewId, res, 'Preview not found');
        if (!result) return;
        const { outputDir } = result;

        const filePath = path.join(outputDir, file);
        
        // Set content type based on file extension
        const ext = path.extname(file).toLowerCase();
        let contentType = 'text/plain';
        
        switch (ext) {
            case '.css':
                contentType = 'text/css; charset=utf-8';
                break;
            case '.js':
                contentType = 'application/javascript; charset=utf-8';
                break;
            case '.html':
                contentType = 'text/html; charset=utf-8';
                break;
            case '.json':
                contentType = 'application/json; charset=utf-8';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
        }

        // Read and serve the file atomically to avoid TOCTOU
        let fileContent;
        try {
            fileContent = fs.readFileSync(filePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({ error: 'File not found' });
            }
            throw error;
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache');
        
        console.log('Served static file:', file, 'type:', contentType);
        res.status(200).send(fileContent);

    } catch (error) {
        console.error('Static file error:', error);
        res.status(500).json({
            error: 'File serving failed',
            message: error.message
        });
    }
});

// Download handler - creates and serves a ZIP file
router.get('/download', 
    [
        query('generationId').isUUID().withMessage('Valid generation ID is required')
    ],
    handleValidationErrors,
    verifyTokenEnhancedWithQuery,
    authorizeResourceOwnership('generated_site'),
    async (req, res) => {
    // Set CORS headers
    if (handleCors(req, res)) return;

    try {
        const { generationId } = req.query;
        
        if (!generationId) {
            return res.status(400).json({ error: 'Generation ID is required' });
        }

        console.log('Download requested for generation:', generationId);

        // Get site info from database
        const result = await getSiteRecordAndPath(generationId, res, 'Generation not found');
        if (!result) return;
        const { siteRecord, outputDir } = result;

        // Build generation info for compatibility
        const generationInfo = {
            id: siteRecord.id,
            userId: siteRecord.user_id,
            outputDir: outputDir,
            personName: siteRecord.cv_data?.personalInfo?.name || 'User'
        };

        // Check directory exists atomically
        try {
            await fs.promises.access(outputDir, fs.constants.R_OK);
        } catch (error) {
            return res.status(404).json({ error: 'Generated files not found' });
        }

        // Create ZIP file name
        const personName = generationInfo.personName || 'landing-page';
        const cleanName = personName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const zipFileName = `${cleanName}-landing-page.zip`;

        // Set download headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        res.setHeader('Cache-Control', 'no-cache');

        // Create ZIP archive with size limits to prevent zip bombs
        const archive = archiver('zip', {
            zlib: { level: 6 }, // Reduce compression level
            store: true // For small files, store without compression
        });
        
        // Set maximum archive size (50MB)
        const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024;
        let currentSize = 0;

        // Handle archive errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to create archive' });
            }
        });

        // Monitor archive size
        archive.on('progress', (progress) => {
            if (progress.entries.processedBytes > MAX_ARCHIVE_SIZE) {
                archive.abort();
                if (!res.headersSent) {
                    res.status(413).json({ error: 'Archive too large' });
                }
            }
        });

        // Pipe archive to response
        archive.pipe(res);

        // Add files to archive with size checking
        const filesToInclude = ['index.html', 'styles.css', 'script.js', 'data.js'];
        
        for (const fileName of filesToInclude) {
            const filePath = path.join(outputDir, fileName);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                currentSize += stats.size;
                
                // Check individual file size (max 10MB per file)
                if (stats.size > 10 * 1024 * 1024) {
                    console.log(`Skipping ${fileName}: file too large`);
                    continue;
                }
                
                // Check total size
                if (currentSize > MAX_ARCHIVE_SIZE) {
                    console.log(`Stopping archive creation: size limit exceeded`);
                    break;
                }
                
                console.log(`Adding ${fileName} to archive (${stats.size} bytes)`);
                archive.file(filePath, { name: fileName });
            }
        }

        // Add README file with size check
        const readmePath = path.join(outputDir, 'README.md');
        if (fs.existsSync(readmePath)) {
            const readmeStats = fs.statSync(readmePath);
            if (readmeStats.size < 1024 * 1024 && currentSize + readmeStats.size <= MAX_ARCHIVE_SIZE) { // Max 1MB for README
                archive.file(readmePath, { name: 'README.md' });
                currentSize += readmeStats.size;
            }
        }

        // Finalize the archive
        console.log('Finalizing archive...');
        await archive.finalize();
        
        console.log(`Download completed: ${zipFileName}`);
        
        // Schedule immediate cleanup for ephemeral storage (free tier)
        const fileCleanupManager = require('../lib/file-cleanup');
        fileCleanupManager.scheduleImmediateCleanup(siteRecord.user_id, siteRecord.id);
        console.log('📋 Scheduled cleanup after download for free tier storage');

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Download failed',
                message: error.message
            });
        }
    }
});

// ==========================================
// QUEUE STATUS ENDPOINTS
// ==========================================

// Get job status by ID
router.get('/job/:jobId/status', 
    verifyTokenEnhanced,
    [
        param('jobId').isUUID().withMessage('Valid job ID is required')
    ],
    async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { jobId } = req.params;
        const job = await queueManager.getJobStatus(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        // Check if user owns this job
        if (job.user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        res.json({
            success: true,
            job: {
                id: job.id,
                status: job.status,
                position: job.position,
                estimatedWaitMinutes: job.estimated_wait_minutes,
                createdAt: job.created_at,
                startedAt: job.started_at,
                completedAt: job.completed_at,
                structuredData: job.structured_data,
                error: job.error_message
            }
        });

    } catch (error) {
        console.error('Job status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get job status'
        });
    }
});

// Get user's jobs
router.get('/jobs', verifyTokenEnhanced, async (req, res) => {
    try {
        const userJobs = await queueManager.getUserJobs(req.user.userId);
        const queueStats = await queueManager.getQueueStats();
        
        res.json({
            success: true,
            jobs: userJobs,
            queueStats
        });

    } catch (error) {
        console.error('User jobs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user jobs'
        });
    }
});

// Cancel a job
router.delete('/job/:jobId', 
    verifyTokenEnhanced,
    [
        param('jobId').isUUID().withMessage('Valid job ID is required')
    ],
    async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { jobId } = req.params;
        const cancelled = await queueManager.cancelJob(jobId, req.user.userId);
        
        if (cancelled) {
            res.json({
                success: true,
                message: 'Job cancelled successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Job cannot be cancelled (not found or not queued)'
            });
        }

    } catch (error) {
        console.error('Job cancellation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel job'
        });
    }
});

// Get queue statistics
router.get('/queue/stats', verifyTokenEnhanced, async (req, res) => {
    try {
        const stats = await queueManager.getQueueStats();
        
        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Queue stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue statistics'
        });
    }
});

module.exports = router;