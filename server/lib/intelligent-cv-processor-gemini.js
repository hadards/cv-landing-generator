// Intelligent CV Processor with Gemini + Session Memory
// Alternative to Ollama version for when Ollama is not available

const { GoogleGenerativeAI } = require('@google/generative-ai');
const CVSessionService = require('./services/cv-session-service');
const TextCleaner = require('./utils/text-cleaner');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

class IntelligentCVProcessorGemini {
    constructor(config = {}) {
        console.log('Initializing Intelligent CV Processor with Gemini...');
        
        // Initialize Gemini client
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ 
            model: config.model || 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent extraction
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });
        
        // Initialize session service
        this.sessionService = new CVSessionService();
        
        console.log('LLM Client: Gemini (gemini-1.5-flash)');
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

    /**
     * Extract text from PDF file
     * @param {string} filePath - Path to PDF file
     * @returns {string} Extracted text
     */
    async extractFromPDF(filePath) {
        console.log('Extracting from PDF...');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    }

    /**
     * Extract text from Word document
     * @param {string} filePath - Path to Word document
     * @returns {string} Extracted text
     */
    async extractFromWord(filePath) {
        console.log('Extracting from Word document...');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    /**
     * Main CV processing method
     * @param {string} cvText - Extracted CV text
     * @param {string} userId - User ID for session tracking
     * @returns {object} Structured CV data
     */
    async processCV(cvText, userId) {
        console.log('Starting Intelligent CV Processing with Gemini...');
        console.log(`Processing ${cvText.length} characters for user: ${userId}`);
        
        // Clean the text first
        const cleanedText = TextCleaner.prepareForAI(cvText);
        console.log(`Text cleaned: ${cleanedText.length} characters`);
        
        // Create processing session
        const sessionId = await this.sessionService.createSession(
            userId,
            cleanedText.substring(0, 500),
            { 
                cv_length: cleanedText.length,
                processing_start: new Date().toISOString(),
                processor_version: '2.0_intelligent_gemini'
            }
        );
        
        console.log(`Created processing session: ${sessionId}`);
        
        try {
            // Multi-step processing with memory
            const result = await this.processWithMemory(cleanedText, sessionId);
            
            console.log(`CV processing completed for: ${result.personalInfo?.name}`);
            return result;
            
        } catch (error) {
            console.error(`CV processing failed for session ${sessionId}:`, error);
            throw error;
            
        } finally {
            // Clean up session after a delay
            setTimeout(async () => {
                await this.sessionService.cleanupSession(sessionId);
            }, 5000);
        }
    }

    /**
     * Multi-step processing with session memory
     */
    async processWithMemory(cvText, sessionId) {
        console.log('Multi-step processing with memory...');
        
        // STEP 1: Extract Basic Information
        console.log('Step 1: Extracting basic personal information...');
        const basicInfo = await this.extractBasicInfo(cvText);
        await this.sessionService.storeStepResult(
            sessionId, 
            'basic_info', 
            basicInfo, 
            this.calculateConfidence(basicInfo),
            { step: 1, method: 'gemini_structured' }
        );
        console.log(`Basic info extracted: ${basicInfo.name} (${basicInfo.currentTitle})`);
        
        // STEP 2: Extract Professional Data (with context from Step 1)
        console.log('Step 2: Extracting professional experience with context...');
        const context1 = await this.sessionService.getSessionContext(sessionId);
        const professionalData = await this.extractProfessional(cvText, context1);
        await this.sessionService.storeStepResult(
            sessionId, 
            'professional', 
            professionalData, 
            this.calculateConfidence(professionalData),
            { step: 2, method: 'gemini_context_aware' }
        );
        console.log(`Professional data: ${professionalData.experience?.length || 0} jobs, ${professionalData.skills?.technical?.length || 0} skills`);
        
        // STEP 3: Extract Additional Information (with context from Steps 1+2)
        console.log('Step 3: Extracting additional details with full context...');
        const context2 = await this.sessionService.getSessionContext(sessionId);
        const additionalData = await this.extractAdditional(cvText, context2);
        await this.sessionService.storeStepResult(
            sessionId, 
            'additional', 
            additionalData, 
            this.calculateConfidence(additionalData),
            { step: 3, method: 'gemini_enhanced' }
        );
        console.log(`Additional data: ${additionalData.projects?.length || 0} projects, ${additionalData.certifications?.length || 0} certs`);
        
        // STEP 4: Get final assembled result
        console.log('Step 4: Assembling final result...');
        const finalResult = await this.sessionService.getFinalResult(sessionId);
        
        // Add processing metadata
        finalResult.processingMetadata = {
            intelligentProcessor: true,
            sessionMemoryUsed: true,
            llmProvider: 'gemini',
            totalSteps: 3,
            processingTime: new Date().toISOString()
        };
        
        return finalResult;
    }

    /**
     * Retry logic for API calls with exponential backoff
     */
    async retryWithBackoff(operation, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Check if it's a retryable error (503, 429, network issues)
                const isRetryable = error.message.includes('503') || 
                                  error.message.includes('429') || 
                                  error.message.includes('overloaded') ||
                                  error.message.includes('network') ||
                                  error.message.includes('timeout') ||
                                  error.message.includes('fetch failed') ||
                                  error.message.includes('ENOTFOUND') ||
                                  error.code === 'ENOTFOUND';
                
                if (!isRetryable) {
                    throw error;
                }
                
                // Exponential backoff: 2s, 4s, 8s
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * STEP 1: Extract basic personal information using Gemini
     */
    async extractBasicInfo(cvText) {
        const prompt = `
You are an expert CV analyzer. Extract basic personal information from this CV.

EXTRACT ONLY:
- Full name
- Email address  
- Phone number
- Location (city, state/country)
- Current job title
- Professional summary (2-3 sentences)
- About me paragraph (3-4 sentences expanding on the summary)

CV TEXT:
${cvText.substring(0, 3000)}

IMPORTANT RULES:
- Return valid JSON only
- Use exact values from CV, don't make up information
- If information is missing, use empty string
- Keep summary concise and professional

REQUIRED JSON FORMAT:
{
  "name": "Full Name",
  "email": "email@domain.com", 
  "phone": "phone number",
  "location": "City, State",
  "currentTitle": "Job Title",
  "summary": "Professional summary from CV (2-3 sentences)",
  "aboutMe": "Detailed about me paragraph (3-4 sentences expanding on summary)"
}
        `;

        try {
            const result = await this.retryWithBackoff(async () => {
                return await this.model.generateContent(prompt);
            });
            const response = result.response;
            const text = response.text();
            
            // Extract and parse JSON from response
            const parsed = this.parseAIJsonResponse(text);
            
            if (!parsed.name || parsed.name.trim().length === 0) {
                throw new Error('Name extraction failed');
            }
            
            return {
                name: this.cleanValue(parsed.name),
                email: this.cleanValue(parsed.email),
                phone: this.cleanValue(parsed.phone),
                location: this.cleanValue(parsed.location),
                currentTitle: this.cleanValue(parsed.currentTitle),
                summary: this.cleanValue(parsed.summary),
                aboutMe: this.cleanValue(parsed.aboutMe)
            };
            
        } catch (error) {
            console.error('Basic info extraction failed:', error);
            
            // If Gemini is completely unavailable or network issue, try to extract basic info using simple text parsing
            if (error.message.includes('503') || 
                error.message.includes('overloaded') ||
                error.message.includes('fetch failed') ||
                error.message.includes('ENOTFOUND') ||
                error.message.includes('network') ||
                error.code === 'ENOTFOUND') {
                console.log('Gemini/network unavailable, attempting fallback extraction...');
                return this.extractBasicInfoFallback(cvText);
            }
            
            throw new Error('Failed to extract basic information: ' + error.message);
        }
    }

    /**
     * STEP 2: Extract professional experience with context
     */
    async extractProfessional(cvText, context) {
        const knownFacts = context.knownFacts;
        
        const prompt = `
You are analyzing a CV for ${knownFacts.name || 'a candidate'}, who works as ${knownFacts.currentTitle || 'a professional'} in ${knownFacts.profession || 'their field'}.

CONTEXT FROM PREVIOUS ANALYSIS:
- Person: ${knownFacts.name || 'Unknown'}
- Current Title: ${knownFacts.currentTitle || 'Professional'}
- Profession: ${knownFacts.profession || 'General'}

EXTRACT FROM THIS CV:
1. Work Experience (jobs, companies, dates, descriptions, achievements)
2. Technical Skills (programming, tools, technologies)
3. Soft Skills (leadership, communication, etc.)
4. Education (degree abbreviations with field like "BA in [Field]", institutions, graduation years)

CV TEXT:
${cvText}

IMPORTANT RULES:
- DON'T re-extract name, email, phone - we already have that
- Focus on work history, skills, and education
- If you see degree abbreviations (BA, BS, MA, etc.), keep the abbreviation and find the field of study to create "BA in [Field]" format
- Look for the field of study mentioned in the education section or infer from coursework/major
- Use known context to improve accuracy
- Return valid JSON only

REQUIRED JSON FORMAT:
{
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name", 
      "location": "City, State",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or Present",
      "description": "Main responsibilities",
      "achievements": ["Achievement 1", "Achievement 2"],
      "technologies": ["Tech1", "Tech2"]
    }
  ],
  "skills": {
    "technical": ["Skill1", "Skill2"],
    "soft": ["Skill1", "Skill2"],
    "languages": ["Language1", "Language2"]
  },
  "education": [
    {
      "degree": "Keep abbreviation and add field (e.g., 'BA in Computer Science', 'BS in Engineering')",
      "field": "Field of Study",
      "institution": "Institution Name",
      "location": "City, State", 
      "graduationYear": "YYYY",
      "gpa": "3.5 (if mentioned)",
      "honors": "Magna Cum Laude (if applicable)"
    }
  ]
}
        `;

        try {
            const result = await this.retryWithBackoff(async () => {
                return await this.model.generateContent(prompt);
            });
            const response = result.response;
            const text = response.text();
            
            const parsed = this.parseAIJsonResponse(text);
            
            return {
                experience: Array.isArray(parsed.experience) ? parsed.experience : [],
                skills: parsed.skills || { technical: [], soft: [], languages: [] },
                education: Array.isArray(parsed.education) ? parsed.education : []
            };
            
        } catch (error) {
            console.error('Professional data extraction failed:', error);
            
            // If Gemini is unavailable or network issue, use fallback
            if (error.message.includes('503') || 
                error.message.includes('overloaded') ||
                error.message.includes('fetch failed') ||
                error.message.includes('ENOTFOUND') ||
                error.message.includes('network') ||
                error.code === 'ENOTFOUND') {
                console.log('Gemini/network unavailable, using professional data fallback...');
                return this.extractProfessionalFallback(cvText);
            }
            
            throw new Error('Failed to extract professional data: ' + error.message);
        }
    }

    /**
     * STEP 3: Extract additional information with full context
     */
    async extractAdditional(cvText, context) {
        const knownFacts = context.knownFacts;
        
        const prompt = `
You are completing the CV analysis for ${knownFacts.name || 'a candidate'}, a ${knownFacts.experienceLevel || 'experienced'} ${knownFacts.profession || 'professional'}.

KNOWN INFORMATION:
- Name: ${knownFacts.name || 'Unknown'}
- Profession: ${knownFacts.profession || 'Professional'}
- Experience Level: ${knownFacts.experienceLevel || 'Experienced'}
- We already extracted: basic info, work experience, skills, education

EXTRACT REMAINING INFORMATION:
1. Projects (personal, professional, academic projects)
2. Certifications (professional certifications, licenses)
3. Awards & Achievements (beyond work achievements)
4. Publications (if any)
5. Volunteer Work (if mentioned)

CV TEXT:
${cvText}

IMPORTANT RULES:
- DON'T repeat information we already extracted
- Focus on projects, certifications, awards, publications
- If no relevant information found, return empty arrays
- Return valid JSON only

REQUIRED JSON FORMAT:
{
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["Tech1", "Tech2"],
      "role": "Your role",
      "year": "YYYY",
      "link": "URL (if available)"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "year": "YYYY",
      "expirationYear": "YYYY (if applicable)",
      "credentialId": "ID (if mentioned)"
    }
  ],
  "awards": [
    {
      "name": "Award Name",
      "issuer": "Organization",
      "year": "YYYY",
      "description": "Brief description"
    }
  ],
  "publications": [
    {
      "title": "Publication Title",
      "journal": "Journal/Conference",
      "year": "YYYY",
      "authors": ["Author1", "Author2"]
    }
  ],
  "volunteer": [
    {
      "organization": "Organization",
      "role": "Volunteer Role",
      "duration": "Time period",
      "description": "What you did"
    }
  ]
}
        `;

        try {
            const result = await this.retryWithBackoff(async () => {
                return await this.model.generateContent(prompt);
            });
            const response = result.response;
            const text = response.text();
            
            try {
                const parsed = this.parseAIJsonResponse(text);
                return {
                    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
                    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
                    awards: Array.isArray(parsed.awards) ? parsed.awards : [],
                    publications: Array.isArray(parsed.publications) ? parsed.publications : [],
                    volunteer: Array.isArray(parsed.volunteer) ? parsed.volunteer : []
                };
            } catch (parseError) {
                console.log('No valid JSON found, returning empty structure');
                return {
                    projects: [],
                    certifications: [],
                    awards: [],
                    publications: [],
                    volunteer: []
                };
            }
            
        } catch (error) {
            console.error('Additional data extraction failed:', error);
            
            // Return empty structure for additional data (not critical)
            return {
                projects: [],
                certifications: [],
                awards: [],
                publications: [],
                volunteer: []
            };
        }
    }

    /**
     * Fallback extraction when Gemini is unavailable - uses simple regex patterns
     */
    extractBasicInfoFallback(cvText) {
        console.log('Using fallback extraction for basic information...');
        
        const text = cvText.toLowerCase();
        const originalText = cvText;
        
        // Extract email using regex
        const emailMatch = originalText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        const email = emailMatch ? emailMatch[0] : '';
        
        // Extract phone using regex
        const phoneMatch = originalText.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
        const phone = phoneMatch ? phoneMatch[0] : '';
        
        // Extract name (usually appears early in the document)
        const lines = originalText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let name = '';
        
        // Look for name in first few lines (avoid emails/phones)
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (!line.includes('@') && !line.match(/\d{3}/) && line.length > 5 && line.length < 50) {
                // Simple heuristic: line with 2-4 words, proper case
                const words = line.split(' ').filter(w => w.length > 1);
                if (words.length >= 2 && words.length <= 4) {
                    name = line;
                    break;
                }
            }
        }
        
        if (!name) {
            name = 'CV Candidate'; // Default fallback
        }
        
        return {
            name: name,
            email: email,
            phone: phone,
            location: '',
            currentTitle: 'Professional',
            summary: 'CV processing completed using fallback extraction due to service unavailability.',
            aboutMe: 'This CV was processed using a fallback system. Please try again later for enhanced AI processing.'
        };
    }

    /**
     * Fallback for professional data extraction
     */
    extractProfessionalFallback(cvText) {
        console.log('Using fallback extraction for professional data...');
        
        return {
            experience: [{
                title: 'Professional Experience',
                company: 'See CV Document',
                location: '',
                startDate: '',
                endDate: 'Present',
                description: 'Experience details extracted from uploaded CV. Please try again later for detailed AI processing.',
                achievements: [],
                technologies: []
            }],
            skills: {
                technical: ['Professional Skills'],
                soft: ['Communication', 'Problem Solving'],
                languages: ['English']
            },
            education: [{
                degree: 'Education',
                field: 'See CV Document',
                institution: 'Educational Institution',
                location: '',
                graduationYear: '',
                gpa: '',
                honors: ''
            }]
        };
    }

    /**
     * Calculate confidence score for extracted data
     */
    calculateConfidence(data) {
        if (!data || Object.keys(data).length === 0) return 0.1;
        
        let score = 0.5; // Base score
        
        // Increase confidence based on data completeness
        Object.values(data).forEach(value => {
            if (value && value !== '') {
                if (typeof value === 'string' && value.length > 5) score += 0.1;
                if (Array.isArray(value) && value.length > 0) score += 0.1;
                if (typeof value === 'object' && Object.keys(value).length > 0) score += 0.1;
            }
        });
        
        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Sanitize JSON string from AI response to fix common issues
     */
    sanitizeJsonString(jsonString) {
        try {
            // First, try to fix common escape sequence issues
            let cleaned = jsonString
                // Fix various types of malformed escape sequences
                .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '') // Remove invalid escape sequences
                .replace(/\\\\/g, '\\')  // Fix double-escaped backslashes
                .replace(/\\"/g, '"')    // Fix escaped quotes
                .replace(/\\'/g, "'")    // Fix escaped single quotes
                .replace(/\\n/g, '\n')   // Fix newlines
                .replace(/\\r/g, '\r')   // Fix carriage returns
                .replace(/\\t/g, '\t')   // Fix tabs
                .replace(/\\b/g, '\b')   // Fix backspace
                .replace(/\\f/g, '\f')   // Fix form feed
                .replace(/[\x00-\x1F\x7F]/g, ' ') // Replace control characters with spaces
                .replace(/\n\s*\n/g, '\n') // Remove empty lines
                .trim();
            
            // Try to fix common JSON structure issues
            cleaned = cleaned
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys
                .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
                .replace(/:\s*`([^`]*)`/g, ': "$1"'); // Replace backticks with double quotes
            
            return cleaned;
        } catch (error) {
            console.error('Error in sanitizeJsonString:', error);
            // Fallback: just remove all backslashes and quotes issues
            return jsonString
                .replace(/\\/g, '')
                .replace(/[\x00-\x1F\x7F]/g, ' ')
                .trim();
        }
    }

    /**
     * Parse JSON with error handling and sanitization
     */
    parseAIJsonResponse(text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        
        let jsonString = jsonMatch[0];
        
        // Try multiple parsing strategies
        const strategies = [
            // Strategy 1: Parse as-is
            () => JSON.parse(jsonString),
            
            // Strategy 2: Basic sanitization
            () => JSON.parse(this.sanitizeJsonString(jsonString)),
            
            // Strategy 3: Aggressive cleaning - remove all escape sequences
            () => {
                const aggressive = jsonString
                    .replace(/\\./g, ' ') // Remove all escape sequences
                    .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control chars
                    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                    .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Quote keys
                return JSON.parse(aggressive);
            },
            
            // Strategy 4: Try to extract and rebuild JSON manually
            () => {
                const lines = jsonString.split('\n');
                const cleanedLines = lines.map(line => {
                    // Remove problematic characters and try to clean each line
                    return line
                        .replace(/\\[^"\\\/bfnrt]/g, '') // Remove invalid escapes
                        .replace(/[\x00-\x1F\x7F]/g, ' ') // Control chars
                        .trim();
                }).filter(line => line.length > 0);
                
                return JSON.parse(cleanedLines.join('\n'));
            }
        ];
        
        for (let i = 0; i < strategies.length; i++) {
            try {
                const result = strategies[i]();
                if (i > 0) {
                    console.log(`JSON parsing succeeded with strategy ${i + 1}`);
                }
                return result;
            } catch (error) {
                console.log(`JSON parsing strategy ${i + 1} failed:`, error.message);
                
                if (i === strategies.length - 1) {
                    // Last strategy failed, log debug info
                    console.error('All JSON parsing strategies failed');
                    console.error('Original JSON (first 1000 chars):', jsonString.substring(0, 1000));
                    console.error('Error at position:', error.message.match(/position (\d+)/)?.[1]);
                    
                    // Try to show the problematic area
                    const position = parseInt(error.message.match(/position (\d+)/)?.[1] || '0');
                    if (position > 0) {
                        const start = Math.max(0, position - 50);
                        const end = Math.min(jsonString.length, position + 50);
                        console.error('Problematic area:', jsonString.substring(start, end));
                    }
                    
                    throw new Error(`JSON parsing failed with all strategies: ${error.message}`);
                }
            }
        }
    }

    /**
     * Clean extracted values
     */
    cleanValue(value) {
        if (!value || typeof value !== 'string') return '';
        
        return value
            .trim()
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    /**
     * Test Gemini connection
     */
    async testConnection() {
        try {
            const result = await this.retryWithBackoff(async () => {
                return await this.model.generateContent("Say 'Hello from IntelligentCVProcessorGemini'");
            });
            const response = result.response;
            const text = response.text();
            
            console.log('✅ Gemini Connection Test:', text);
            return true;
            
        } catch (error) {
            console.error('❌ Gemini Connection Test Failed:', error);
            return false;
        }
    }

    /**
     * Legacy compatibility method
     */
    async structureWithGemini(extractedText) {
        console.warn('structureWithGemini is deprecated. Use processCV instead.');
        return await this.processCV(extractedText, 'legacy-user');
    }
}

module.exports = IntelligentCVProcessorGemini;