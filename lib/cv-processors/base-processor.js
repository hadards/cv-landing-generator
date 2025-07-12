// File: lib/cv-processors/base-processor.js
const LLMClientFactory = require('../utils/llm-client-factory');
const TextCleaner = require('../utils/text-cleaner');

class BaseProcessor {
    constructor(llmConfig = {}) {
        // Create LLM client based on configuration
        this.llmClient = LLMClientFactory.createClient(llmConfig);
        this.processorName = this.constructor.name;
        
        console.log(`${this.processorName} initialized with ${this.llmClient.clientName}`);
    }

    async process(cvText, existingData = {}) {
        try {
            console.log(`\nStarting ${this.processorName}...`);
            
            // Clean the text for processing
            const cleanedText = TextCleaner.prepareForAI(cvText);
            
            // Process the text (implemented by subclasses)
            const result = await this.processText(cleanedText, existingData);
            
            console.log(`${this.processorName} completed successfully`);
            return result;
            
        } catch (error) {
            console.warn(`${this.processorName} failed: ${error.message}`);
            
            try {
                // Try to get fallback data
                const fallback = await this.getFallbackData(existingData);
                console.log(`Using fallback data for ${this.processorName}`);
                return fallback;
            } catch (fallbackError) {
                console.warn(`Fallback also failed for ${this.processorName}: ${fallbackError.message}`);
                
                // Return empty data structure appropriate for each processor
                const emptyResult = this.getEmptyResult();
                console.log(`Returning empty result for ${this.processorName} - section will be hidden`);
                return emptyResult;
            }
        }
    }

    // Default empty result - can be overridden by subclasses
    getEmptyResult() {
        const processorType = this.constructor.name.toLowerCase();
        
        if (processorType.includes('personalinfo')) {
            return {
                personalInfo: {
                    name: '',
                    email: '',
                    phone: '',
                    location: '',
                    currentTitle: 'Professional'
                }
            };
        } else if (processorType.includes('aboutme')) {
            return {
                aboutData: {
                    summary: '',
                    aboutMe: ''
                }
            };
        } else if (processorType.includes('experience')) {
            return { experience: [] };
        } else if (processorType.includes('skills')) {
            return { 
                skills: { 
                    technical: [], 
                    soft: [], 
                    languages: [] 
                } 
            };
        } else if (processorType.includes('education')) {
            return { education: [] };
        } else if (processorType.includes('projects')) {
            return { projects: [] };
        } else if (processorType.includes('certifications')) {
            return { certifications: [] };
        } else {
            return {}; // Generic empty result
        }
    }

    // Abstract methods that must be implemented by subclasses
    async processText(cleanedText, existingData) {
        throw new Error(`processText method must be implemented by ${this.processorName}`);
    }

    async getFallbackData(existingData) {
        // Default implementation returns empty result
        console.log(`Using default empty result for ${this.processorName}`);
        return this.getEmptyResult();
    }

    // Utility method for simple AI text generation
    async generateSimpleText(prompt, description) {
        try {
            return await this.llmClient.generateSimpleText(prompt, 
                `${this.processorName} - ${description}`);
        } catch (error) {
            console.error(`AI generation failed for ${this.processorName}: ${error.message}`);
            throw error;
        }
    }

    // Utility method for extracting structured data
    async extractData(prompt, description) {
        try {
            return await this.llmClient.extractSimpleData(prompt, 
                `${this.processorName} - ${description}`);
        } catch (error) {
            console.error(`Data extraction failed for ${this.processorName}: ${error.message}`);
            throw error;
        }
    }

    // Utility method for JSON extraction
    async extractJSON(prompt, description) {
        try {
            return await this.llmClient.extractJSON(prompt, 
                `${this.processorName} - ${description}`);
        } catch (error) {
            console.error(`JSON extraction failed for ${this.processorName}: ${error.message}`);
            throw error;
        }
    }

    // Utility method to parse key-value responses
    parseKeyValueResponse(response) {
        const data = {};
        const lines = response.split('\n');
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=');
                const value = valueParts.join('=').trim();
                
                if (key && key.trim()) {
                    data[key.trim().toLowerCase()] = value || '';
                }
            }
        });
        
        return data;
    }

    // Utility method to validate required fields
    validateRequiredFields(data, requiredFields) {
        const missing = [];
        
        requiredFields.forEach(field => {
            if (!data[field] || data[field].trim() === '') {
                missing.push(field);
            }
        });
        
        if (missing.length > 0) {
            console.warn(`${this.processorName} - Missing required fields: ${missing.join(', ')}`);
        }
        
        return missing.length === 0;
    }

    // Utility method to clean extracted values
    cleanValue(value) {
        if (!value || typeof value !== 'string') {
            return '';
        }
        
        return value
            .trim()
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    // Utility method to log processing stats
    logStats(data, description) {
        const stats = {};
        
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (typeof value === 'string') {
                stats[key] = value ? `${value.length} chars` : 'empty';
            } else if (Array.isArray(value)) {
                stats[key] = `${value.length} items`;
            } else {
                stats[key] = typeof value;
            }
        });
        
        console.log(`${this.processorName} - ${description}:`, stats);
    }

    // Method to switch LLM client if needed
    switchLLMClient(newConfig) {
        console.log(`${this.processorName} - Switching LLM client...`);
        this.llmClient = LLMClientFactory.createClient(newConfig);
        console.log(`${this.processorName} - Now using ${this.llmClient.clientName}`);
    }

    // Method to test current LLM client
    async testLLMClient() {
        try {
            await this.llmClient.testConnection();
            console.log(`${this.processorName} - ${this.llmClient.clientName} is working correctly`);
            return true;
        } catch (error) {
            console.error(`${this.processorName} - ${this.llmClient.clientName} test failed:`, error.message);
            return false;
        }
    }
}

module.exports = BaseProcessor;