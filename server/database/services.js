// UNIFIED Database Services - ONE file for all database operations
// NO DUPLICATES - uses ONLY user_sites table (not generated_sites)
const { query } = require('./index');
const encryptionService = require('../lib/utils/encryption');
const InputSanitizer = require('../lib/utils/input-sanitizer');

// ==========================================
// USER SERVICES
// ==========================================

const createOrUpdateUser = async (userData) => {
    const { email, name, google_id, github_username, github_token, profile_picture_url } = userData;

    try {
        // Sanitize inputs
        const sanitizedEmail = InputSanitizer.sanitizeEmail(email);
        const sanitizedName = InputSanitizer.sanitizeText(name, 255);
        const sanitizedUsername = github_username ? InputSanitizer.sanitizeText(github_username, 255) : null;

        // Encrypt GitHub token if present
        const encryptedToken = github_token ? encryptionService.encrypt(github_token) : null;

        const existing = await query(
            'SELECT * FROM users WHERE email = $1 OR google_id = $2',
            [sanitizedEmail, google_id]
        );

        if (existing.rows.length > 0) {
            const result = await query(`
                UPDATE users
                SET name = $1, google_id = $2, github_username = $3,
                    github_token = $4, profile_picture_url = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *;
            `, [sanitizedName, google_id, sanitizedUsername, encryptedToken, profile_picture_url, existing.rows[0].id]);

            // Decrypt token before returning
            const user = result.rows[0];
            if (user.github_token) {
                user.github_token = encryptionService.decrypt(user.github_token);
            }
            return user;
        } else {
            const result = await query(`
                INSERT INTO users (email, name, google_id, github_username, github_token, profile_picture_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `, [sanitizedEmail, sanitizedName, google_id, sanitizedUsername, encryptedToken, profile_picture_url]);

            // Decrypt token before returning
            const user = result.rows[0];
            if (user.github_token) {
                user.github_token = encryptionService.decrypt(user.github_token);
            }
            return user;
        }
    } catch (error) {
        console.error('Error creating/updating user:', error);
        throw error;
    }
};

const getUserById = async (userId) => {
    try {
        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0] || null;

        // Decrypt GitHub token before returning
        if (user && user.github_token) {
            user.github_token = encryptionService.decrypt(user.github_token);
        }

        return user;
    } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
};

// ==========================================
// API USAGE TRACKING (Free Tier Protection)
// ==========================================

const trackApiUsage = async (userId, apiType, requestCount = 1, tokenCount = 0) => {
    try {
        const today = new Date().toDateString();
        
        // Try to update existing record
        const updateResult = await query(`
            UPDATE api_usage 
            SET request_count = request_count + $1, 
                token_count = token_count + $2, 
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $3 AND api_type = $4 AND usage_date = $5
            RETURNING *;
        `, [requestCount, tokenCount, userId, apiType, today]);
        
        if (updateResult.rows.length === 0) {
            // Create new record
            const insertResult = await query(`
                INSERT INTO api_usage (user_id, api_type, usage_date, request_count, token_count)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *;
            `, [userId, apiType, today, requestCount, tokenCount]);
            return insertResult.rows[0];
        }
        
        return updateResult.rows[0];
    } catch (error) {
        console.error('Error tracking API usage:', error);
        throw error;
    }
};

const checkDailyApiUsage = async (userId, apiType) => {
    try {
        const today = new Date().toDateString();
        const result = await query(`
            SELECT request_count, token_count 
            FROM api_usage 
            WHERE user_id = $1 AND api_type = $2 AND usage_date = $3
        `, [userId, apiType, today]);
        
        return result.rows[0] || { request_count: 0, token_count: 0 };
    } catch (error) {
        console.error('Error checking daily API usage:', error);
        return { request_count: 0, token_count: 0 };
    }
};

const checkApiLimits = async (userId, apiType) => {
    const limits = {
        'gemini': {
            daily_requests: parseInt(process.env.GEMINI_DAILY_LIMIT) || 50,
            monthly_tokens: parseInt(process.env.GEMINI_MONTHLY_TOKEN_LIMIT) || 100000
        }
    };
    
    if (!limits[apiType]) {
        return { allowed: true, reason: 'No limits defined' };
    }
    
    const usage = await checkDailyApiUsage(userId, apiType);
    const limit = limits[apiType];
    
    if (usage.request_count >= limit.daily_requests) {
        return { 
            allowed: false, 
            reason: `Daily limit of ${limit.daily_requests} requests exceeded. Used: ${usage.request_count}`,
            resetTime: 'tomorrow'
        };
    }
    
    return { 
        allowed: true, 
        remaining: limit.daily_requests - usage.request_count 
    };
};

// ==========================================
// FILE UPLOAD SERVICES (replaces uploadedFiles Map)
// ==========================================

const saveFileUpload = async (fileData) => {
    const { id, user_id, filename, filepath, file_size, mime_type, extracted_text, structured_data } = fileData;
    
    try {
        const result = await query(`
            INSERT INTO file_uploads (id, user_id, filename, filepath, file_size, mime_type, extracted_text, structured_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `, [id, user_id, filename, filepath, file_size, mime_type, extracted_text, JSON.stringify(structured_data)]);
        
        const file = result.rows[0];
        if (file.structured_data && typeof file.structured_data === 'string') {
            file.structured_data = JSON.parse(file.structured_data);
        }
        return file;
    } catch (error) {
        console.error('Error saving file upload:', error);
        throw error;
    }
};

const getFileUploadById = async (fileId) => {
    try {
        const result = await query('SELECT * FROM file_uploads WHERE id = $1', [fileId]);
        if (result.rows.length === 0) return null;
        
        const file = result.rows[0];
        if (file.structured_data && typeof file.structured_data === 'string') {
            file.structured_data = JSON.parse(file.structured_data);
        }
        return file;
    } catch (error) {
        console.error('Error getting file upload:', error);
        throw error;
    }
};

const updateFileUpload = async (fileId, updates) => {
    const { extracted_text, structured_data } = updates;
    
    try {
        const result = await query(`
            UPDATE file_uploads 
            SET extracted_text = $1, structured_data = $2
            WHERE id = $3
            RETURNING *;
        `, [extracted_text, JSON.stringify(structured_data), fileId]);
        
        const file = result.rows[0];
        if (file && file.structured_data && typeof file.structured_data === 'string') {
            file.structured_data = JSON.parse(file.structured_data);
        }
        return file;
    } catch (error) {
        console.error('Error updating file upload:', error);
        throw error;
    }
};

// ==========================================
// SITE SERVICES (replaces generatedLandingPages Map)
// USES ONLY user_sites table - NO generated_sites table
// ==========================================

const saveGeneratedSite = async (siteData) => {
    const { id, user_id, name, structured_data, html_content, css_content, folder_path } = siteData;
    
    try {
        // Generate repo_name from site name
        const repo_name = name ? 
            name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-cv-site' :
            'cv-landing-page';
            
        const result = await query(`
            INSERT INTO user_sites 
            (id, user_id, site_name, repo_name, github_url, cv_data, html_content, css_content, folder_path, deployment_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'generated')
            RETURNING *;
        `, [id, user_id, name, repo_name, '', JSON.stringify(structured_data), html_content, css_content, folder_path]);
        
        const site = result.rows[0];
        if (site.cv_data && typeof site.cv_data === 'string') {
            site.cv_data = JSON.parse(site.cv_data);
        }
        return site;
    } catch (error) {
        console.error('Error saving generated site:', error);
        throw error;
    }
};

const getGeneratedSiteById = async (siteId) => {
    try {
        const result = await query('SELECT * FROM user_sites WHERE id = $1', [siteId]);
        if (result.rows.length === 0) return null;
        
        const site = result.rows[0];
        if (site.cv_data && typeof site.cv_data === 'string') {
            site.cv_data = JSON.parse(site.cv_data);
        }
        return site;
    } catch (error) {
        console.error('Error getting generated site:', error);
        throw error;
    }
};

const updateSiteDeployment = async (siteId, deploymentData) => {
    const { github_url, pages_url, deployment_status, html_content, css_content, folder_path } = deploymentData;
    
    try {
        const result = await query(`
            UPDATE user_sites 
            SET github_url = COALESCE($1, github_url), 
                pages_url = COALESCE($2, pages_url), 
                deployment_status = COALESCE($3, deployment_status),
                html_content = COALESCE($4, html_content),
                css_content = COALESCE($5, css_content),
                folder_path = COALESCE($6, folder_path),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *;
        `, [github_url, pages_url, deployment_status, html_content, css_content, folder_path, siteId]);
        
        const site = result.rows[0];
        if (site && site.cv_data && typeof site.cv_data === 'string') {
            site.cv_data = JSON.parse(site.cv_data);
        }
        return site;
    } catch (error) {
        console.error('Error updating site deployment:', error);
        throw error;
    }
};

const getUserSites = async (userId) => {
    try {
        const result = await query(
            'SELECT * FROM user_sites WHERE user_id = $1 ORDER BY created_at DESC', 
            [userId]
        );
        
        return result.rows.map(site => {
            if (site.cv_data && typeof site.cv_data === 'string') {
                try {
                    site.cv_data = JSON.parse(site.cv_data);
                } catch (e) {
                    site.cv_data = {};
                }
            }
            return site;
        });
    } catch (error) {
        console.error('Error getting user sites:', error);
        throw error;
    }
};

// ==========================================
// LOGGING SERVICES
// ==========================================

const logProcessing = async (userId, operation, status, errorMessage = null) => {
    try {
        const result = await query(`
            INSERT INTO processing_logs (user_id, operation, status, error_message)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `, [userId, operation, status, errorMessage]);
        return result.rows[0];
    } catch (error) {
        console.error('Error logging processing:', error);
        // Don't throw here to avoid breaking main operations
    }
};

// ==========================================
// USER PREFERENCES (keep existing functionality)
// ==========================================

const getUserPreferences = async (userId) => {
    try {
        const result = await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting user preferences:', error);
        throw error;
    }
};

const createDefaultPreferences = async (userId) => {
    try {
        const result = await query(`
            INSERT INTO user_preferences (user_id, vercel_enabled, email_notifications, theme_preference)
            VALUES ($1, FALSE, TRUE, 'professional')
            RETURNING *;
        `, [userId]);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating default preferences:', error);
        throw error;
    }
};

// ==========================================
// DATA PRIVACY & SECURITY (GDPR Compliance)
// ==========================================

/**
 * Export all user data (GDPR compliance)
 */
const exportUserData = async (userId) => {
    try {
        // Get user profile
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Get user sites
        const sites = await getUserSites(userId);

        // Get processing logs
        const logsResult = await query(
            'SELECT operation, status, error_message, created_at FROM processing_logs WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        // Get API usage
        const apiUsageResult = await query(
            'SELECT api_type, usage_date, request_count, token_count FROM api_usage WHERE user_id = $1 ORDER BY usage_date DESC',
            [userId]
        );

        // Prepare export data (excluding sensitive encrypted data)
        const exportData = {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                github_username: user.github_username,
                created_at: user.created_at,
                updated_at: user.updated_at
            },
            sites: sites.map(site => ({
                id: site.id,
                site_name: site.site_name,
                github_url: site.github_url,
                pages_url: site.pages_url,
                cv_data: site.cv_data,
                deployment_status: site.deployment_status,
                created_at: site.created_at
            })),
            processingLogs: logsResult.rows,
            apiUsage: apiUsageResult.rows,
            exportedAt: new Date().toISOString()
        };

        // Log the export
        await logProcessing(userId, 'data_export', 'success');

        return exportData;
    } catch (error) {
        console.error('Error exporting user data:', error);
        await logProcessing(userId, 'data_export', 'failed', error.message);
        throw error;
    }
};

/**
 * Delete user account and all associated data (GDPR right to be forgotten)
 */
const deleteUserAccount = async (userId) => {
    try {
        // Get user first to confirm exists
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Delete in correct order due to foreign key constraints
        // All cascade deletes will handle related data automatically

        // Log the deletion before removing
        await logProcessing(userId, 'account_deletion', 'started');

        // Get generated site folders for cleanup
        const sites = await getUserSites(userId);
        const fs = require('fs').promises;
        const path = require('path');

        // Delete physical files for generated sites
        for (const site of sites) {
            if (site.folder_path) {
                try {
                    await fs.rm(site.folder_path, { recursive: true, force: true });
                    console.log(`Deleted site folder: ${site.folder_path}`);
                } catch (err) {
                    console.warn(`Could not delete folder ${site.folder_path}:`, err.message);
                }
            }
        }

        // Delete user (CASCADE will delete all related records)
        await query('DELETE FROM users WHERE id = $1', [userId]);

        console.log(`User account deleted: ${userId}`);

        return {
            success: true,
            deletedUserId: userId,
            deletedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error deleting user account:', error);
        throw error;
    }
};

/**
 * Anonymize old user data (data retention policy)
 */
const anonymizeOldData = async (retentionDays = 365) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Anonymize processing logs older than retention period
        const result = await query(`
            UPDATE processing_logs
            SET user_id = NULL
            WHERE created_at < $1 AND user_id IS NOT NULL
        `, [cutoffDate]);

        console.log(`Anonymized ${result.rowCount} old processing logs`);

        return {
            anonymizedLogs: result.rowCount,
            cutoffDate: cutoffDate.toISOString()
        };
    } catch (error) {
        console.error('Error anonymizing old data:', error);
        throw error;
    }
};

/**
 * Clean up old data per retention policy
 */
const cleanupOldData = async () => {
    try {
        // Delete API usage records older than 90 days
        const apiCutoff = new Date();
        apiCutoff.setDate(apiCutoff.getDate() - 90);

        const apiResult = await query(
            'DELETE FROM api_usage WHERE created_at < $1',
            [apiCutoff]
        );

        // Delete old processing logs (already anonymized)
        const logCutoff = new Date();
        logCutoff.setDate(logCutoff.getDate() - 365);

        const logResult = await query(
            'DELETE FROM processing_logs WHERE created_at < $1 AND user_id IS NULL',
            [logCutoff]
        );

        console.log(`Cleaned up ${apiResult.rowCount} API usage records and ${logResult.rowCount} old logs`);

        return {
            deletedApiRecords: apiResult.rowCount,
            deletedLogs: logResult.rowCount
        };
    } catch (error) {
        console.error('Error cleaning up old data:', error);
        throw error;
    }
};

// Export all functions - ONE UNIFIED SERVICE
module.exports = {
    // User services
    createOrUpdateUser,
    getUserById,

    // API Usage Tracking (Free Tier Protection)
    trackApiUsage,
    checkApiLimits,

    // File upload services (replaces uploadedFiles Map)
    saveFileUpload,
    getFileUploadById,
    updateFileUpload,

    // Site services (replaces generatedLandingPages Map - uses user_sites table ONLY)
    saveGeneratedSite,
    getGeneratedSiteById,
    updateSiteDeployment,
    getUserSites,

    // User preferences (existing functionality)
    getUserPreferences,
    createDefaultPreferences,

    // Logging
    logProcessing,

    // Data Privacy & Security (GDPR Compliance)
    exportUserData,
    deleteUserAccount,
    anonymizeOldData,
    cleanupOldData
};