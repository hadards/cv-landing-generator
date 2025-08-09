// Intelligent CV Processor with Ollama + Session Memory
// Complete mirror of Gemini version but using Ollama as LLM provider

const OllamaClient = require('./utils/ollama-client');
const CVSessionService = require('./services/cv-session-service');
const TextCleaner = require('./utils/text-cleaner');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

class IntelligentCVProcessorOllama {
    constructor(config = {}) {
        console.log('Initializing Intelligent CV Processor with Ollama...');
        
        // Initialize Ollama client
        this.ollamaClient = new OllamaClient({
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            model: config.model || process.env.OLLAMA_MODEL || 'llama3.2',
            temperature: 0.1, // Low temperature for consistent extraction
            timeout: 60000 // 60 second timeout
        });
        
        // Initialize session service
        this.sessionService = new CVSessionService();
        
        console.log(`LLM Client: Ollama (${this.ollamaClient.model})`);
        console.log('Session Memory: Enabled');
        console.log('Intelligent CV Processor ready');
    }

    /**
     * Extract text from uploaded file
     * @param {string} filePath - Path to uploaded file
     * @param {string} mimeType - MIME type of file
     * @returns {string} Extracted text
     */
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
                case 'text/plain':
                    extractedText = fs.readFileSync(filePath, 'utf8');
                    break;
                default:
                    throw new Error(`Unsupported file type: ${mimeType}`);
            }
            
            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text could be extracted from the file');
            }
            
            console.log(`✓ Extracted ${extractedText.length} characters from CV`);
            return extractedText.trim();
            
        } catch (error) {
            console.error('Text extraction failed:', error.message);
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    }

    /**
     * Extract text from PDF file
     */
    async extractFromPDF(filePath) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } catch (error) {
            throw new Error(`PDF extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from Word document
     */
    async extractFromWord(filePath) {
        try {
            const result = await mammoth.extractRawText({path: filePath});
            return result.value;
        } catch (error) {
            throw new Error(`Word document extraction failed: ${error.message}`);
        }
    }

    /**
     * Main entry point for CV processing
     * @param {string} cvText - Extracted CV text
     * @param {string} userId - User ID for session management
     * @returns {Object} Structured CV data
     */
    async processCV(cvText, userId) {
        console.log('Starting Intelligent CV Processing with Ollama...');
        console.log(`Processing ${cvText.length} characters for user: ${userId}`);
        
        try {
            // Clean the text first
            const cleanedText = TextCleaner.prepareForAI(cvText);
            console.log(`Text cleaned: ${cvText.length} -> ${cleanedText.length} characters`);
            console.log('🤖 Text prepared for AI: ' + cleanedText.length + ' characters');
            
            // Create a processing session for this CV
            const sessionId = await this.sessionService.createSession(userId, {
                originalText: cvText,
                cleanedText: cleanedText,
                status: 'processing'
            });
            
            console.log(`Created CV processing session: ${sessionId}`);
            
            try {
                // Process with memory-enhanced multi-step approach
                const result = await this.processWithMemory(cleanedText, sessionId);
                
                // Mark session as completed  
                await this.sessionService.storeStepResult(sessionId, 'final_result', result, 1.0, {
                    status: 'completed',
                    processing_time: Date.now() - Date.now()
                });
                
                console.log(`CV processing completed for: ${result.personalInfo?.name || 'Unknown'}`);
                return result;
                
            } catch (processingError) {
                // Mark session as failed
                await this.sessionService.storeStepResult(sessionId, 'error', { 
                    error: processingError.message 
                }, 0.0, {
                    status: 'failed',
                    error_timestamp: new Date().toISOString()
                });
                
                console.error(`CV processing failed for session ${sessionId}:`, processingError.message);
                throw processingError;
            }
            
        } catch (error) {
            console.error('CV processing failed:', error.message);
            throw error;
        }
    }

    /**
     * Process CV with session memory and context
     */
    async processWithMemory(cvText, sessionId) {
        console.log(`Created processing session: ${sessionId}`);
        console.log('Multi-step processing with memory...');
        
        try {
            // Step 1: Extract basic personal information
            console.log('Step 1: Extracting basic personal information...');
            const basicInfo = await this.extractBasicInfo(cvText);
            await this.sessionService.storeStepResult(sessionId, 'basic_info', basicInfo);
            console.log(`Basic info extracted: ${basicInfo.name} (${basicInfo.title})`);
            
            // Step 2: Extract professional experience with context
            console.log('Step 2: Extracting professional experience with context...');
            const context = await this.sessionService.getSessionContext(sessionId);
            const professionalInfo = await this.extractProfessional(cvText, context);
            await this.sessionService.storeStepResult(sessionId, 'professional', professionalInfo);
            console.log(`Professional data: ${professionalInfo.experience?.length || 0} jobs, ${professionalInfo.skills?.length || 0} skills`);
            
            // Step 3: Extract additional details with full context
            console.log('Step 3: Extracting additional details with full context...');
            const updatedContext = await this.sessionService.getSessionContext(sessionId);
            const additionalInfo = await this.extractAdditional(cvText, updatedContext);
            await this.sessionService.storeStepResult(sessionId, 'additional', additionalInfo);
            console.log(`Additional data: ${additionalInfo.projects?.length || 0} projects, ${additionalInfo.certifications?.length || 0} certs`);
            
            // Step 4: Assemble final result
            console.log('Step 4: Assembling final result...');
            const finalContext = await this.sessionService.getSessionContext(sessionId);
            
            // Extract data from previous steps (stored in previousSteps, not steps)
            const steps = finalContext.previousSteps || {};
            const basicInfoData = steps.basic_info?.data || {};
            const professionalInfoData = steps.professional?.data || {};
            const additionalInfoData = steps.additional?.data || {};
            
            const result = {
                personalInfo: basicInfoData,
                experience: professionalInfoData.experience || [],
                skills: professionalInfoData.skills || [],
                education: professionalInfoData.education || [],
                projects: additionalInfoData.projects || [],
                certifications: additionalInfoData.certifications || [],
                languages: additionalInfoData.languages || [],
                summary: basicInfoData.summary || '',
                metadata: {
                    processed_at: new Date().toISOString(),
                    processor: 'ollama-intelligent',
                    session_id: sessionId,
                    steps_completed: Object.keys(steps).length
                }
            };
            
            return result;
            
        } catch (error) {
            console.error(`Error in memory-enhanced processing:`, error.message);
            throw error;
        }
    }

    /**
     * Retry mechanism with exponential backoff
     */
    async retryWithBackoff(operation, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Clean and extract JSON from Ollama response
     */
    cleanAndParseJSON(response) {
        try {
            const cleanedResponse = response.trim();
            
            // Try to find JSON block
            let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            let jsonStr = jsonMatch[0];
            
            // Clean common issues in Ollama responses
            jsonStr = jsonStr
                // Fix unescaped quotes in strings
                .replace(/: "([^"]*)"([^",}\n]*)"([^",}\n]*)"([^",}\]]*)",/g, ': "$1\\"$2\\"$3\\"$4",')
                // Fix unescaped backslashes
                .replace(/\\/g, '\\\\')
                // Fix control characters
                .replace(/[\x00-\x1F\x7F]/g, '')
                // Fix trailing commas
                .replace(/,(\s*[}\]])/g, '$1');
            
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('JSON parsing failed:', error.message);
            console.error('Response was:', response.substring(0, 500) + '...');
            throw new Error(`Failed to parse JSON: ${error.message}`);
        }
    }

    /**
     * Extract basic personal information
     */
    async extractBasicInfo(cvText) {
        const prompt = `Extract basic personal information from this CV text. Return ONLY a valid JSON object with these fields:

{
    "name": "Full name",
    "title": "Professional title or role",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, Country",
    "summary": "Professional summary or objective (2-3 sentences)",
    "linkedin": "LinkedIn URL if mentioned",
    "github": "GitHub URL if mentioned",
    "website": "Personal website if mentioned"
}

CV Text:
${cvText}

JSON Response:`;

        try {
            return await this.retryWithBackoff(async () => {
                const response = await this.ollamaClient._sendRequest(prompt, { temperature: 0.1 });
                const result = this.cleanAndParseJSON(response);
                
                // Ensure required fields exist
                return {
                    name: result.name || 'Unknown',
                    title: result.title || 'Professional',
                    email: result.email || '',
                    phone: result.phone || '',
                    location: result.location || '',
                    summary: result.summary || '',
                    linkedin: result.linkedin || '',
                    github: result.github || '',
                    website: result.website || ''
                };
            });
        } catch (error) {
            console.error('Basic info extraction failed:', error);
            throw new Error(`Failed to extract basic information: ${error.message}`);
        }
    }

    /**
     * Extract professional experience and skills
     */
    async extractProfessional(cvText, context) {
        const steps = context?.previousSteps || {};
        const basicInfo = steps.basic_info?.data || {};
        const contextInfo = basicInfo.name ? `Person: ${basicInfo.name}, Title: ${basicInfo.title}` : '';
        
        const prompt = `Extract professional information from this CV. ${contextInfo}

Return ONLY a valid JSON object with these fields:

{
    "experience": [
        {
            "company": "Company name",
            "position": "Job title",
            "startDate": "Start date",
            "endDate": "End date or 'Present'",
            "description": "Job description and achievements"
        }
    ],
    "skills": ["skill1", "skill2", "skill3"],
    "education": [
        {
            "institution": "School name",
            "degree": "Degree type and field",
            "year": "Graduation year",
            "gpa": "GPA if mentioned"
        }
    ]
}

CV Text:
${cvText}

JSON Response:`;

        try {
            return await this.retryWithBackoff(async () => {
                const response = await this.ollamaClient._sendRequest(prompt, { temperature: 0.1 });
                const result = this.cleanAndParseJSON(response);
                
                return {
                    experience: result.experience || [],
                    skills: result.skills || [],
                    education: result.education || []
                };
            });
        } catch (error) {
            console.error('Professional info extraction failed:', error);
            throw new Error(`Failed to extract professional information: ${error.message}`);
        }
    }

    /**
     * Extract additional details (projects, certifications, languages)
     */
    async extractAdditional(cvText, context) {
        const steps = context?.previousSteps || {};
        const basicInfo = steps.basic_info?.data || {};
        const professionalInfo = steps.professional?.data || {};
        const contextInfo = `Person: ${basicInfo.name || 'Unknown'}, Skills: ${(professionalInfo.skills || []).slice(0, 3).join(', ')}`;
        
        const prompt = `Extract additional information from this CV. ${contextInfo}

Return ONLY a valid JSON object with these fields:

{
    "projects": [
        {
            "name": "Project name",
            "description": "Project description",
            "technologies": ["tech1", "tech2"],
            "url": "Project URL if mentioned"
        }
    ],
    "certifications": [
        {
            "name": "Certification name",
            "issuer": "Issuing organization",
            "year": "Year obtained",
            "url": "Certificate URL if mentioned"
        }
    ],
    "languages": [
        {
            "language": "Language name",
            "proficiency": "Native/Fluent/Intermediate/Basic"
        }
    ]
}

CV Text:
${cvText}

JSON Response:`;

        try {
            return await this.retryWithBackoff(async () => {
                const response = await this.ollamaClient._sendRequest(prompt, { temperature: 0.1 });
                const result = this.cleanAndParseJSON(response);
                
                return {
                    projects: result.projects || [],
                    certifications: result.certifications || [],
                    languages: result.languages || []
                };
            });
        } catch (error) {
            console.error('Additional info extraction failed:', error);
            throw new Error(`Failed to extract additional information: ${error.message}`);
        }
    }

    /**
     * Test connection to Ollama
     */
    async testConnection() {
        try {
            console.log('Testing Ollama connection...');
            const response = await this.ollamaClient._validateConnection();
            console.log('✓ Ollama connection successful');
            return response;
        } catch (error) {
            console.error('❌ Ollama connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Legacy method for backwards compatibility
     */
    async structureWithOllama(extractedText) {
        console.log('Using legacy structureWithOllama method - consider using processCV instead');
        
        // Create a temporary session for legacy processing
        const tempSessionId = await this.sessionService.createSession('legacy-user', {
            originalText: extractedText,
            status: 'processing'
        });
        
        try {
            const result = await this.processWithMemory(extractedText, tempSessionId);
            await this.sessionService.storeStepResult(tempSessionId, 'legacy_completed', result, 1.0, { status: 'completed' });
            return result;
        } catch (error) {
            await this.sessionService.storeStepResult(tempSessionId, 'legacy_error', { error: error.message }, 0.0, { status: 'failed' });
            throw error;
        }
    }
}

module.exports = IntelligentCVProcessorOllama;