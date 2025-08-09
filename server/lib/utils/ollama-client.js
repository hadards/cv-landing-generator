// File: lib/utils/ollama-client.js
// Standardized Ollama client using fetch() API for consistency
const LLMClientBase = require('./llm-client-base');

class OllamaClient extends LLMClientBase {
    constructor(config = {}) {
        super(config);
        
        this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = config.model || process.env.OLLAMA_MODEL || 'llama2';
        this.temperature = config.temperature || 0.7;
        this.timeout = config.timeout || 30000; // 30 second default timeout
        
        console.log(`Ollama client initialized - URL: ${this.baseUrl}, Model: ${this.model}`);
    }

    async _sendRequest(prompt, options = {}) {
        const requestData = {
            model: this.model,
            prompt: prompt,
            temperature: options.temperature || this.temperature,
            stream: false
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Ollama API error (${response.status})`;
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = `Ollama API error: ${errorData.error || errorText}`;
                } catch {
                    errorMessage = `Ollama API error: ${errorText}`;
                }
                
                throw new Error(errorMessage);
            }

            const responseData = await response.json();
            
            if (responseData.error) {
                throw new Error(`Ollama error: ${responseData.error}`);
            }

            return responseData.response || '';

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('timeout');
            }
            if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
                throw new Error('Cannot connect to Ollama. Make sure Ollama is running.');
            }
            throw error;
        }
    }

    async _validateConnection() {
        try {
            // First check if Ollama is running
            await this._checkOllamaStatus();
            
            // Then test with a simple prompt
            const response = await this.generateSimpleText(
                'Say hello in one word.',
                'Connection test'
            );
            
            if (!response || response.length === 0) {
                throw new Error('Empty response from Ollama');
            }
            
            return response;
        } catch (error) {
            if (error.message.includes('Cannot connect to Ollama')) {
                throw new Error('Ollama server is not running. Please start Ollama first.');
            }
            throw error;
        }
    }

    async _checkOllamaStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for status check

            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama status check failed: ${response.status}`);
            }

            const responseData = await response.json();
            
            // Check if our model exists
            const models = responseData.models || [];
            const modelExists = models.some(m => m.name === this.model || m.name.startsWith(this.model + ':'));
            
            if (!modelExists && models.length > 0) {
                console.warn(`Warning: Model ${this.model} not found. Available models:`, models.map(m => m.name));
                console.warn(`You may need to run: ollama pull ${this.model}`);
            }
            
            return responseData;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Ollama status check timeout');
            }
            if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
                throw new Error('Cannot connect to Ollama');
            }
            throw error;
        }
    }

    // Ollama-specific method to list available models
    async listModels() {
        try {
            const statusData = await this._checkOllamaStatus();
            const models = statusData.models || [];
            console.log('Available Ollama models:', models.map(m => m.name));
            return models;
        } catch (error) {
            throw new Error(`Failed to list models: ${error.message}`);
        }
    }

    // Ollama-specific method to pull a model
    async pullModel(modelName) {
        console.log(`To pull model ${modelName}, run: ollama pull ${modelName}`);
        console.log('This needs to be done from the command line.');
        
        // Note: We could implement the pull API call here if needed:
        // POST /api/pull with { "name": modelName }
        // But it's typically done via CLI
    }
}

module.exports = OllamaClient;