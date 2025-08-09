// Test script for Intelligent CV Processor with Gemini + Memory
// Run with: node test/test-intelligent-processor-gemini.js

// Load environment variables
require('dotenv').config();

const IntelligentCVProcessorGemini = require('../lib/intelligent-cv-processor-gemini');

// Sample CV text for testing (same as Ollama version)
const SAMPLE_CV_TEXT = `
John Smith
Senior Software Engineer
Email: john.smith@email.com
Phone: (555) 123-4567
Location: San Francisco, CA

PROFESSIONAL SUMMARY
Experienced full-stack developer with 6+ years building scalable web applications. 
Expert in JavaScript, React, Node.js and cloud technologies. Led development teams 
and delivered multiple successful products.

WORK EXPERIENCE

Senior Software Engineer - Tech Corp (2020 - Present)
• Led development of e-commerce platform serving 100k+ users
• Built microservices architecture using Node.js and Docker
• Mentored junior developers and improved team productivity by 30%
• Technologies: React, Node.js, PostgreSQL, AWS, Docker

Software Engineer - StartupXYZ (2018 - 2020)  
• Developed mobile-first web applications using React and TypeScript
• Implemented real-time features using WebSocket and Redis
• Collaborated with design team to create responsive user interfaces
• Technologies: React, TypeScript, Redux, MongoDB

Junior Developer - WebCorp (2016 - 2018)
• Built responsive websites for small business clients
• Learned modern JavaScript frameworks and development practices
• Participated in code reviews and agile development processes
• Technologies: HTML, CSS, jQuery, PHP, MySQL

TECHNICAL SKILLS
Programming Languages: JavaScript, TypeScript, Python, Java
Frontend: React, Vue.js, HTML5, CSS3, Sass
Backend: Node.js, Express, Django, Spring Boot
Databases: PostgreSQL, MongoDB, Redis, MySQL
Cloud: AWS, Docker, Kubernetes
Tools: Git, Jenkins, Jira, Figma

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley (2012-2016)
GPA: 3.7/4.0
Relevant Coursework: Data Structures, Algorithms, Database Systems

PROJECTS
E-commerce Analytics Dashboard (2023)
Built real-time analytics dashboard for e-commerce platform using React and D3.js.
Processed millions of transactions and provided business insights.
Technologies: React, D3.js, Node.js, PostgreSQL

Open Source Chat Application (2022)
Created open-source real-time chat application with 500+ GitHub stars.
Implemented features like file sharing, emoji reactions, and group chats.
Technologies: React, Socket.io, MongoDB
GitHub: github.com/johnsmith/chat-app

CERTIFICATIONS
AWS Certified Developer Associate - Amazon Web Services (2023)
Professional Scrum Master I - Scrum.org (2022)

AWARDS
Employee of the Year - Tech Corp (2022)
Best Innovation Project - StartupXYZ (2019)
`;

async function testIntelligentProcessorGemini() {
    // console.log('🧠 Testing Intelligent CV Processor with Gemini + Memory...\n');
    
    try {
        const processor = new IntelligentCVProcessorGemini();
        const testUserId = '0d7a5108-516a-4b43-8bbd-bc1b66a4f93e';
        
        // Test 1: Gemini Connection
        // console.log('1️⃣ Testing Gemini connection...');
        const connectionTest = await processor.testConnection();
        if (!connectionTest) {
            throw new Error('Gemini connection failed - check API key');
        }
        // console.log('✅ Gemini connection successful\n');

        // Test 2: Full CV Processing with Memory
        // console.log('2️⃣ Processing sample CV with intelligent memory system...');
        // console.log('📄 Sample CV: John Smith, Senior Software Engineer\n');
        
        const startTime = Date.now();
        const result = await processor.processCV(SAMPLE_CV_TEXT, testUserId);
        const processingTime = Date.now() - startTime;
        
        // console.log(`⏱️ Processing completed in ${processingTime}ms\n`);

        // Test 3: Analyze Results
        // console.log('3️⃣ Analyzing extraction results...\n');
        
        // console.log('👤 PERSONAL INFO:');
        // console.log(`   Name: ${result.personalInfo.name}`);
        // console.log(`   Email: ${result.personalInfo.email}`);
        // console.log(`   Title: ${result.personalInfo.currentTitle}`);
        // console.log(`   Location: ${result.personalInfo.location}`);
        // console.log(`   Summary: ${result.personalInfo.summary?.substring(0, 100)}...`);
        
        // console.log('\n💼 PROFESSIONAL DATA:');
        // console.log(`   Work Experience: ${result.experience?.length || 0} positions`);
        result.experience?.forEach((job, i) => {
            // console.log(`     ${i+1}. ${job.title} at ${job.company} (${job.startDate} - ${job.endDate})`);
        });
        
        // console.log(`   Technical Skills: ${result.skills?.technical?.length || 0} skills`);
        if (result.skills?.technical?.length > 0) {
            // console.log(`     ${result.skills.technical.slice(0, 5).join(', ')}...`);
        }
        
        // console.log(`   Education: ${result.education?.length || 0} degrees`);
        result.education?.forEach((edu, i) => {
            // console.log(`     ${i+1}. ${edu.degree} in ${edu.field} - ${edu.school} (${edu.graduationYear})`);
        });
        
        // console.log('\n🎯 ADDITIONAL INFO:');
        // console.log(`   Projects: ${result.projects?.length || 0}`);
        result.projects?.forEach((project, i) => {
            // console.log(`     ${i+1}. ${project.name} (${project.year})`);
        });
        
        // console.log(`   Certifications: ${result.certifications?.length || 0}`);
        result.certifications?.forEach((cert, i) => {
            // console.log(`     ${i+1}. ${cert.name} - ${cert.issuer} (${cert.year})`);
        });
        
        // console.log(`   Awards: ${result.awards?.length || 0}`);
        result.awards?.forEach((award, i) => {
            // console.log(`     ${i+1}. ${award.name} - ${award.issuer} (${award.year})`);
        });
        
        // console.log('\n📊 PROCESSING METADATA:');
        // console.log(`   LLM Provider: ${result.processingMetadata?.llmProvider}`);
        // console.log(`   Profession Detected: ${result.processingInfo?.profession}`);
        // console.log(`   Experience Level: ${result.processingInfo?.experienceLevel}`);
        // console.log(`   Steps Completed: ${result.processingInfo?.stepsCompleted}`);
        // console.log(`   Confidence Scores:`);
        Object.entries(result.processingInfo?.confidenceScores || {}).forEach(([step, score]) => {
            // console.log(`     ${step}: ${(score * 100).toFixed(1)}%`);
        });
        
        // Test 4: Quality Assessment
        // console.log('\n4️⃣ Quality Assessment...');
        
        const qualityChecks = {
            hasName: !!result.personalInfo?.name,
            hasEmail: !!result.personalInfo?.email,
            hasExperience: result.experience?.length > 0,
            hasSkills: result.skills?.technical?.length > 0,
            hasEducation: result.education?.length > 0,
            memoryUsed: result.processingMetadata?.sessionMemoryUsed,
            intelligentProcessor: result.processingMetadata?.intelligentProcessor,
            usingGemini: result.processingMetadata?.llmProvider === 'gemini'
        };
        
        // console.log('✅ QUALITY CHECKS:');
        Object.entries(qualityChecks).forEach(([check, passed]) => {
            // console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed}`);
        });
        
        const passedChecks = Object.values(qualityChecks).filter(Boolean).length;
        const totalChecks = Object.keys(qualityChecks).length;
        const qualityScore = (passedChecks / totalChecks * 100).toFixed(1);
        
        // console.log(`\n🎯 OVERALL QUALITY SCORE: ${qualityScore}% (${passedChecks}/${totalChecks} checks passed)`);
        
        // Test 5: Performance Comparison
        // console.log('\n5️⃣ Performance Analysis...');
        // console.log(`   ⏱️ Total Processing Time: ${processingTime}ms`);
        // console.log(`   🧠 Memory System: ${result.processingMetadata?.sessionMemoryUsed ? 'Active' : 'Inactive'}`);
        // console.log(`   🤖 LLM Provider: ${result.processingMetadata?.llmProvider || 'Unknown'}`);
        // console.log(`   📊 Average Confidence: ${Object.values(result.processingInfo?.confidenceScores || {}).reduce((a, b) => a + b, 0) / Object.keys(result.processingInfo?.confidenceScores || {}).length || 0}`);

        // Final Summary
        // console.log('\n🎉 INTELLIGENT CV PROCESSOR (GEMINI) TEST SUMMARY:');
        // console.log('   ✅ Gemini integration working');
        // console.log('   ✅ Session memory system functional');
        // console.log('   ✅ Multi-step processing with context sharing');
        // console.log('   ✅ Profession detection and experience level calculation');
        // console.log('   ✅ Comprehensive data extraction');
        // console.log('   ✅ Quality and validation checks passed');
        // console.log(`   ⏱️ Processing time: ${processingTime}ms`);
        // console.log(`   📊 Quality score: ${qualityScore}%`);
        
        if (qualityScore >= 70) {
            // console.log('\n🚀 READY FOR PRODUCTION! Gemini + Memory system working optimally.');
        } else {
            // console.log('\n⚠️ Some quality checks failed - review extraction quality.');
        }

        // console.log('\n💡 NEXT STEPS:');
        // console.log('   1. Update CV controller to use IntelligentCVProcessorGemini');
        // console.log('   2. Test with real user CVs');
        // console.log('   3. Monitor processing performance and accuracy');
        // console.log('   4. Implement learning system (Week 3)');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('\nDebugging info:');
        console.error('- Check GEMINI_API_KEY in .env file');
        console.error('- Verify Supabase database connection');
        console.error('- Ensure session memory tables exist');
        console.error('\nStack trace:', error.stack);
    }
}

// Run tests
if (require.main === module) {
    testIntelligentProcessorGemini().then(() => {
        // console.log('\nTest completed. Exiting...');
        process.exit(0);
    }).catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testIntelligentProcessorGemini };