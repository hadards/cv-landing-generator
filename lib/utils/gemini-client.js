// File: lib/utils/gemini-client.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const LLMClientBase = require('./llm-client-base');

class GeminiClient extends LLMClientBase {
    constructor(config = {}) {
        super(config);
        
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ 
            model: config.model || "gemini-1.5-flash" 
        });
        
        console.log('Gemini client initialized');
    }

    async _sendRequest(prompt, options = {}) {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            // Map Gemini-specific errors to common error types
            if (error.message.includes('API_KEY_INVALID')) {
                throw new Error('API_KEY_INVALID');
            } else if (error.message.includes('QUOTA_EXCEEDED')) {
                throw new Error('QUOTA_EXCEEDED');
            } else {
                throw error;
            }
        }
    }

    async _validateConnection() {
        const response = await this.generateSimpleText(
            'Say hello in one word.',
            'Connection test'
        );
        
        if (!response || response.length === 0) {
            throw new Error('Empty response from Gemini');
        }
        
        return response;
    }
}

module.exports = GeminiClient;