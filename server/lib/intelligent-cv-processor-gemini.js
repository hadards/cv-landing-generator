// File: server/lib/intelligent-cv-processor-gemini-v3.js
// Intelligent CV Processor with Gemini - Single-Pass Extraction (V3.0)
// Complete rewrite for token efficiency and profession-agnostic extraction

const { GoogleGenerativeAI } = require('@google/generative-ai');
const IntelligentCVProcessorBase = require('./intelligent-cv-processor-base');
const { trackApiUsage, checkApiLimits } = require('../database/services');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const TextCleaner = require('./utils/text-cleaner');
const CVSessionService = require('./services/cv-session-service');

class IntelligentCVProcessorGemini extends IntelligentCVProcessorBase {
    constructor(config = {}) {
        super();

        console.log('Initializing Intelligent CV Processor with Gemini (V3.0 - Single-Pass)...');

        // Initialize Gemini client
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.sessionService = new CVSessionService();

        // Define model fallback chain
        this.modelChain = [
            'models/gemini-2.5-flash',
            'gemini-1.0-pro-latest'
        ];

        // Use configured model or start with the first in chain
        this.currentModelName = config.model || this.modelChain[0];
        this.initializeModel(this.currentModelName);

        console.log(`LLM Client: Gemini initialized with ${this.currentModelName}`);
        console.log('Processing Mode: Single-Pass Extraction');
    }

    /**
     * Initialize the Gemini model instance
     */
    initializeModel(modelName) {
        console.log(`Configuring Gemini model: ${modelName}`);
        this.model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent extraction
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
                responseMimeType: "application/json" // Force JSON output
            }
        });
        this.currentModelName = modelName;
    }

    /**
     * Execute prompt with automatic model fallback for 404/Not Found errors
     */
    async generateContentSafe(prompt) {
        try {
            return await this.retryWithBackoff(async () => {
                return await this.model.generateContent(prompt);
            });
        } catch (error) {
            // Check if error is related to model availability (404 Not Found)
            const isModelError = error.message.includes('404') ||
                               error.message.includes('not found') ||
                               error.message.includes('not supported');

            if (isModelError) {
                console.warn(`Model ${this.currentModelName} failed: ${error.message}`);

                // Try to find next model in chain
                const currentIndex = this.modelChain.indexOf(this.currentModelName);
                if (currentIndex !== -1 && currentIndex < this.modelChain.length - 1) {
                    const nextModel = this.modelChain[currentIndex + 1];
                    console.log(`🔄 Switching fallback model: ${this.currentModelName} -> ${nextModel}`);

                    this.initializeModel(nextModel);
                    return this.generateContentSafe(prompt);
                }
            }

            throw error;
        }
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

                const delay = Math.pow(2, attempt) * 1000;
                console.log(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Get processor name for metadata
     */
    getProcessorName() {
        return `gemini-intelligent-v3-${this.currentModelName}`;
    }

    /**
     * Extract text from uploaded file
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
     */
    async extractFromPDF(filePath) {
        console.log('Extracting from PDF...');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    }

    /**
     * Extract text from Word document
     */
    async extractFromWord(filePath) {
        console.log('Extracting from Word document...');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    /**
     * Main CV processing method - Single-pass extraction
     */
    async processCV(cvText, userId) {
        console.log('Starting Single-Pass CV Processing with Gemini V3.0...');
        console.log(`Processing ${cvText.length} characters for user: ${userId}`);

        // Check API limits
        try {
            const limitCheck = await checkApiLimits(userId, 'gemini');
            if (!limitCheck.allowed) {
                throw new Error(`API limit exceeded: ${limitCheck.reason}. Resets: ${limitCheck.resetTime}`);
            }
            console.log(`API usage check passed. Remaining: ${limitCheck.remaining} requests`);
        } catch (error) {
            console.warn('API limit check failed, proceeding with caution:', error.message);
        }

        // Clean the text
        const cleanedText = TextCleaner.prepareForAI(cvText);
        console.log(`Text cleaned: ${cleanedText.length} characters`);

        // Create simple tracking session (optional)
        const sessionId = await this.sessionService.createSession(
            userId,
            cleanedText.substring(0, 500),
            {
                cv_length: cleanedText.length,
                processing_start: new Date().toISOString(),
                processor_version: `3.0_single_pass_${this.currentModelName}`
            }
        );

        console.log(`Created processing session: ${sessionId}`);

        try {
            // Single-pass comprehensive extraction
            console.log('Executing single-pass extraction (1 API call)...');
            const result = await this.extractAllData(cleanedText);

            // Track API usage (1 call instead of 3)
            try {
                await trackApiUsage(userId, 'gemini', 1, cleanedText.length);
                console.log('API usage tracked: 1 call');
            } catch (trackError) {
                console.warn('Failed to track API usage:', trackError.message);
            }

            // Add processing metadata
            result.processingMetadata = {
                intelligentProcessor: true,
                llmProvider: 'gemini',
                modelUsed: this.currentModelName,
                processingVersion: '3.0-single-pass',
                processingTime: new Date().toISOString(),
                sessionId: sessionId
            };

            console.log(`CV processing completed for: ${result.personalInfo?.name}`);
            return result;

        } catch (error) {
            console.error(`CV processing failed for session ${sessionId}:`, error);
            throw error;

        } finally {
            // Clean up session
            setTimeout(async () => {
                await this.sessionService.cleanupSession(sessionId);
            }, 5000);
        }
    }

    /**
     * Build comprehensive single-pass extraction prompt
     */
    buildComprehensivePrompt(cvText) {
        return `
You are an expert CV/resume analyzer. Extract ALL information from this CV into structured JSON.

=== CRITICAL INSTRUCTIONS ===

1. READ THE ENTIRE DOCUMENT
   - Don't stop after first section
   - Check headers, footers, sidebars for contact info
   - Look for information in ALL parts of the document

2. IDENTIFY THE PROFESSION
   - Determine their field/industry from job titles and experience
   - Could be ANY profession: software, teaching, culinary, legal, healthcare, sales, trades, etc.
   - Don't limit to predefined categories

3. EXTRACT EVERYTHING RELEVANT TO THEIR DOMAIN
   - Skills = whatever expertise matters in THEIR field
   - Tools/technologies = whatever they use in THEIR work
   - Achievements = metrics and results that matter in THEIR industry

4. BE THOROUGH
   - Capture ALL work experience entries
   - Extract ALL skills mentioned anywhere (job descriptions, summaries, skill sections)
   - Get ALL education entries
   - Find ALL certifications, projects, achievements
   - If you see a bullet point, extract it
   - If you see a date or metric, include it

5. HANDLE MISSING DATA
   - If information isn't present, use empty string "" or empty array []
   - Don't make up information
   - Don't skip fields - include them even if empty

6. DATE FORMATS
   - Extract dates as written: "2020-01", "2020", "Jan 2020", etc.
   - Use "Present" for current positions
   - Don't normalize or convert formats

=== JSON STRUCTURE ===

{
  "personalInfo": {
    "name": "Full name from CV",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State/Country",
    "summary": "Professional summary (2-3 sentences from CV or synthesize from experience)",
    "aboutMe": "Detailed paragraph (3-4 sentences, expand on summary or extract from About Me section)"
  },
  "experience": [
    {
      "title": "Job title/position",
      "company": "Company or organization name",
      "location": "City, State",
      "startDate": "Start date (YYYY-MM or YYYY or as written)",
      "endDate": "End date or Present",
      "description": "Brief description of role and responsibilities",
      "achievements": [
        "Specific achievement with metrics if available",
        "Another achievement or responsibility"
      ]
    }
  ],
  "skills": {
    "technical": [
      "Domain-specific professional skills",
      "For developers: programming languages, frameworks",
      "For chefs: cooking techniques, cuisines, knife skills",
      "For teachers: pedagogical methods, curriculum development",
      "For lawyers: legal research, case analysis, practice areas",
      "Extract whatever is relevant to THIS person's profession"
    ],
    "soft": [
      "Leadership",
      "Communication",
      "Team collaboration",
      "Problem solving",
      "Other interpersonal/transferable skills"
    ],
    "languages": [
      "English (Native)",
      "Spanish (Fluent)",
      "Any spoken/written languages with proficiency level if mentioned"
    ]
  },
  "education": [
    {
      "degree": "Degree name with field (e.g., BS in Computer Science, JD, Culinary Arts Diploma)",
      "institution": "School/university name",
      "location": "City, State",
      "graduationDate": "YYYY or YYYY-MM",
      "gpa": "GPA if mentioned (e.g., 3.8 or 3.8/4.0)",
      "achievements": [
        "Dean's List",
        "Magna Cum Laude",
        "Relevant honors or achievements"
      ]
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "What the project was about",
      "technologies": [
        "Tools, methods, or technologies used",
        "For developers: React, Node.js",
        "For chefs: French techniques, molecular gastronomy",
        "For teachers: project-based learning, Bloom's taxonomy"
      ],
      "url": "Project link if available, otherwise empty string"
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "date": "YYYY or YYYY-MM when obtained",
      "url": "Credential URL or verification link if available"
    }
  ]
}

=== EXAMPLES OF PROFESSION-SPECIFIC EXTRACTION ===

Software Developer:
- technical skills: ["JavaScript", "React", "Node.js", "AWS"]
- technologies in projects: ["Docker", "PostgreSQL", "CI/CD"]

Chef:
- technical skills: ["French cuisine", "Pastry", "Knife skills", "Menu development"]
- technologies in projects: ["Sous vide", "Molecular gastronomy", "Farm-to-table"]

Teacher:
- technical skills: ["Curriculum design", "Differentiated instruction", "Assessment strategies"]
- technologies in projects: ["Google Classroom", "Project-based learning", "STEAM integration"]

Lawyer:
- technical skills: ["Contract law", "Legal research", "Case analysis", "Litigation"]
- technologies in projects: ["Westlaw", "LexisNexis", "Case management software"]

=== CV TEXT TO ANALYZE ===

${cvText}

=== FINAL REMINDERS ===
- Extract EVERYTHING you find
- Read the FULL document
- Return ONLY valid JSON
- Don't skip any sections
- Include all bullet points and achievements
- If unsure about a field, include the data anyway

Return the complete JSON now:
`;
    }

    /**
     * Single-pass comprehensive data extraction
     */
    async extractAllData(cvText) {
        const prompt = this.buildComprehensivePrompt(cvText);

        try {
            const result = await this.generateContentSafe(prompt);
            const response = result.response;
            const text = response.text();

            const parsed = this.parseAIJsonResponse(text);
            return this.normalizeExtractedData(parsed);

        } catch (error) {
            console.error('Single-pass extraction failed:', error);
            throw new Error('Failed to extract CV data: ' + error.message);
        }
    }

    /**
     * Normalize extracted data to match schema
     */
    normalizeExtractedData(data) {
        // Extract current title from first experience entry
        const currentTitle = data.experience && data.experience.length > 0
            ? data.experience[0].title
            : 'Professional';

        return {
            personalInfo: {
                name: this.cleanValue(data.personalInfo?.name) || '',
                email: this.cleanValue(data.personalInfo?.email) || '',
                phone: this.cleanValue(data.personalInfo?.phone) || '',
                location: this.cleanValue(data.personalInfo?.location) || '',
                currentTitle: currentTitle, // Required by template
                profilePicture: '', // Not extracted from CV text
                summary: this.cleanValue(data.personalInfo?.summary) || '',
                aboutMe: this.cleanValue(data.personalInfo?.aboutMe) || ''
            },
            experience: Array.isArray(data.experience) ? data.experience : [],
            education: Array.isArray(data.education) ? data.education : [],
            skills: {
                technical: Array.isArray(data.skills?.technical) ? data.skills.technical : [],
                soft: Array.isArray(data.skills?.soft) ? data.skills.soft : [],
                languages: Array.isArray(data.skills?.languages) ? data.skills.languages : []
            },
            projects: Array.isArray(data.projects) ? data.projects : [],
            certifications: Array.isArray(data.certifications) ? data.certifications : []
        };
    }

    /**
     * Parse JSON with error handling and sanitization
     */
    parseAIJsonResponse(text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const jsonString = jsonMatch[0];

        // Try to parse as-is first
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            // If that fails, try with sanitization
            console.log('JSON parsing failed, attempting sanitization...');
            const sanitized = jsonString
                .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '')
                .replace(/,(\s*[}\]])/g, '$1')
                .replace(/[\x00-\x1F\x7F]/g, ' ');

            try {
                return JSON.parse(sanitized);
            } catch (error2) {
                console.error('JSON parsing failed after sanitization');
                console.error('First 500 chars:', jsonString.substring(0, 500));
                throw new Error(`JSON parsing failed: ${error2.message}`);
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
            .replace(/^["']|["']$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Test Gemini connection
     */
    async testConnection() {
        try {
            const result = await this.generateContentSafe("Say 'Hello from IntelligentCVProcessorGemini V3.0'");
            const response = result.response;
            const text = response.text();

            console.log('Gemini Connection Test:', text);
            return true;

        } catch (error) {
            console.error('Gemini Connection Test Failed:', error);
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
