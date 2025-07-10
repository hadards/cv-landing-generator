// File: test-processors-individually.js
// Test each CV processor individually with a local CV file

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Import all processors
const PersonalInfoProcessor = require('./lib/cv-processors/personal-info-processor');
const AboutMeProcessor = require('./lib/cv-processors/about-me-processor');
const ExperienceProcessor = require('./lib/cv-processors/experience-processor');
const SkillsProcessor = require('./lib/cv-processors/skills-processor');
const EducationProcessor = require('./lib/cv-processors/education-processor');
const ProjectsProcessor = require('./lib/cv-processors/projects-processor');
const CertificationsProcessor = require('./lib/cv-processors/certifications-processor');
const TextCleaner = require('./lib/utils/text-cleaner');

async function testProcessorsIndividually(cvFilePath) {
    console.log('=== Individual Processor Testing ===');
    console.log(`Testing with CV file: ${cvFilePath}`);
    
    // Check if file exists
    if (!fs.existsSync(cvFilePath)) {
        console.error(`File not found: ${cvFilePath}`);
        console.log('\nUsage: node test-processors-individually.js path/to/your/cv.pdf');
        process.exit(1);
    }
    
    try {
        // Step 1: Extract text from CV file
        console.log('\n=== Step 1: Extract Text ===');
        const extractedText = await extractTextFromFile(cvFilePath);
        console.log(`Extracted ${extractedText.length} characters`);
        console.log('Text preview:', extractedText.substring(0, 200) + '...\n');
        
        // Clean text for processing
        const cleanedText = TextCleaner.prepareForAI(extractedText);
        console.log(`Cleaned text: ${cleanedText.length} characters`);
        
        // LLM Configuration for all processors
        const llmConfig = {
            type: 'ollama',
            model: 'mistral'
        };
        
        console.log(`Using LLM: ${llmConfig.type} with model: ${llmConfig.model}\n`);
        
        // Initialize all processors (just like your main code)
        console.log('=== Initializing Processors ===');
        const personalInfoProcessor = new PersonalInfoProcessor(llmConfig);
        const aboutMeProcessor = new AboutMeProcessor(llmConfig);
        const experienceProcessor = new ExperienceProcessor(llmConfig);
        const skillsProcessor = new SkillsProcessor(llmConfig);
        const educationProcessor = new EducationProcessor(llmConfig);
        const projectsProcessor = new ProjectsProcessor(llmConfig);
        const certificationsProcessor = new CertificationsProcessor(llmConfig);
        
        console.log('All processors initialized\n');
        
        // Store results
        const results = {};
        
        // Test each processor individually
        console.log('=== Testing PersonalInfoProcessor ===');
        try {
            const personalResult = await personalInfoProcessor.process(cleanedText);
            results.personalInfo = personalResult.personalInfo;
            displayPersonalInfo(personalResult.personalInfo);
        } catch (error) {
            console.error('PersonalInfoProcessor failed:', error.message);
            results.personalInfo = null;
        }
        
        console.log('\n=== Testing AboutMeProcessor ===');
        try {
            const aboutResult = await aboutMeProcessor.process(cleanedText, results);
            results.aboutData = aboutResult.aboutData;
            displayAboutMe(aboutResult.aboutData);
        } catch (error) {
            console.error('AboutMeProcessor failed:', error.message);
            results.aboutData = null;
        }
        
        console.log('\n=== Testing ExperienceProcessor ===');
        try {
            const experienceResult = await experienceProcessor.process(cleanedText, results);
            results.experience = experienceResult.experience;
            displayExperience(experienceResult.experience);
        } catch (error) {
            console.error('ExperienceProcessor failed:', error.message);
            results.experience = null;
        }
        
        console.log('\n=== Testing SkillsProcessor ===');
        try {
            const skillsResult = await skillsProcessor.process(cleanedText, results);
            results.skills = skillsResult.skills;
            displaySkills(skillsResult.skills);
        } catch (error) {
            console.error('SkillsProcessor failed:', error.message);
            results.skills = null;
        }
        
        console.log('\n=== Testing EducationProcessor ===');
        try {
            const educationResult = await educationProcessor.process(cleanedText, results);
            results.education = educationResult.education;
            displayEducation(educationResult.education);
        } catch (error) {
            console.error('EducationProcessor failed:', error.message);
            results.education = null;
        }
        
        console.log('\n=== Testing ProjectsProcessor ===');
        try {
            const projectsResult = await projectsProcessor.process(cleanedText, results);
            results.projects = projectsResult.projects;
            displayProjects(projectsResult.projects);
        } catch (error) {
            console.error('ProjectsProcessor failed:', error.message);
            results.projects = null;
        }
        
        console.log('\n=== Testing CertificationsProcessor ===');
        try {
            const certificationsResult = await certificationsProcessor.process(cleanedText, results);
            results.certifications = certificationsResult.certifications;
            displayCertifications(certificationsResult.certifications);
        } catch (error) {
            console.error('CertificationsProcessor failed:', error.message);
            results.certifications = null;
        }
        
        // Summary
        console.log('\n=== Test Summary ===');
        displayTestSummary(results);
        
        return results;
        
    } catch (error) {
        console.error('Test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

async function extractTextFromFile(filePath) {
    const fileExtension = path.extname(filePath).toLowerCase();
    
    switch (fileExtension) {
        case '.pdf':
            console.log('Extracting from PDF...');
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
            
        case '.doc':
        case '.docx':
            console.log('Extracting from Word document...');
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
            
        default:
            throw new Error(`Unsupported file type: ${fileExtension}`);
    }
}

function displayPersonalInfo(personalInfo) {
    if (!personalInfo) {
        console.log('❌ No personal info extracted');
        return;
    }
    
    console.log('✅ Personal Information:');
    console.log(`  Name: "${personalInfo.name}"`);
    console.log(`  Email: "${personalInfo.email}"`);
    console.log(`  Phone: "${personalInfo.phone}"`);
    console.log(`  Location: "${personalInfo.location}"`);
    console.log(`  Current Title: "${personalInfo.currentTitle}"`);
}

function displayAboutMe(aboutData) {
    if (!aboutData) {
        console.log('❌ No about me data generated');
        return;
    }
    
    console.log('✅ About Me Content:');
    console.log(`  Summary (${aboutData.summary?.length || 0} chars): "${aboutData.summary?.substring(0, 100)}..."`);
    console.log(`  About Me (${aboutData.aboutMe?.length || 0} chars): "${aboutData.aboutMe?.substring(0, 100)}..."`);
}

function displayExperience(experience) {
    if (!experience || experience.length === 0) {
        console.log('❌ No work experience extracted');
        return;
    }
    
    console.log(`✅ Work Experience (${experience.length} entries):`);
    experience.forEach((exp, index) => {
        console.log(`  ${index + 1}. ${exp.title} at ${exp.company}`);
        console.log(`     Location: ${exp.location}`);
        console.log(`     Duration: ${exp.startDate} - ${exp.endDate}`);
        console.log(`     Description: "${exp.description?.substring(0, 80)}..."`);
        console.log(`     Achievements: ${exp.achievements?.length || 0} items`);
    });
}

function displaySkills(skills) {
    if (!skills) {
        console.log('❌ No skills extracted');
        return;
    }
    
    console.log('✅ Skills:');
    console.log(`  Technical (${skills.technical?.length || 0}): [${skills.technical?.slice(0, 5).join(', ')}${skills.technical?.length > 5 ? '...' : ''}]`);
    console.log(`  Soft (${skills.soft?.length || 0}): [${skills.soft?.slice(0, 5).join(', ')}${skills.soft?.length > 5 ? '...' : ''}]`);
    console.log(`  Languages (${skills.languages?.length || 0}): [${skills.languages?.join(', ')}]`);
}

function displayEducation(education) {
    if (!education || education.length === 0) {
        console.log('❌ No education extracted');
        return;
    }
    
    console.log(`✅ Education (${education.length} entries):`);
    education.forEach((edu, index) => {
        console.log(`  ${index + 1}. ${edu.degree} from ${edu.institution}`);
        console.log(`     Location: ${edu.location}`);
        console.log(`     Graduation: ${edu.graduationDate}`);
        if (edu.gpa) console.log(`     GPA: ${edu.gpa}`);
        console.log(`     Achievements: ${edu.achievements?.length || 0} items`);
    });
}

function displayProjects(projects) {
    if (!projects || projects.length === 0) {
        console.log('❌ No projects extracted');
        return;
    }
    
    console.log(`✅ Projects (${projects.length} entries):`);
    projects.forEach((proj, index) => {
        console.log(`  ${index + 1}. ${proj.name}`);
        console.log(`     Description: "${proj.description?.substring(0, 80)}..."`);
        console.log(`     Technologies: [${proj.technologies?.join(', ')}]`);
        if (proj.url) console.log(`     URL: ${proj.url}`);
    });
}

function displayCertifications(certifications) {
    if (!certifications || certifications.length === 0) {
        console.log('❌ No certifications extracted');
        return;
    }
    
    console.log(`✅ Certifications (${certifications.length} entries):`);
    certifications.forEach((cert, index) => {
        console.log(`  ${index + 1}. ${cert.name}`);
        console.log(`     Issuer: ${cert.issuer}`);
        console.log(`     Date: ${cert.date}`);
        console.log(`     Type: ${cert.type}`);
        if (cert.url) console.log(`     URL/ID: ${cert.url}`);
        if (cert.description) console.log(`     Description: "${cert.description?.substring(0, 80)}..."`);
    });
}

function displayTestSummary(results) {
    const sections = [
        { name: 'Personal Info', data: results.personalInfo, key: 'name' },
        { name: 'About Me', data: results.aboutData, key: 'summary' },
        { name: 'Experience', data: results.experience, key: 'length' },
        { name: 'Skills', data: results.skills, key: 'technical' },
        { name: 'Education', data: results.education, key: 'length' },
        { name: 'Projects', data: results.projects, key: 'length' },
        { name: 'Certifications', data: results.certifications, key: 'length' }
    ];
    
    console.log('Processor Results:');
    sections.forEach(section => {
        const status = section.data ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${section.name}: ${status}`);
    });
    
    const passedCount = sections.filter(s => s.data).length;
    console.log(`\nOverall: ${passedCount}/${sections.length} processors succeeded`);
    
    if (passedCount === sections.length) {
        console.log('🎉 All processors working correctly with Mistral!');
    } else {
        console.log('⚠️  Some processors failed - check the errors above');
    }
}

// Command line usage
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node test-processors-individually.js <path-to-cv-file>');
        console.log('');
        console.log('Examples:');
        console.log('  node test-processors-individually.js "C:\\Users\\YourName\\Documents\\cv.pdf"');
        console.log('  node test-processors-individually.js "./your-cv.pdf"');
        console.log('  node test-processors-individually.js "/path/to/your/cv.docx"');
        process.exit(1);
    }
    
    const cvFilePath = args[0];
    await testProcessorsIndividually(cvFilePath);
}

if (require.main === module) {
    main();
}