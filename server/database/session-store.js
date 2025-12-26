// Database-backed session storage for free tier (no Redis needed)
const { query } = require('./index');

/**
 * Verify session tables exist
 * Tables should be created by running database/DATABASE_COMPLETE.sql in Supabase
 */
async function initializeSessionTables() {
    try {
        // Verify user_sessions table exists
        const sessionsCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'user_sessions'
            );
        `);

        // Verify token_blacklist table exists
        const blacklistCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'token_blacklist'
            );
        `);

        if (!sessionsCheck.rows[0].exists || !blacklistCheck.rows[0].exists) {
            throw new Error('Session tables not found. Please run database/DATABASE_COMPLETE.sql in Supabase.');
        }

        console.log('Session storage tables verified');
    } catch (error) {
        console.error('Failed to verify session tables:', error);
        throw error;
    }
}

/**
 * Track a new session in database
 */
async function trackSession(userId, sessionId, tokenId, expiresInMs) {
    const expiresAt = new Date(Date.now() + expiresInMs);

    // Check session limit
    const existingSessions = await query(
        'SELECT session_id FROM user_sessions WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
    );

    const maxSessions = parseInt(process.env.MAX_SESSIONS_PER_USER) || 5;

    // If at limit, remove oldest session
    if (existingSessions.rows.length >= maxSessions) {
        const oldestSessionId = existingSessions.rows[0].session_id;

        // Get token_id of oldest session to blacklist it
        const oldSession = await query(
            'SELECT token_id FROM user_sessions WHERE session_id = $1',
            [oldestSessionId]
        );

        if (oldSession.rows.length > 0) {
            await blacklistToken(oldSession.rows[0].token_id, expiresInMs);
        }

        // Delete oldest session
        await query('DELETE FROM user_sessions WHERE session_id = $1', [oldestSessionId]);
    }

    // Insert new session
    await query(
        `INSERT INTO user_sessions (session_id, user_id, token_id, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id) DO UPDATE
         SET last_activity = CURRENT_TIMESTAMP`,
        [sessionId, userId, tokenId, expiresAt]
    );
}

/**
 * Update session last activity
 */
async function updateSessionActivity(userId, sessionId) {
    await query(
        'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE user_id = $1 AND session_id = $2',
        [userId, sessionId]
    );
}

/**
 * Check if session exists and is valid
 */
async function isSessionValid(userId, sessionId) {
    const result = await query(
        `SELECT session_id FROM user_sessions
         WHERE user_id = $1 AND session_id = $2 AND expires_at > CURRENT_TIMESTAMP`,
        [userId, sessionId]
    );

    return result.rows.length > 0;
}

/**
 * Blacklist a token
 */
async function blacklistToken(tokenId, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
    const expiresAt = new Date(Date.now() + expiresInMs);

    await query(
        `INSERT INTO token_blacklist (token_id, expires_at)
         VALUES ($1, $2)
         ON CONFLICT (token_id) DO NOTHING`,
        [tokenId, expiresAt]
    );
}

/**
 * Check if token is blacklisted
 */
async function isTokenBlacklisted(tokenId) {
    const result = await query(
        'SELECT token_id FROM token_blacklist WHERE token_id = $1 AND expires_at > CURRENT_TIMESTAMP',
        [tokenId]
    );

    return result.rows.length > 0;
}

/**
 * Delete a session (logout)
 */
async function deleteSession(userId, sessionId, tokenId) {
    // Blacklist the token
    await blacklistToken(tokenId);

    // Delete the session
    await query(
        'DELETE FROM user_sessions WHERE user_id = $1 AND session_id = $2',
        [userId, sessionId]
    );
}

/**
 * Delete all sessions for a user
 */
async function deleteAllUserSessions(userId) {
    // Get all tokens for this user's sessions
    const sessions = await query(
        'SELECT token_id FROM user_sessions WHERE user_id = $1',
        [userId]
    );

    // Blacklist all tokens
    for (const session of sessions.rows) {
        await blacklistToken(session.token_id);
    }

    // Delete all sessions
    await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
}

/**
 * Get all active sessions for a user
 */
async function getActiveSessions(userId) {
    const result = await query(
        `SELECT session_id, created_at, last_activity, expires_at
         FROM user_sessions
         WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
         ORDER BY last_activity DESC`,
        [userId]
    );

    return result.rows.map(row => ({
        sessionId: row.session_id,
        createdAt: row.created_at,
        lastActivity: row.last_activity,
        expiresAt: row.expires_at,
        isExpired: new Date(row.expires_at) < new Date()
    }));
}

/**
 * Clean up expired sessions and blacklisted tokens
 * Uses the database function created in DATABASE_COMPLETE.sql
 */
async function cleanupExpiredData() {
    const result = await query('SELECT * FROM cleanup_expired_auth_sessions()');

    const deletedSessions = result.rows[0].deleted_sessions;
    const deletedTokens = result.rows[0].deleted_tokens;

    console.log(`Cleanup: Removed ${deletedSessions} expired sessions, ${deletedTokens} expired tokens`);

    return {
        expiredSessions: deletedSessions,
        expiredTokens: deletedTokens
    };
}

module.exports = {
    initializeSessionTables,
    trackSession,
    updateSessionActivity,
    isSessionValid,
    blacklistToken,
    isTokenBlacklisted,
    deleteSession,
    deleteAllUserSessions,
    getActiveSessions,
    cleanupExpiredData
};
