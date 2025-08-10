// UNIFIED Database Services - ONE file for all database operations
// NO DUPLICATES - uses ONLY user_sites table (not generated_sites)
const { query } = require('./index');

// ==========================================
// USER SERVICES
// ==========================================

const createOrUpdateUser = async (userData) => {
    const { email, name, google_id, github_username, github_token, profile_picture_url } = userData;
    
    try {
        const existing = await query(
            'SELECT * FROM users WHERE email = $1 OR google_id = $2', 
            [email, google_id]
        );
        
        if (existing.rows.length > 0) {
            const result = await query(`
                UPDATE users 
                SET name = $1, google_id = $2, github_username = $3, 
                    github_token = $4, profile_picture_url = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *;
            `, [name, google_id, github_username, github_token, profile_picture_url, existing.rows[0].id]);
            return result.rows[0];
        } else {
            const result = await query(`
                INSERT INTO users (email, name, google_id, github_username, github_token, profile_picture_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `, [email, name, google_id, github_username, github_token, profile_picture_url]);
            return result.rows[0];
        }
    } catch (error) {
        console.error('Error creating/updating user:', error);
        throw error;
    }
};

const getUserById = async (userId) => {
    try {
        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        return result.rows[0] || null;
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
        // Table might not exist, create it
        if (error.message.includes('relation "api_usage" does not exist')) {
            await query(`
                CREATE TABLE IF NOT EXISTS api_usage (
                    id SERIAL PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    api_type VARCHAR(50) NOT NULL,
                    usage_date DATE NOT NULL,
                    request_count INTEGER DEFAULT 0,
                    token_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, api_type, usage_date)
                );
                CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, usage_date);
            `);
            // Retry the tracking
            return await trackApiUsage(userId, apiType, requestCount, tokenCount);
        }
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

// Export all functions - ONE UNIFIED SERVICE
module.exports = {
    // User services
    createOrUpdateUser,
    getUserById,
    
    // API Usage Tracking (Free Tier Protection)
    trackApiUsage,
    checkDailyApiUsage,
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
    logProcessing
};