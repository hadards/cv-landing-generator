// File: lib/cv-parser-modular.js
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Import processors
const PersonalInfoProcessor = require('./cv-processors/personal-info-processor');
const AboutMeProcessor = require('./cv-processors/about-me-processor');
const ExperienceProcessor = require('./cv-processors/experience-processor');
const SkillsProcessor = require('./cv-processors/skills-processor');
const EducationProcessor = require('./cv-processors/education-processor');
const ProjectsProcessor = require('./cv-processors/projects-processor');
const CertificationsProcessor = require('./cv-processors/certifications-processor');

// Import utilities
const TextCleaner = require('./utils/text-cleaner');
const LLMClientFactory = require('./utils/llm-client-factory');

class ModularCVParser {
    constructor(llmConfig = {}) {
        console.log('Initializing Modular CV Parser...');
        
        // Determine LLM configuration
        this.llmConfig = this._resolveLLMConfig(llmConfig);
        console.log(`Using LLM client: ${this.llmConfig.type || 'gemini'}`);
        
        // Initialize processors with LLM configuration
        this.personalInfoProcessor = new PersonalInfoProcessor(this.llmConfig);
        this.aboutMeProcessor = new AboutMeProcessor(this.llmConfig);
        this.experienceProcessor = new ExperienceProcessor(this.llmConfig);
        this.skillsProcessor = new SkillsProcessor(this.llmConfig);
        this.educationProcessor = new EducationProcessor(this.llmConfig);
        this.projectsProcessor = new ProjectsProcessor(this.llmConfig);
        this.certificationsProcessor = new CertificationsProcessor(this.llmConfig);
        
        // Test LLM connection
        this.testLLMConnection();
        
        console.log('Modular CV Parser ready');
    }

    _resolveLLMConfig(providedConfig) {
        // Priority: provided config > environment variables > defaults
        const config = {
            type: providedConfig.type || process.env.LLM_CLIENT_TYPE || 'gemini',
            ...providedConfig
        };

        // Add client-specific defaults
        switch (config.type.toLowerCase()) {
            case 'ollama':
                config.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
                config.model = config.model || process.env.OLLAMA_MODEL || 'llama2';
                break;
            case 'gemini':
                config.model = config.model || 'gemini-1.5-flash';
                break;
        }

        return config;
    }

    async testLLMConnection() {
        try {
            const client = LLMClientFactory.createClient(this.llmConfig);
            await client.testConnection();
            console.log(`LLM client (${client.clientName}) connection verified`);
        } catch (error) {
            console.error('LLM connection test failed:', error.message);
            
            // If Gemini fails, suggest Ollama as alternative
            if (this.llmConfig.type === 'gemini' && error.message.includes('API')) {
                console.log('\nSuggestion: Consider using Ollama as an alternative:');
                console.log('1. Install Ollama: https://ollama.ai/');
                console.log('2. Pull a model: ollama pull llama2');
                console.log('3. Set environment: LLM_CLIENT_TYPE=ollama');
            }
            
            throw error;
        }
    }

    async extractTextFromFile(filePath, mimeType) {
        try {
            console.log(`Extracting text from: ${filePath}`);
            console.log(`File type: ${mimeType}`);
            
            let extractedText = '';
            
            switch (mimeType) {
                case 'application/pdf':
                    extractedText = await this.extractFromPDF(filePath);
                    break;
                case 'application/msword':
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    extractedText = await this.extractFromWord(filePath);
                    break;
                default:
                    throw new Error('Unsupported file type: ' + mimeType);
            }
            
            console.log(`Text extraction successful: ${extractedText.length} characters`);
            return extractedText;
            
        } catch (error) {
            console.error('Text extraction error:', error);
            throw new Error('Failed to extract text from file: ' + error.message);
        }
    }

    async extractFromPDF(filePath) {
        console.log('Extracting from PDF...');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    }

    async extractFromWord(filePath) {
        console.log('Extracting from Word document...');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    async processCV(extractedText) {
        console.log('Starting CV processing...');
        console.log(`Processing ${extractedText.length} characters`);
        
        // Clean the text first
        const cleanedText = TextCleaner.prepareForAI(extractedText);
        console.log(`Text cleaned: ${cleanedText.length} characters`);
        
        // Process in phases - NO TRY/CATCH, let errors bubble up
        const cvData = {};
        
        // Phase 1: Extract personal information
        console.log('\nPhase 1: Processing personal information...');
        const personalResult = await this.personalInfoProcessor.process(cleanedText);
        Object.assign(cvData, personalResult);
        
        // Phase 2: Generate about me content
        console.log('\nPhase 2: Generating about me content...');
        const aboutResult = await this.aboutMeProcessor.process(cleanedText, cvData);
        Object.assign(cvData, aboutResult);
        
        // Phase 3: Extract work experience
        console.log('\nPhase 3: Processing work experience...');
        const experienceResult = await this.experienceProcessor.process(cleanedText, cvData);
        Object.assign(cvData, experienceResult);
        
        // Phase 4: Extract and organize skills
        console.log('\nPhase 4: Processing skills...');
        const skillsResult = await this.skillsProcessor.process(cleanedText, cvData);
        Object.assign(cvData, skillsResult);
        
        // Phase 5: Extract education background
        console.log('\nPhase 5: Processing education...');
        const educationResult = await this.educationProcessor.process(cleanedText, cvData);
        Object.assign(cvData, educationResult);
        
        // Phase 6: Extract projects and portfolio work
        console.log('\nPhase 6: Processing projects...');
        const projectsResult = await this.projectsProcessor.process(cleanedText, cvData);
        Object.assign(cvData, projectsResult);
        
        // Phase 7: Extract certifications and credentials
        console.log('\nPhase 7: Processing certifications...');
        const certificationsResult = await this.certificationsProcessor.process(cleanedText, cvData);
        Object.assign(cvData, certificationsResult);
        
        // Combine data into final structure
        const finalData = this.buildFinalStructure(cvData);
        
        // Validate the data
        this.validateCVData(finalData);
        
        console.log('CV processing completed successfully');
        console.log(`Generated data for: ${finalData.personalInfo.name}`);
        
        return finalData;
    }

    buildFinalStructure(cvData) {
        // Build the complete CV data structure
        const personalInfo = cvData.personalInfo || {};
        const aboutData = cvData.aboutData || {};
        const experience = cvData.experience || [];
        const skills = cvData.skills || { technical: [], soft: [], languages: [] };
        const education = cvData.education || [];
        const projects = cvData.projects || [];
        const certifications = cvData.certifications || [];
        
        return {
            personalInfo: {
                name: personalInfo.name || '',
                email: personalInfo.email || '',
                phone: personalInfo.phone || '',
                location: personalInfo.location || '',
                currentTitle: personalInfo.currentTitle || 'Professional',
                summary: aboutData.summary || '',
                aboutMe: aboutData.aboutMe || ''
            },
            experience: experience,
            skills: skills,
            education: education,
            projects: projects,
            certifications: certifications // Now populated!
        };
    }

    // Legacy compatibility method
    async structureWithGemini(extractedText) {
        return await this.processCV(extractedText);
    }

    // Utility method to validate the final data
    validateCVData(cvData) {
        const errors = [];
        
        if (!cvData.personalInfo?.name) {
            errors.push('Missing name');
        }
        
        if (!cvData.personalInfo?.summary) {
            errors.push('Missing summary');
        }
        
        if (!cvData.personalInfo?.aboutMe) {
            errors.push('Missing about me');
        }
        
        if (errors.length > 0) {
            throw new Error('CV data validation failed: ' + errors.join(', '));
        }
        
        console.log('CV data validation passed');
        return true;
    }

    // Method to get processing statistics
    getProcessingStats(cvData) {
        const stats = {
            personalInfo: {
                hasName: !!cvData.personalInfo?.name,
                hasEmail: !!cvData.personalInfo?.email,
                hasPhone: !!cvData.personalInfo?.phone,
                hasLocation: !!cvData.personalInfo?.location,
                hasSummary: !!cvData.personalInfo?.summary,
                hasAboutMe: !!cvData.personalInfo?.aboutMe
            },
            contentLengths: {
                summary: cvData.personalInfo?.summary?.length || 0,
                aboutMe: cvData.personalInfo?.aboutMe?.length || 0
            },
            sectionCounts: {
                experience: cvData.experience?.length || 0,
                education: cvData.education?.length || 0,
                projects: cvData.projects?.length || 0,
                certifications: cvData.certifications?.length || 0
            }
        };
        
        console.log('Processing statistics:', JSON.stringify(stats, null, 2));
        return stats;
    }

    // Method to switch LLM client for all processors
    switchLLMClient(newConfig) {
        console.log('Switching LLM client for all processors...');
        this.llmConfig = this._resolveLLMConfig(newConfig);
        
        this.personalInfoProcessor.switchLLMClient(this.llmConfig);
        this.aboutMeProcessor.switchLLMClient(this.llmConfig);
        this.experienceProcessor.switchLLMClient(this.llmConfig);
        this.skillsProcessor.switchLLMClient(this.llmConfig);
        this.educationProcessor.switchLLMClient(this.llmConfig);
        this.projectsProcessor.switchLLMClient(this.llmConfig);
        this.certificationsProcessor.switchLLMClient(this.llmConfig);
        
        console.log(`All processors now using: ${this.llmConfig.type}`);
    }

    // Method to test all LLM clients
    async testAllProcessors() {
        const processors = [
            this.personalInfoProcessor,
            this.aboutMeProcessor,
            this.experienceProcessor,
            this.skillsProcessor,
            this.educationProcessor,
            this.projectsProcessor,
            this.certificationsProcessor
        ];

        const results = {};
        for (const processor of processors) {
            results[processor.processorName] = await processor.testLLMClient();
        }

        return results;
    }
}

module.exports = ModularCVParser;