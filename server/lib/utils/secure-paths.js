// File: lib/utils/secure-paths.js
// Secure path utilities to prevent directory traversal attacks

const path = require('path');
const fs = require('fs');

class SecurePathService {
    constructor() {
        // Define secure base directories
        this.baseDir = path.resolve(__dirname, '../../..');
        this.uploadsDir = path.join(this.baseDir, 'uploads');
        this.generatedDir = path.join(this.baseDir, 'generated');
        this.templatesDir = path.join(__dirname, '../templates');
    }

    /**
     * Sanitize a path component to prevent directory traversal
     * @param {string} component - Path component to sanitize
     * @returns {string} - Sanitized component
     */
    sanitizePathComponent(component) {
        if (!component || typeof component !== 'string') {
            throw new Error('Invalid path component');
        }

        // Remove dangerous characters and sequences
        const sanitized = component
            .replace(/\.\./g, '')      // Remove directory traversal
            .replace(/\//g, '')        // Remove forward slashes
            .replace(/\\/g, '')        // Remove backslashes
            .replace(/:/g, '')         // Remove colons
            .replace(/\*/g, '')        // Remove wildcards
            .replace(/\?/g, '')        // Remove question marks
            .replace(/"/g, '')         // Remove quotes
            .replace(/</g, '')         // Remove less than
            .replace(/>/g, '')         // Remove greater than
            .replace(/\|/g, '')        // Remove pipes
            .replace(/\0/g, '')        // Remove null bytes
            .trim();

        // Ensure result is not empty and doesn't start with special chars
        if (!sanitized || sanitized.length === 0) {
            throw new Error('Invalid path component after sanitization');
        }

        if (sanitized.startsWith('.') || sanitized.startsWith('-')) {
            throw new Error('Path component cannot start with . or -');
        }

        // Limit length to prevent extremely long paths
        if (sanitized.length > 100) {
            throw new Error('Path component too long');
        }

        return sanitized;
    }

    /**
     * Create secure path for user uploads
     * @param {string} userId - User ID (will be sanitized)
     * @param {string} filename - Filename (will be sanitized)
     * @returns {string} - Secure absolute path
     */
    getSecureUploadPath(userId, filename) {
        const sanitizedUserId = this.sanitizePathComponent(userId);
        const sanitizedFilename = this.sanitizePathComponent(filename);
        
        const userDir = path.join(this.uploadsDir, sanitizedUserId);
        const filePath = path.join(userDir, sanitizedFilename);
        
        // Verify the path is within the uploads directory
        if (!filePath.startsWith(this.uploadsDir)) {
            throw new Error('Path traversal attempt detected');
        }

        return {
            userDir,
            filePath,
            relativePath: path.relative(this.baseDir, filePath)
        };
    }

    /**
     * Create secure path for generated sites
     * @param {string} userId - User ID (will be sanitized)
     * @param {string} siteId - Site ID (will be sanitized)
     * @returns {string} - Secure absolute path
     */
    getSecureGeneratedPath(userId, siteId) {
        const sanitizedUserId = this.sanitizePathComponent(userId);
        const sanitizedSiteId = this.sanitizePathComponent(siteId);
        
        const userDir = path.join(this.generatedDir, sanitizedUserId);
        const siteDir = path.join(userDir, sanitizedSiteId);
        
        // Verify the path is within the generated directory
        if (!siteDir.startsWith(this.generatedDir)) {
            throw new Error('Path traversal attempt detected');
        }

        return {
            userDir,
            siteDir,
            relativePath: path.relative(this.baseDir, siteDir)
        };
    }

    /**
     * Create secure path for template files
     * @param {string} templateName - Template name (will be sanitized)
     * @param {string} filename - File name (will be sanitized)  
     * @returns {string} - Secure absolute path
     */
    getSecureTemplatePath(templateName, filename) {
        const sanitizedTemplate = this.sanitizePathComponent(templateName);
        const sanitizedFilename = this.sanitizePathComponent(filename);
        
        const templateDir = path.join(this.templatesDir, sanitizedTemplate);
        const filePath = path.join(templateDir, sanitizedFilename);
        
        // Verify the path is within the templates directory
        if (!filePath.startsWith(this.templatesDir)) {
            throw new Error('Path traversal attempt detected');
        }

        return filePath;
    }

    /**
     * Ensure a directory exists securely
     * @param {string} dirPath - Directory path to create
     */
    async ensureSecureDirectory(dirPath) {
        // Verify the path is within allowed directories
        const allowedDirs = [this.uploadsDir, this.generatedDir];
        const isAllowed = allowedDirs.some(allowedDir => dirPath.startsWith(allowedDir));
        
        if (!isAllowed) {
            throw new Error('Directory creation outside allowed paths');
        }

        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create directory: ${error.message}`);
        }
    }

    /**
     * Validate that a file path is secure and within allowed bounds
     * @param {string} filePath - File path to validate
     * @param {string} allowedBase - Base directory that must contain the path
     * @returns {boolean} - True if path is secure
     */
    validateSecurePath(filePath, allowedBase) {
        try {
            const resolvedPath = path.resolve(filePath);
            const resolvedBase = path.resolve(allowedBase);
            
            return resolvedPath.startsWith(resolvedBase);
        } catch (error) {
            return false;
        }
    }
}

module.exports = new SecurePathService();