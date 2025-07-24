// File: scripts/init-database.js
// Initialize database tables and test connection
require('dotenv').config();
const database = require('../lib/database');

async function initializeDatabase() {
    console.log('🚀 Initializing CV Landing Generator Database...');
    console.log('=====================================');
    
    try {
        // Test connection
        console.log('1. Testing database connection...');
        const health = await database.healthCheck();
        
        if (!health.healthy) {
            throw new Error('Database connection failed: ' + health.error);
        }
        
        console.log('✅ Database connection successful');
        console.log('   Timestamp:', health.timestamp);
        
        // Initialize tables
        console.log('\n2. Creating database tables...');
        await database.initializeTables();
        console.log('✅ All tables created successfully');
        
        // Test basic operations
        console.log('\n3. Testing basic operations...');
        
        // Test user creation (will fail if user exists, that's ok)
        try {
            const testUser = await database.createUser({
                email: 'test@example.com',
                name: 'Test User',
                google_id: 'test123'
            });
            console.log('✅ Test user created:', testUser.email);
            
            // Test user retrieval
            const retrievedUser = await database.getUserByEmail('test@example.com');
            console.log('✅ Test user retrieved:', retrievedUser.name);
            
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('ℹ️  Test user already exists (that\'s fine)');
            } else {
                throw error;
            }
        }
        
        console.log('\n🎉 Database initialization completed successfully!');
        console.log('=====================================');
        console.log('Your CV Landing Generator is ready to use.');
        console.log('\nNext steps:');
        console.log('1. Run: npm run dev');
        console.log('2. Visit: http://localhost:4200');
        console.log('3. Test API: http://localhost:3000/api/health');
        
    } catch (error) {
        console.error('\n❌ Database initialization failed:');
        console.error('Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Check your DATABASE_URL in .env file');
        console.log('2. Ensure Supabase project is running');
        console.log('3. Verify your database password is correct');
        console.log('4. Check your network connection');
        
        process.exit(1);
    } finally {
        await database.close();
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;