// File: database/services.js - Database service functions
const { query } = require('./index');

// ==========================================
// USER SERVICES
// ==========================================

// Create or get user (for auth integration)
const createOrUpdateUser = async (userData) => {
    const { email, name, google_id, github_username } = userData;
    
    try {
        // Try to find existing user by email or google_id
        let findQuery = 'SELECT * FROM users WHERE email = $1';
        let findParams = [email];
        
        if (google_id) {
            findQuery = 'SELECT * FROM users WHERE google_id = $1 OR email = $2';
            findParams = [google_id, email];
        }
        
        const existing = await query(findQuery, findParams);
        
        if (existing.rows.length > 0) {
            // Update existing user
            const updateQuery = `
                UPDATE users 
                SET name = $1, google_id = $2, github_username = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *;
            `;
            const result = await query(updateQuery, [name, google_id, github_username, existing.rows[0].id]);
            return result.rows[0];
        } else {
            // Create new user
            const insertQuery = `
                INSERT INTO users (email, name, google_id, github_username)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const result = await query(insertQuery, [email, name, google_id, github_username]);
            return result.rows[0];
        }
    } catch (error) {
        console.error('Error creating/updating user:', error.message);
        throw error;
    }
};

// Get user by ID
const getUserById = async (userId) => {
    try {
        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting user by ID:', error.message);
        throw error;
    }
};

// ==========================================
// CV PROCESSING SERVICES  
// ==========================================

// Log processing operation
const logProcessing = async (userId, operationType, status, errorMessage = null, processingTime = null) => {
    try {
        const insertQuery = `
            INSERT INTO processing_logs (user_id, operation_type, status, error_message, processing_time_ms)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await query(insertQuery, [userId, operationType, status, errorMessage, processingTime]);
        return result.rows[0];
    } catch (error) {
        console.error('Error logging processing:', error.message);
        throw error;
    }
};

// ==========================================
// USER SITES SERVICES (replaces generatedLandingPages Map)
// ==========================================

// Create a new site record
const createUserSite = async (siteData) => {
    const { 
        user_id, 
        site_name, 
        repo_name = 'cv-landing-page', 
        github_url = '', 
        pages_url = null,
        cv_data = null 
    } = siteData;
    
    try {
        const insertQuery = `
            INSERT INTO user_sites (user_id, site_name, repo_name, github_url, pages_url, cv_data, deployment_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'generated')
            RETURNING *;
        `;
        const result = await query(insertQuery, [user_id, site_name, repo_name, github_url, pages_url, cv_data]);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user site:', error.message);
        throw error;
    }
};

// Get user site by ID
const getUserSiteById = async (siteId) => {
    try {
        const result = await query('SELECT * FROM user_sites WHERE id = $1', [siteId]);
        if (result.rows.length > 0) {
            const site = result.rows[0];
            // Parse JSON cv_data if it's a string
            if (site.cv_data && typeof site.cv_data === 'string') {
                try {
                    site.cv_data = JSON.parse(site.cv_data);
                } catch (parseError) {
                    console.warn('Failed to parse cv_data JSON:', parseError.message);
                    site.cv_data = null;
                }
            }
            return site;
        }
        return null;
    } catch (error) {
        console.error('Error getting user site:', error.message);
        throw error;
    }
};

// Get all sites for a user
const getUserSites = async (userId) => {
    try {
        const result = await query('SELECT * FROM user_sites WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return result.rows.map(site => {
            if (site.cv_data && typeof site.cv_data === 'string') {
                try {
                    site.cv_data = JSON.parse(site.cv_data);
                } catch (parseError) {
                    console.warn('Failed to parse cv_data JSON:', parseError.message);
                    site.cv_data = null;
                }
            }
            return site;
        });
    } catch (error) {
        console.error('Error getting user sites:', error.message);
        throw error;
    }
};

// Update site deployment status
const updateSiteDeployment = async (siteId, status, githubUrl = null, pagesUrl = null) => {
    try {
        const updateQuery = `
            UPDATE user_sites 
            SET deployment_status = $1, github_url = COALESCE($2, github_url), pages_url = COALESCE($3, pages_url), updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *;
        `;
        const result = await query(updateQuery, [status, githubUrl, pagesUrl, siteId]);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating site deployment:', error.message);
        throw error;
    }
};

// ==========================================
// TEMPORARY FILE TRACKING (replaces uploadedFiles Map)
// ==========================================

// For now, we can use processing_logs to track file operations
// Later we might create a dedicated uploaded_files table if needed

const logFileOperation = async (userId, filename, status, metadata = {}) => {
    return await logProcessing(userId, 'file_upload', status, null, null);
};

module.exports = {
    // User services
    createOrUpdateUser,
    getUserById,
    
    // Processing logs
    logProcessing,
    logFileOperation,
    
    // Sites services  
    createUserSite,
    getUserSiteById,
    getUserSites,
    updateSiteDeployment
};