// Intelligent CV Processor with Ollama + Session Memory
// Extends base processor with Ollama-specific implementations

const OllamaClient = require('./utils/ollama-client');
const IntelligentCVProcessorBase = require('./intelligent-cv-processor-base');

class IntelligentCVProcessorOllama extends IntelligentCVProcessorBase {
    constructor(config = {}) {
        super(); // Call parent constructor
        
        // Initialize Ollama client
        this.ollamaClient = new OllamaClient({
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            model: config.model || process.env.OLLAMA_MODEL || 'llama3.2',
            temperature: 0.1, // Low temperature for consistent extraction
            timeout: 60000 // 60 second timeout
        });
    }

    /**
     * Get processor name for metadata
     */
    getProcessorName() {
        return 'ollama-intelligent';
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
            console.log('Ollama connection successful');
            return response;
        } catch (error) {
            console.error('Ollama connection failed:', error.message);
            throw error;
        }
    }

}

module.exports = IntelligentCVProcessorOllama;