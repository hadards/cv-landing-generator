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
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            
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
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            return {
                experience: Array.isArray(parsed.experience) ? parsed.experience : [],
                skills: parsed.skills || { technical: [], soft: [], languages: [] },
                education: Array.isArray(parsed.education) ? parsed.education : []
            };
            
        } catch (error) {
            console.error('Professional data extraction failed:', error);
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
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.log('No JSON found, returning empty structure');
                return {
                    projects: [],
                    certifications: [],
                    awards: [],
                    publications: [],
                    volunteer: []
                };
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            return {
                projects: Array.isArray(parsed.projects) ? parsed.projects : [],
                certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
                awards: Array.isArray(parsed.awards) ? parsed.awards : [],
                publications: Array.isArray(parsed.publications) ? parsed.publications : [],
                volunteer: Array.isArray(parsed.volunteer) ? parsed.volunteer : []
            };
            
        } catch (error) {
            console.error('Additional data extraction failed:', error);
            
            // Return empty structure if parsing fails
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
            const result = await this.model.generateContent("Say 'Hello from IntelligentCVProcessorGemini'");
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