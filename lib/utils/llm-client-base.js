// File: lib/utils/llm-client-base.js
// Abstract base class for all LLM clients with common functionality

class LLMClientBase {
    constructor(config = {}) {
        this.config = {
            maxRetries: 3,
            timeout: 30000,
            retryDelay: 1000,
            ...config
        };
        this.clientName = this.constructor.name;
    }

    // Abstract methods that must be implemented by subclasses
    async _sendRequest(prompt, options = {}) {
        throw new Error(`_sendRequest must be implemented by ${this.clientName}`);
    }

    async _validateConnection() {
        throw new Error(`_validateConnection must be implemented by ${this.clientName}`);
    }

    // Common retry logic used by all clients
    async generateText(prompt, options = {}) {
        const {
            maxRetries = this.config.maxRetries,
            timeout = this.config.timeout,
            description = 'AI request'
        } = options;

        console.log(`${this.clientName} - ${description} - sending request...`);
        console.log(`Prompt length: ${prompt.length} characters`);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const startTime = Date.now();
                const text = await this._sendRequest(prompt, { ...options, timeout });
                const duration = Date.now() - startTime;

                console.log(`${this.clientName} - ${description} - received response (${text.length} chars) in ${duration}ms`);
                return text.trim();

            } catch (error) {
                console.error(`${this.clientName} - ${description} - attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw this._handleError(error, description);
                }
                
                // Wait before retry (exponential backoff)
                await this._delay(this.config.retryDelay * attempt);
            }
        }
    }

    // Common text generation with consistent formatting
    async generateSimpleText(prompt, description = 'Text generation') {
        const enhancedPrompt = this._formatSimpleTextPrompt(prompt);
        return await this.generateText(enhancedPrompt, { description });
    }

    // Common data extraction with consistent formatting
    async extractSimpleData(prompt, description = 'Data extraction') {
        const enhancedPrompt = this._formatDataExtractionPrompt(prompt);
        return await this.generateText(enhancedPrompt, { description });
    }

    // Common JSON extraction with error handling
    async extractJSON(prompt, description = 'JSON extraction') {
        const enhancedPrompt = this._formatJSONPrompt(prompt);
        const response = await this.generateText(enhancedPrompt, { description });
        
        try {
            return this._parseJSONResponse(response);
        } catch (error) {
            console.error(`${this.clientName} - JSON parsing failed:`, error.message);
            throw new Error(`Failed to parse JSON from ${this.clientName}: ${error.message}`);
        }
    }

    // Test connection with standard test
    async testConnection() {
        try {
            console.log(`Testing ${this.clientName} connection...`);
            const result = await this._validateConnection();
            console.log(`${this.clientName} connection test successful`);
            return result;
        } catch (error) {
            console.error(`${this.clientName} connection test failed:`, error.message);
            throw error;
        }
    }

    // Protected helper methods
    _formatSimpleTextPrompt(prompt) {
        return `${prompt}

IMPORTANT RULES:
- Return ONLY the requested text
- No markdown formatting
- No explanations or extra text
- No quotes around the response
- Keep response concise and professional
`;
    }

    _formatDataExtractionPrompt(prompt) {
        return `${prompt}

CRITICAL INSTRUCTIONS:
- Return ONLY the requested information
- Use simple format: field=value
- One line per field
- No extra text or explanations
- If field not found, write: field=
`;
    }

    _formatJSONPrompt(prompt) {
        return `${prompt}

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON (no markdown, no explanations)
- Escape ALL special characters in strings (\\n, \\", \\t, etc.)
- Use \\n for line breaks in descriptions
- NO trailing commas
- Start with { and end with }
`;
    }

    _parseJSONResponse(response) {
        let cleanedText = response.trim();
        
        // Remove markdown code blocks if present
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        cleanedText = cleanedText.trim();
        
        // Fix common JSON issues
        cleanedText = this._sanitizeJSONResponse(cleanedText);
        
        return JSON.parse(cleanedText);
    }

    _sanitizeJSONResponse(jsonString) {
        let fixed = jsonString;
        
        // Replace problematic characters in strings
        fixed = fixed.replace(/\n/g, '\\n');
        fixed = fixed.replace(/\r/g, '\\r');
        fixed = fixed.replace(/\t/g, '\\t');
        fixed = fixed.replace(/\\/g, '\\\\');
        fixed = fixed.replace(/\\\\n/g, '\\n');
        fixed = fixed.replace(/\\\\r/g, '\\r');
        fixed = fixed.replace(/\\\\t/g, '\\t');
        
        // Remove or replace problematic Unicode characters
        fixed = fixed.replace(/•/g, '\\u2022');
        fixed = fixed.replace(/–/g, '\\u2013');
        fixed = fixed.replace(/—/g, '\\u2014');
        fixed = fixed.replace(/'/g, "\\'");
        fixed = fixed.replace(/'/g, "\\'");
        fixed = fixed.replace(/"/g, '\\"');
        fixed = fixed.replace(/"/g, '\\"');
        
        // Remove trailing commas
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
        
        return fixed;
    }

    _handleError(error, description) {
        // Common error handling for all clients
        if (error.message.includes('API_KEY_INVALID') || error.message.includes('unauthorized')) {
            return new Error(`Invalid API key for ${this.clientName}. Please check your configuration.`);
        } else if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('rate limit')) {
            return new Error(`${this.clientName} API quota exceeded. Please check your usage limits.`);
        } else if (error.message.includes('timeout')) {
            return new Error(`${this.clientName} request timeout. Please try again.`);
        } else {
            return new Error(`${description} failed with ${this.clientName}: ${error.message}`);
        }
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Static factory method for creating clients
    static createClient(type, config = {}) {
        const clientMap = {
            'gemini': () => new (require('./gemini-client'))(config),
            'ollama': () => new (require('./ollama-client'))(config)
        };

        const createClientFn = clientMap[type.toLowerCase()];
        if (!createClientFn) {
            throw new Error(`Unsupported LLM client type: ${type}. Supported types: ${Object.keys(clientMap).join(', ')}`);
        }

        return createClientFn();
    }
}

module.exports = LLMClientBase;