// File: lib/database.js
const mysql = require('mysql2/promise');
const crypto = require('crypto');

class Database {
    constructor() {
        this.connection = null;
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';
    }

    async connect() {
        if (this.connection) return this.connection;

        try {
            this.connection = await mysql.createConnection({
                uri: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: true }
            });

            console.log('✅ Connected to PlanetScale database');
            return this.connection;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw new Error('Failed to connect to database: ' + error.message);
        }
    }

    // Encryption utilities for sensitive data
    encrypt(text) {
        if (!text) return null;
        const cipher = crypto.createCipher('aes256', this.encryptionKey);
        return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    }

    decrypt(encryptedText) {
        if (!encryptedText) return null;
        const decipher = crypto.createDecipher('aes256', this.encryptionKey);
        return decipher.update(encryptedText, 'hex', 'utf8') + decipher.final('utf8');
    }

    // User management
    async createUser(userData) {
        const connection = await this.connect();

        try {
            const [result] = await connection.execute(
                `INSERT INTO users (email, name, github_username, github_access_token, google_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    userData.email,
                    userData.name,
                    userData.github_username || null,
                    userData.github_access_token ? this.encrypt(userData.github_access_token) : null,
                    userData.google_id || null
                ]
            );

            // Get the created user
            const [users] = await connection.execute(
                'SELECT * FROM users WHERE id = ?',
                [result.insertId]
            );

            const user = users[0];
            if (user.github_access_token) {
                user.github_access_token = this.decrypt(user.github_access_token);
            }

            console.log(`✅ User created: ${userData.email}`);
            return user;
        } catch (error) {
            console.error('❌ Create user failed:', error.message);
            throw new Error('Failed to create user: ' + error.message);
        }
    }

    async getUserByEmail(email) {
        const connection = await this.connect();

        try {
            const [users] = await connection.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) return null;

            const user = users[0];
            if (user.github_access_token) {
                user.github_access_token = this.decrypt(user.github_access_token);
            }

            return user;
        } catch (error) {
            console.error('❌ Get user by email failed:', error.message);
            throw new Error('Failed to get user: ' + error.message);
        }
    }

    async getUserById(userId) {
        const connection = await this.connect();

        try {
            const [users] = await connection.execute(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) return null;

            const user = users[0];
            if (user.github_access_token) {
                user.github_access_token = this.decrypt(user.github_access_token);
            }

            return user;
        } catch (error) {
            console.error('❌ Get user by ID failed:', error.message);
            throw new Error('Failed to get user: ' + error.message);
        }
    }

    async updateUserGitHubToken(userId, githubData) {
        const connection = await this.connect();

        try {
            await connection.execute(
                `UPDATE users 
                 SET github_username = ?, github_access_token = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [
                    githubData.username,
                    this.encrypt(githubData.access_token),
                    userId
                ]
            );

            console.log(`✅ GitHub token updated for user: ${userId}`);
            return true;
        } catch (error) {
            console.error('❌ Update GitHub token failed:', error.message);
            throw new Error('Failed to update GitHub token: ' + error.message);
        }
    }

    // Site management
    async createUserSite(siteData) {
        const connection = await this.connect();

        try {
            const [result] = await connection.execute(
                `INSERT INTO user_sites 
                 (user_id, site_name, repo_name, github_url, pages_url, vercel_url, custom_domain, deployment_status, cv_data) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    siteData.user_id,
                    siteData.site_name,
                    siteData.repo_name,
                    siteData.github_url,
                    siteData.pages_url || null,
                    siteData.vercel_url || null,
                    siteData.custom_domain || null,
                    siteData.deployment_status || 'pending',
                    siteData.cv_data ? JSON.stringify(siteData.cv_data) : null
                ]
            );

            // Get the created site
            const [sites] = await connection.execute(
                'SELECT * FROM user_sites WHERE id = ?',
                [result.insertId]
            );

            const site = sites[0];
            if (site.cv_data) {
                site.cv_data = JSON.parse(site.cv_data);
            }

            console.log(`✅ Site created: ${siteData.repo_name} for user ${siteData.user_id}`);
            return site;
        } catch (error) {
            console.error('❌ Create site failed:', error.message);
            throw new Error('Failed to create site: ' + error.message);
        }
    }

    async getUserSites(userId) {
        const connection = await this.connect();

        try {
            const [sites] = await connection.execute(
                'SELECT * FROM user_sites WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );

            // Parse JSON data
            sites.forEach(site => {
                if (site.cv_data) {
                    try {
                        site.cv_data = JSON.parse(site.cv_data);
                    } catch (e) {
                        console.warn('Failed to parse cv_data for site:', site.id);
                        site.cv_data = null;
                    }
                }
            });

            return sites;
        } catch (error) {
            console.error('❌ Get user sites failed:', error.message);
            throw new Error('Failed to get user sites: ' + error.message);
        }
    }

    async updateSiteDeploymentStatus(siteId, status, urls = {}) {
        const connection = await this.connect();

        try {
            await connection.execute(
                `UPDATE user_sites 
                 SET deployment_status = ?, pages_url = COALESCE(?, pages_url), 
                     vercel_url = COALESCE(?, vercel_url), updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [status, urls.pages_url, urls.vercel_url, siteId]
            );

            console.log(`✅ Site deployment status updated: ${siteId} -> ${status}`);
            return true;
        } catch (error) {
            console.error('❌ Update deployment status failed:', error.message);
            throw new Error('Failed to update deployment status: ' + error.message);
        }
    }

    // User preferences
    async getUserPreferences(userId) {
        const connection = await this.connect();

        try {
            const [prefs] = await connection.execute(
                'SELECT * FROM user_preferences WHERE user_id = ?',
                [userId]
            );

            if (prefs.length === 0) {
                // Create default preferences
                return await this.createDefaultPreferences(userId);
            }

            const preferences = prefs[0];
            if (preferences.preferences) {
                try {
                    preferences.preferences = JSON.parse(preferences.preferences);
                } catch (e) {
                    preferences.preferences = {};
                }
            }

            return preferences;
        } catch (error) {
            console.error('❌ Get user preferences failed:', error.message);
            throw new Error('Failed to get preferences: ' + error.message);
        }
    }

    async createDefaultPreferences(userId) {
        const connection = await this.connect();

        try {
            await connection.execute(
                `INSERT INTO user_preferences (user_id, vercel_enabled, email_notifications, theme_preference) 
                 VALUES (?, FALSE, TRUE, 'professional')`,
                [userId]
            );

            return await this.getUserPreferences(userId);
        } catch (error) {
            console.error('❌ Create default preferences failed:', error.message);
            throw new Error('Failed to create preferences: ' + error.message);
        }
    }

    // Logging for debugging
    async logOperation(userId, operationType, status, errorMessage = null, processingTime = null) {
        const connection = await this.connect();

        try {
            await connection.execute(
                `INSERT INTO processing_logs (user_id, operation_type, status, error_message, processing_time_ms) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, operationType, status, errorMessage, processingTime]
            );
        } catch (error) {
            console.warn('Failed to log operation:', error.message);
            // Don't throw here - logging failures shouldn't break the main flow
        }
    }

    // Health check
    async healthCheck() {
        try {
            const connection = await this.connect();
            const [result] = await connection.execute('SELECT 1 as health');
            return result[0].health === 1;
        } catch (error) {
            console.error('❌ Database health check failed:', error.message);
            return false;
        }
    }

    // Close connection (for cleanup)
    async close() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
            console.log('Database connection closed');
        }
    }

    // GitHub-related user methods
    async updateUser(userId, updates) {
        try {
            const connection = await this.connect();

            // Build dynamic update query
            const updateFields = [];
            const updateValues = [];

            if (updates.github_username !== undefined) {
                updateFields.push('github_username = ?');
                updateValues.push(updates.github_username);
            }

            if (updates.github_access_token !== undefined) {
                updateFields.push('github_access_token = ?');
                updateValues.push(updates.github_access_token);
            }

            if (updateFields.length === 0) {
                throw new Error('No update fields provided');
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(userId);

            const updateQuery = `
                UPDATE users 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;

            const [result] = await connection.execute(updateQuery, updateValues);

            if (result.affectedRows === 0) {
                throw new Error('User not found');
            }

            console.log(`✅ Updated user ${userId} with GitHub credentials`);
            return true;

        } catch (error) {
            console.error('❌ Failed to update user:', error.message);
            throw error;
        }
    }

    // Get user's GitHub credentials
    async getUserGitHubCredentials(userId) {
        try {
            const connection = await this.connect();
            const [rows] = await connection.execute(
                'SELECT github_username, github_access_token FROM users WHERE id = ?',
                [userId]
            );

            if (rows.length === 0) {
                throw new Error('User not found');
            }

            const user = rows[0];

            // Decrypt token if it exists
            if (user.github_access_token) {
                user.github_access_token = Buffer.from(user.github_access_token, 'base64').toString();
            }

            return user;

        } catch (error) {
            console.error('❌ Failed to get GitHub credentials:', error.message);
            throw error;
        }
    }

    // Check if user has GitHub connected
    async hasGitHubConnection(userId) {
        try {
            const credentials = await this.getUserGitHubCredentials(userId);
            return !!(credentials.github_username && credentials.github_access_token);
        } catch (error) {
            return false;
        }
    }

    // Site management methods (for next steps)
    async createSite(userId, siteData) {
        try {
            const connection = await this.connect();
            const [result] = await connection.execute(`
                INSERT INTO user_sites (
                    user_id, site_name, repo_name, 
                    deployment_status, cv_data, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
                userId,
                siteData.site_name,
                siteData.repo_name,
                'pending',
                JSON.stringify(siteData.cv_data)
            ]);

            console.log(`✅ Created site record for user ${userId}`);
            return result.insertId;

        } catch (error) {
            console.error('❌ Failed to create site:', error.message);
            throw error;
        }
    }

    async updateSiteStatus(siteId, status, urls = {}) {
        try {
            const connection = await this.connect();

            const updateFields = ['deployment_status = ?', 'updated_at = CURRENT_TIMESTAMP'];
            const updateValues = [status];

            if (urls.github_url) {
                updateFields.push('github_url = ?');
                updateValues.push(urls.github_url);
            }

            if (urls.pages_url) {
                updateFields.push('pages_url = ?');
                updateValues.push(urls.pages_url);
            }

            if (urls.vercel_url) {
                updateFields.push('vercel_url = ?');
                updateValues.push(urls.vercel_url);
            }

            updateValues.push(siteId);

            const [result] = await connection.execute(`
                UPDATE user_sites 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            if (result.affectedRows === 0) {
                throw new Error('Site not found');
            }

            console.log(`✅ Updated site ${siteId} status to ${status}`);
            return true;

        } catch (error) {
            console.error('❌ Failed to update site status:', error.message);
            throw error;
        }
    }

    async getUserSites(userId) {
        try {
            const connection = await this.connect();
            const [rows] = await connection.execute(`
                SELECT id, site_name, repo_name, github_url, pages_url, vercel_url,
                       deployment_status, created_at, updated_at
                FROM user_sites 
                WHERE user_id = ?
                ORDER BY created_at DESC
            `, [userId]);

            return rows;

        } catch (error) {
            console.error('❌ Failed to get user sites:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
const database = new Database();
module.exports = database;