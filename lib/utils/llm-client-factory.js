// File: lib/utils/llm-client-factory.js
// Factory for creating and configuring LLM clients

const LLMClientBase = require('./llm-client-base');

class LLMClientFactory {
    static createClient(config = {}) {
        // Get client type from config, environment, or default
        const clientType = config.type || process.env.LLM_CLIENT_TYPE || 'gemini';
        
        console.log(`Creating LLM client: ${clientType}`);
        
        try {
            switch (clientType.toLowerCase()) {
                case 'gemini':
                    const GeminiClient = require('./gemini-client');
                    return new GeminiClient(config);
                    
                case 'ollama':
                    const OllamaClient = require('./ollama-client');
                    return new OllamaClient(config);
                    
                default:
                    throw new Error(`Unsupported LLM client type: ${clientType}`);
            }
        } catch (error) {
            console.error(`Failed to create ${clientType} client:`, error.message);
            throw error;
        }
    }

    static async createAndTestClient(config = {}) {
        const client = this.createClient(config);
        
        try {
            await client.testConnection();
            console.log(`${client.clientName} client ready for use`);
            return client;
        } catch (error) {
            console.error(`${client.clientName} client test failed:`, error.message);
            throw error;
        }
    }

    static getAvailableClients() {
        return ['gemini', 'ollama'];
    }

    static getClientRequirements() {
        return {
            gemini: {
                envVars: ['GEMINI_API_KEY'],
                description: 'Google Gemini API client',
                setup: 'Set GEMINI_API_KEY environment variable'
            },
            ollama: {
                envVars: ['OLLAMA_BASE_URL', 'OLLAMA_MODEL'],
                description: 'Local Ollama client',
                setup: 'Install and run Ollama locally, set OLLAMA_BASE_URL and OLLAMA_MODEL if needed'
            }
        };
    }

    static validateConfiguration(clientType) {
        const requirements = this.getClientRequirements();
        const clientReqs = requirements[clientType.toLowerCase()];
        
        if (!clientReqs) {
            throw new Error(`Unknown client type: ${clientType}`);
        }

        const missing = [];
        const optional = [];

        switch (clientType.toLowerCase()) {
            case 'gemini':
                if (!process.env.GEMINI_API_KEY) {
                    missing.push('GEMINI_API_KEY');
                }
                break;
                
            case 'ollama':
                // OLLAMA_BASE_URL and OLLAMA_MODEL are optional (have defaults)
                if (!process.env.OLLAMA_BASE_URL) {
                    optional.push('OLLAMA_BASE_URL (defaults to http://localhost:11434)');
                }
                if (!process.env.OLLAMA_MODEL) {
                    optional.push('OLLAMA_MODEL (defaults to llama2)');
                }
                break;
        }

        return {
            valid: missing.length === 0,
            missing,
            optional,
            setup: clientReqs.setup
        };
    }
}

module.exports = LLMClientFactory;