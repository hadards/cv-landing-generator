// Live Authentication API Test
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testLiveAuth() {
    console.log('=== LIVE AUTHENTICATION API TEST ===\n');

    const serverUrl = 'http://localhost:3000';

    // Test 1: Health Check (unprotected)
    console.log('1️⃣  Testing Health Check (unprotected)...');
    try {
        const response = await fetch(`${serverUrl}/api/health`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Health check successful');
            console.log(`   - Status: ${data.status}`);
            console.log(`   - Server running: ${data.server?.running}`);
            console.log(`   - Database: ${data.database?.connected ? 'Connected' : 'Disconnected'}`);
        } else {
            console.log('❌ Health check failed:', data);
        }
    } catch (error) {
        console.log('❌ Health check error:', error.message);
    }

    // Test 2: Protected Route without Token
    console.log('\n2️⃣  Testing Protected Route without Token...');
    try {
        const response = await fetch(`${serverUrl}/api/session/info`);
        const data = await response.json();
        
        if (response.status === 401) {
            console.log('✅ Protection working - correctly rejected');
            console.log(`   - Status: ${response.status}`);
            console.log(`   - Error: ${data.error}`);
            console.log(`   - Code: ${data.code}`);
        } else {
            console.log('❌ Protection failed - should have been rejected');
        }
    } catch (error) {
        console.log('❌ Protected route test error:', error.message);
    }

    // Test 3: Create Test User and Token
    console.log('\n3️⃣  Creating Test User and Token...');
    let testToken = null;
    let testUserId = null;
    
    try {
        const { createOrUpdateUser } = require('./server/database/services');
        const { generateTokens } = require('./server/middleware/enhanced-auth');
        
        // Create test user
        const testUser = await createOrUpdateUser({
            email: 'live-test@example.com',
            name: 'Live Test User',
            google_id: 'live-test-' + Date.now(),
            github_username: null,
            github_token: null,
            profile_picture_url: null
        });
        
        testUserId = testUser.id;
        
        // Generate tokens
        const tokens = generateTokens(testUser.id, testUser.email);
        testToken = tokens.accessToken;
        
        console.log('✅ Test user and token created');
        console.log(`   - User ID: ${testUser.id}`);
        console.log(`   - Token length: ${testToken.length} chars`);
        console.log(`   - Session ID: ${tokens.sessionId}`);
        
    } catch (error) {
        console.log('❌ Test user creation failed:', error.message);
        return; // Can't continue without token
    }

    // Test 4: Protected Route with Valid Token
    console.log('\n4️⃣  Testing Protected Route with Valid Token...');
    try {
        const response = await fetch(`${serverUrl}/api/session/info`, {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Authentication successful');
            console.log(`   - User: ${data.user.name}`);
            console.log(`   - Email: ${data.user.email}`);
            console.log(`   - Session active: Yes`);
        } else {
            console.log('❌ Authentication failed:', data);
        }
    } catch (error) {
        console.log('❌ Protected route with token error:', error.message);
    }

    // Test 5: Multiple Requests with Same Token (Session Persistence)
    console.log('\n5️⃣  Testing Session Persistence (Multiple Requests)...');
    try {
        const requests = [];
        for (let i = 1; i <= 3; i++) {
            requests.push(
                fetch(`${serverUrl}/api/session/info`, {
                    headers: {
                        'Authorization': `Bearer ${testToken}`
                    }
                }).then(response => ({ requestNum: i, status: response.status }))
            );
        }
        
        const results = await Promise.all(requests);
        const allSuccessful = results.every(r => r.status === 200);
        
        console.log('✅ Multiple requests completed');
        results.forEach(result => {
            console.log(`   - Request ${result.requestNum}: ${result.status === 200 ? '✅ Success' : '❌ Failed'}`);
        });
        
        if (allSuccessful) {
            console.log('✅ Session persistence confirmed - no re-authentication needed');
        } else {
            console.log('❌ Session persistence issue - users would need to reconnect');
        }
        
    } catch (error) {
        console.log('❌ Session persistence test error:', error.message);
    }

    // Test 6: Get Active Sessions
    console.log('\n6️⃣  Testing Active Sessions Endpoint...');
    try {
        const response = await fetch(`${serverUrl}/api/session/active`, {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Active sessions retrieved');
            console.log(`   - Active sessions: ${data.sessions.length}`);
            data.sessions.forEach((session, index) => {
                console.log(`   - Session ${index + 1}: ${session.sessionId.substring(0, 8)}... (${session.isExpired ? 'expired' : 'active'})`);
            });
        } else {
            console.log('❌ Failed to get active sessions:', data);
        }
    } catch (error) {
        console.log('❌ Active sessions test error:', error.message);
    }

    // Test 7: CV Processing Protected Endpoint
    console.log('\n7️⃣  Testing CV Processing Protected Endpoint...');
    try {
        const response = await fetch(`${serverUrl}/api/cv/jobs`, {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ CV jobs endpoint accessible');
            console.log(`   - Jobs returned: ${data.jobs ? data.jobs.length : 0}`);
        } else if (response.status === 401) {
            console.log('❌ CV jobs endpoint authentication failed');
        } else {
            console.log('✅ CV jobs endpoint working (empty result expected)');
        }
    } catch (error) {
        console.log('❌ CV jobs test error:', error.message);
    }

    // Test 8: Invalid Token
    console.log('\n8️⃣  Testing Invalid Token...');
    try {
        const response = await fetch(`${serverUrl}/api/session/info`, {
            headers: {
                'Authorization': 'Bearer invalid-token-12345'
            }
        });
        const data = await response.json();
        
        if (response.status === 401) {
            console.log('✅ Invalid token correctly rejected');
            console.log(`   - Status: ${response.status}`);
            console.log(`   - Error: ${data.error}`);
        } else {
            console.log('❌ Invalid token should have been rejected');
        }
    } catch (error) {
        console.log('❌ Invalid token test error:', error.message);
    }

    // Cleanup
    console.log('\n9️⃣  Cleanup...');
    try {
        if (testUserId) {
            const { query } = require('./server/database/index');
            await query('DELETE FROM users WHERE id = $1', [testUserId]);
            console.log('✅ Test user cleaned up');
        }
    } catch (error) {
        console.log('❌ Cleanup failed:', error.message);
    }

    console.log('\n=== LIVE AUTHENTICATION TEST COMPLETED ===');
}

testLiveAuth().catch(console.error);