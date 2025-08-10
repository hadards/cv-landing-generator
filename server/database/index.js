// File: database/index.js - Direct PostgreSQL Connection
const { Pool } = require('pg');

let pool = null;

// Initialize PostgreSQL connection pool
const initializeDatabase = () => {
    if (pool) {
        return pool;
    }

    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    try {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            // Free tier optimizations
            max: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 5, // Limit connections for free tier
            idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000, // 30 seconds
            connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 3000, // 3 seconds
            acquireTimeoutMillis: parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT) || 5000, // 5 seconds
            ssl: {
                rejectUnauthorized: false // Required for Supabase connections
            }
        });

        console.log('✓ PostgreSQL connection pool initialized');
        return pool;

    } catch (error) {
        console.error('❌ Failed to initialize database pool:', error.message);
        throw error;
    }
};

// Get database connection
const getDatabase = () => {
    if (!pool) {
        return initializeDatabase();
    }
    return pool;
};

// List existing tables
const listTables = async () => {
    const db = getDatabase();
    try {
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;
        
        const result = await db.query(query);
        return result.rows.map(row => row.table_name);
        
    } catch (error) {
        console.error('Error listing tables:', error.message);
        throw error;
    }
};

// Test database connection
const testConnection = async () => {
    try {
        const db = getDatabase();
        await db.query('SELECT NOW()');
        
        const tables = await listTables();
        return { 
            success: true, 
            message: `Connected successfully! Found ${tables.length} tables`,
            tables: tables
        };
        
    } catch (error) {
        return { 
            success: false, 
            message: error.message 
        };
    }
};

// Execute a query
const query = async (text, params = []) => {
    const db = getDatabase();
    try {
        const result = await db.query(text, params);
        return result;
    } catch (error) {
        console.error('Query error:', error.message);
        throw error;
    }
};

// Close database connection
const closeDatabase = async () => {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✓ Database connection closed');
    }
};

module.exports = {
    getDatabase,
    initializeDatabase,
    testConnection,
    listTables,
    query,
    closeDatabase
};