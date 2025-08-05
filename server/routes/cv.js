// File: routes/cv.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { body, param, query, validationResult } = require('express-validator');

const IntelligentCVProcessor = require('../lib/intelligent-cv-processor-gemini');
const TemplateProcessor = require('../lib/template-processor');
const securePaths = require('../lib/utils/secure-paths');
const { 
    saveGeneratedSite, 
    getGeneratedSiteById, 
    updateSiteDeployment,
    logProcessing, 
    createOrUpdateUser,
    getUserById 
} = require('../database/services');
const { 
    monitorFileUpload, 
    recordCVProcessing, 
    recordLandingPageGeneration 
} = require('../middleware/monitoring');
const { authorizeResourceOwnership, authorizeFileAccess } = require('../middleware/authorization');
const { verifyTokenEnhanced } = require('../middleware/enhanced-auth');

const router = express.Router();

// Initialize services
const templateProcessor = new TemplateProcessor();
const intelligentProcessor = new IntelligentCVProcessor();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Basic MIME type validation
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        // Sanitize filename - remove dangerous characters
        const sanitizedFilename = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .substring(0, 100); // Limit filename length
        
        file.originalname = sanitizedFilename;
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
        }
    }
});

// File content validation middleware
const validateFileContent = async (req, res, next) => {
    console.log('File validation middleware hit, file:', req.file ? req.file.originalname : 'no file');
    if (!req.file) {
        console.log('Validation failed: No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
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
        
        // Check for potential malicious content patterns
        const fileContent = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
        const maliciousPatterns = [
            /<script/i,
            /javascript:/i,
            /vbscript:/i,
            /onload=/i,
            /onerror=/i
        ];
        
        if (maliciousPatterns.some(pattern => pattern.test(fileContent))) {
            await fs.promises.unlink(filePath).catch(() => {});
            return res.status(400).json({ 
                error: 'File contains potentially malicious content.' 
            });
        }
        
        next();
    } catch (error) {
        console.error('File validation error:', error);
        if (req.file && req.file.path) {
            await fs.promises.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ error: 'File validation failed' });
    }
};

// Input validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
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
    constructor(maxSize = 100, ttlMs = 30 * 60 * 1000) { // 30 minutes TTL
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

// File upload endpoint
router.post('/upload', verifyTokenEnhanced, upload.single('cvFile'), validateFileContent, monitorFileUpload, async (req, res) => {
    try {
        console.log('Upload endpoint hit, file:', req.file ? req.file.originalname : 'no file');
        const uploadedFile = req.file;
        
        if (!uploadedFile) {
            console.log('Upload failed: No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
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

        // Structure the data with Intelligent AI processing
        console.log('Processing with Intelligent CV Processor (Gemini + Memory)...');
        const structuredData = await intelligentProcessor.processCV(extractedText, req.user.userId);
        console.log('Intelligent processing completed for:', structuredData.personalInfo?.name);
        
        const processingTime = Date.now() - processingStartTime;
        recordCVProcessing(req.user.userId, processingTime);

        // Validate the structured data
        if (!structuredData.personalInfo?.name) {
            throw new Error('Unable to extract name from CV');
        }

        // Update file status
        fileInfo.status = 'processed';
        fileInfo.processedAt = new Date().toISOString();
        fileInfo.extractedText = extractedText;
        fileInfo.structuredData = structuredData;
        tempFileCache.set(fileId, fileInfo);
        
        // Log successful processing to database
        await logProcessing(req.user.userId, 'cv_processing', 'success', null, null);

        res.status(200).json({
            success: true,
            message: 'CV processed successfully',
            extractedText: extractedText,
            structuredData: structuredData,
            fileId: fileId,
            processedAt: new Date().toISOString()
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
        const { structuredData } = req.body;
        
        if (!structuredData) {
            return res.status(400).json({ error: 'Structured CV data is required' });
        }

        // Validate that this is real CV data, not mock
        if (!structuredData.personalInfo?.name || !structuredData.personalInfo?.email) {
            return res.status(400).json({ error: 'Invalid CV data - missing required personal information' });
        }

        console.log('Generating landing page for:', structuredData.personalInfo.name);
        console.log('User ID:', req.user.userId);
        const generationStartTime = Date.now();

        // Create site record in database first to get the ID
        const siteName = `${structuredData.personalInfo.name} CV Landing Page`;
        const repoName = `${structuredData.personalInfo.name.toLowerCase().replace(/\s+/g, '-')}-cv-site`;
        
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { previewId } = req.query;
        
        if (!previewId) {
            return res.status(400).json({ error: 'Preview ID is required' });
        }

        console.log('Loading preview for ID:', previewId);

        // Get site info from database
        const siteRecord = await getGeneratedSiteById(previewId);
        
        if (!siteRecord) {
            return res.status(404).json({ error: 'Preview not found' });
        }
        
        // Build generation info for compatibility using secure paths
        const { siteDir: outputDir } = securePaths.getSecureGeneratedPath(siteRecord.user_id, siteRecord.id);
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { previewId, file } = req.query;
        
        if (!previewId || !file) {
            return res.status(400).json({ error: 'Preview ID and file name are required' });
        }

        console.log('Serving static file:', file, 'for preview:', previewId);

        // Get site info from database
        const siteRecord = await getGeneratedSiteById(previewId);
        
        if (!siteRecord) {
            return res.status(404).json({ error: 'Preview not found' });
        }
        
        // Build generation info for compatibility using secure paths
        const { siteDir: outputDir } = securePaths.getSecureGeneratedPath(siteRecord.user_id, siteRecord.id);
        const generationInfo = {
            outputDir: outputDir
        };

        const filePath = path.join(generationInfo.outputDir, file);
        
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { generationId } = req.query;
        
        if (!generationId) {
            return res.status(400).json({ error: 'Generation ID is required' });
        }

        console.log('Download requested for generation:', generationId);

        // Get site info from database
        const siteRecord = await getGeneratedSiteById(generationId);
        
        if (!siteRecord) {
            return res.status(404).json({ error: 'Generation not found' });
        }
        
        // Build generation info for compatibility using secure paths
        const { siteDir: outputDir } = securePaths.getSecureGeneratedPath(siteRecord.user_id, siteRecord.id);
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

module.exports = router;