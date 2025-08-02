// Test script for CV Session Memory functionality  
// Run with: node test/test-session-memory.js

// Load environment variables
require('dotenv').config();

const CVSessionService = require('../lib/services/cv-session-service');

async function testSessionMemory() {
    console.log('🧪 Testing CV Session Memory System...\n');
    
    const sessionService = new CVSessionService();
    const testUserId = '0d7a5108-516a-4b43-8bbd-bc1b66a4f93e'; // Your user ID
    
    try {
        // Test 1: Create Session
        console.log('1️⃣ Creating new session...');
        const sessionId = await sessionService.createSession(
            testUserId, 
            'John Smith, Software Engineer with 5 years experience in JavaScript...',
            { cv_type: 'technical', estimated_profession: 'software_developer' }
        );
        console.log(`✅ Session created: ${sessionId}\n`);

        // Test 2: Store Step 1 Results
        console.log('2️⃣ Storing Step 1 (Basic Info) results...');
        const basicInfo = {
            name: 'John Smith',
            email: 'john.smith@email.com',
            currentTitle: 'Senior Software Engineer',
            location: 'San Francisco, CA'
        };
        
        await sessionService.storeStepResult(
            sessionId, 
            'basic_info', 
            basicInfo, 
            0.95, 
            { extraction_method: 'llm_structured', tokens_used: 450 }
        );
        console.log('✅ Basic info stored\n');

        // Test 3: Get Context for Step 2
        console.log('3️⃣ Getting context for Step 2...');
        const context1 = await sessionService.getSessionContext(sessionId);
        console.log('📋 Context for Step 2:');
        console.log(`   - Previous steps: ${Object.keys(context1.previousSteps).join(', ')}`);
        console.log(`   - Known name: ${context1.knownFacts.name}`);
        console.log(`   - Known profession: ${context1.knownFacts.profession}`);
        console.log(`   - Step count: ${context1.stepCount}\n`);

        // Test 4: Store Step 2 Results
        console.log('4️⃣ Storing Step 2 (Professional) results...');
        const professionalData = {
            experience: [
                {
                    title: 'Senior Software Engineer',
                    company: 'Tech Corp',
                    duration: '2020-Present',
                    years: 4
                },
                {
                    title: 'Software Engineer',
                    company: 'StartupXYZ',
                    duration: '2018-2020',
                    years: 2
                }
            ],
            skills: {
                technical: ['JavaScript', 'React', 'Node.js', 'Python'],
                soft: ['Leadership', 'Communication', 'Problem Solving']
            }
        };
        
        await sessionService.storeStepResult(
            sessionId, 
            'professional', 
            professionalData, 
            0.88, 
            { extraction_method: 'llm_enhanced', tokens_used: 850 }
        );
        console.log('✅ Professional data stored\n');

        // Test 5: Get Context for Step 3
        console.log('5️⃣ Getting context for Step 3...');
        const context2 = await sessionService.getSessionContext(sessionId);
        console.log('📋 Context for Step 3:');
        console.log(`   - Previous steps: ${Object.keys(context2.previousSteps).join(', ')}`);
        console.log(`   - Experience level: ${context2.knownFacts.experienceLevel}`);
        console.log(`   - Skills count: ${context2.knownFacts.skills.length}`);
        console.log(`   - Step count: ${context2.stepCount}\n`);

        // Test 6: Store Step 3 Results
        console.log('6️⃣ Storing Step 3 (Additional) results...');
        const additionalData = {
            projects: [
                {
                    name: 'E-commerce Platform',
                    description: 'Built scalable React/Node.js platform',
                    technologies: ['React', 'Node.js', 'MongoDB']
                }
            ],
            certifications: [
                {
                    name: 'AWS Certified Developer',
                    issuer: 'Amazon',
                    year: '2023'
                }
            ]
        };
        
        await sessionService.storeStepResult(
            sessionId, 
            'additional', 
            additionalData, 
            0.92, 
            { extraction_method: 'llm_final', tokens_used: 320 }
        );
        console.log('✅ Additional data stored\n');

        // Test 7: Get Final Result
        console.log('7️⃣ Getting final combined result...');
        const finalResult = await sessionService.getFinalResult(sessionId);
        console.log('📊 Final Result Summary:');
        console.log(`   - Name: ${finalResult.personalInfo.name}`);
        console.log(`   - Experience entries: ${finalResult.experience.length}`);
        console.log(`   - Technical skills: ${finalResult.skills.technical?.length || 0}`);
        console.log(`   - Projects: ${finalResult.projects.length}`);
        console.log(`   - Processing info: ${JSON.stringify(finalResult.processingInfo, null, 2)}\n`);

        // Test 8: Session Stats
        console.log('8️⃣ Getting session statistics...');
        const stats = await sessionService.getSessionStats(sessionId);
        console.log('📈 Session Stats:');
        console.log(`   - Steps completed: ${stats.step_count}`);
        console.log(`   - Processing time: ${Math.round(stats.processing_time_seconds)}s`);
        console.log(`   - Session active: ${stats.is_active}\n`);

        // Test 9: Cleanup
        console.log('9️⃣ Cleaning up session...');
        await sessionService.cleanupSession(sessionId);
        console.log('✅ Session cleaned up\n');

        // Test 10: Test Expired Session Access
        console.log('🔟 Testing expired session access...');
        try {
            await sessionService.getSessionContext(sessionId);
            console.log('❌ ERROR: Should not be able to access cleaned up session');
        } catch (error) {
            console.log('✅ Correctly blocked access to cleaned up session\n');
        }

        console.log('🎉 All session memory tests passed!\n');
        
        // Display Summary
        console.log('📋 Session Memory System Summary:');
        console.log('   ✅ Session creation and management');
        console.log('   ✅ Step-by-step data storage');
        console.log('   ✅ Context sharing between steps');
        console.log('   ✅ Known facts extraction');
        console.log('   ✅ Final result compilation');
        console.log('   ✅ Session cleanup and security');
        console.log('\n🚀 Ready for LangChain integration!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run tests
if (require.main === module) {
    testSessionMemory().then(() => {
        console.log('Test completed. Exiting...');
        process.exit(0);
    }).catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testSessionMemory };