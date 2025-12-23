// Security utility for input sanitization and XSS prevention
const validator = require('validator');

class InputSanitizer {
    /**
     * Sanitize HTML content to prevent XSS attacks
     */
    static sanitizeHtml(input) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // Use validator.js to escape HTML
        return validator.escape(input);
    }

    /**
     * Sanitize text input for database storage
     */
    static sanitizeText(input, maxLength = 10000) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // Remove null bytes
        let sanitized = input.replace(/\0/g, '');

        // Normalize whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();

        // Limit length
        sanitized = sanitized.substring(0, maxLength);

        return sanitized;
    }

    /**
     * Sanitize email addresses
     */
    static sanitizeEmail(email) {
        if (!email || typeof email !== 'string') {
            return '';
        }

        const normalized = validator.normalizeEmail(email);
        return normalized || '';
    }

    /**
     * Sanitize URLs
     */
    static sanitizeUrl(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }

        // Remove dangerous protocols
        if (!validator.isURL(url, {
            protocols: ['http', 'https'],
            require_protocol: false
        })) {
            return '';
        }

        return url.trim();
    }

    /**
     * Sanitize filename to prevent directory traversal
     */
    static sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return '';
        }

        // Remove directory traversal attempts
        let sanitized = filename.replace(/\.\./g, '');

        // Remove path separators
        sanitized = sanitized.replace(/[\/\\]/g, '');

        // Only allow alphanumeric, dots, dashes, underscores
        sanitized = sanitized.replace(/[^a-zA-Z0-9.-_]/g, '_');

        // Limit length
        sanitized = sanitized.substring(0, 255);

        return sanitized;
    }

    /**
     * Sanitize structured CV data before storing
     */
    static sanitizeCVData(cvData) {
        if (!cvData || typeof cvData !== 'object') {
            return {};
        }

        const sanitized = {};

        // Sanitize personal info
        if (cvData.personalInfo) {
            sanitized.personalInfo = {
                name: this.sanitizeHtml(cvData.personalInfo.name),
                email: this.sanitizeEmail(cvData.personalInfo.email),
                phone: this.sanitizeText(cvData.personalInfo.phone, 50),
                location: this.sanitizeHtml(cvData.personalInfo.location),
                currentTitle: this.sanitizeHtml(cvData.personalInfo.currentTitle),
                summary: this.sanitizeText(cvData.personalInfo.summary, 2000),
                aboutMe: this.sanitizeText(cvData.personalInfo.aboutMe, 5000),
                profilePicture: cvData.personalInfo.profilePicture // Keep base64 as-is, validated separately
            };
        }

        // Sanitize experience array
        if (Array.isArray(cvData.experience)) {
            sanitized.experience = cvData.experience.map(exp => ({
                title: this.sanitizeHtml(exp.title),
                company: this.sanitizeHtml(exp.company),
                location: this.sanitizeHtml(exp.location),
                startDate: this.sanitizeText(exp.startDate, 20),
                endDate: this.sanitizeText(exp.endDate, 20),
                description: this.sanitizeText(exp.description, 2000),
                achievements: Array.isArray(exp.achievements)
                    ? exp.achievements.map(a => this.sanitizeText(a, 500))
                    : []
            }));
        }

        // Sanitize skills
        if (cvData.skills) {
            sanitized.skills = {
                technical: Array.isArray(cvData.skills.technical)
                    ? cvData.skills.technical.map(s => this.sanitizeHtml(s))
                    : [],
                soft: Array.isArray(cvData.skills.soft)
                    ? cvData.skills.soft.map(s => this.sanitizeHtml(s))
                    : [],
                languages: Array.isArray(cvData.skills.languages)
                    ? cvData.skills.languages.map(s => this.sanitizeHtml(s))
                    : []
            };
        }

        // Sanitize education
        if (Array.isArray(cvData.education)) {
            sanitized.education = cvData.education.map(edu => ({
                degree: this.sanitizeHtml(edu.degree),
                institution: this.sanitizeHtml(edu.institution),
                location: this.sanitizeHtml(edu.location),
                graduationDate: this.sanitizeText(edu.graduationDate, 20),
                gpa: this.sanitizeText(edu.gpa, 10),
                achievements: Array.isArray(edu.achievements)
                    ? edu.achievements.map(a => this.sanitizeText(a, 500))
                    : []
            }));
        }

        // Sanitize projects
        if (Array.isArray(cvData.projects)) {
            sanitized.projects = cvData.projects.map(proj => ({
                name: this.sanitizeHtml(proj.name),
                description: this.sanitizeText(proj.description, 2000),
                technologies: Array.isArray(proj.technologies)
                    ? proj.technologies.map(t => this.sanitizeHtml(t))
                    : [],
                url: this.sanitizeUrl(proj.url)
            }));
        }

        // Sanitize certifications
        if (Array.isArray(cvData.certifications)) {
            sanitized.certifications = cvData.certifications.map(cert => ({
                name: this.sanitizeHtml(cert.name),
                issuer: this.sanitizeHtml(cert.issuer),
                date: this.sanitizeText(cert.date, 20),
                url: this.sanitizeUrl(cert.url)
            }));
        }

        // Preserve edited content flags if present (these are text fields)
        if (cvData._hasEditedContent) {
            sanitized._hasEditedContent = true;
            if (cvData.experienceText) {
                sanitized.experienceText = this.sanitizeText(cvData.experienceText, 10000);
            }
            if (cvData.skillsText) {
                sanitized.skillsText = this.sanitizeText(cvData.skillsText, 5000);
            }
            if (cvData.educationText) {
                sanitized.educationText = this.sanitizeText(cvData.educationText, 5000);
            }
            if (cvData.projectsText) {
                sanitized.projectsText = this.sanitizeText(cvData.projectsText, 5000);
            }
            if (cvData.certificationsText) {
                sanitized.certificationsText = this.sanitizeText(cvData.certificationsText, 5000);
            }
        }

        return sanitized;
    }

    /**
     * Validate base64 image data
     */
    static validateBase64Image(base64String, maxSizeMB = 5) {
        if (!base64String || typeof base64String !== 'string') {
            return { valid: false, error: 'Invalid image data' };
        }

        // Check if it's a data URL
        if (!base64String.startsWith('data:image/')) {
            return { valid: false, error: 'Invalid image format' };
        }

        // Extract MIME type
        const mimeMatch = base64String.match(/data:image\/(png|jpeg|jpg|gif|webp);base64,/);
        if (!mimeMatch) {
            return { valid: false, error: 'Unsupported image type' };
        }

        // Check size
        const base64Data = base64String.split(',')[1];
        const sizeInBytes = (base64Data.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > maxSizeMB) {
            return { valid: false, error: `Image too large (max ${maxSizeMB}MB)` };
        }

        return { valid: true };
    }
}

module.exports = InputSanitizer;
