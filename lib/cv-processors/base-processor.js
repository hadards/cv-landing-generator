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
            console.error(`${this.processorName} failed:`, error.message);
            
            // Return fallback data
            const fallback = await this.getFallbackData(existingData);
            console.log(`Using fallback data for ${this.processorName}`);
            return fallback;
        }
    }

    // Abstract methods that must be implemented by subclasses
    async processText(cleanedText, existingData) {
        throw new Error(`processText method must be implemented by ${this.processorName}`);
    }

    async getFallbackData(existingData) {
        throw new Error(`getFallbackData method must be implemented by ${this.processorName}`);
    }

    // Utility method for simple AI text generation
    async generateSimpleText(prompt, description) {
        return await this.llmClient.generateSimpleText(prompt, 
            `${this.processorName} - ${description}`);
    }

    // Utility method for extracting structured data
    async extractData(prompt, description) {
        return await this.llmClient.extractSimpleData(prompt, 
            `${this.processorName} - ${description}`);
    }

    // Utility method for JSON extraction
    async extractJSON(prompt, description) {
        return await this.llmClient.extractJSON(prompt, 
            `${this.processorName} - ${description}`);
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