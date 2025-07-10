// File: lib/utils/ollama-client.js
const https = require('https');
const http = require('http');
const LLMClientBase = require('./llm-client-base');

class OllamaClient extends LLMClientBase {
    constructor(config = {}) {
        super(config);
        
        this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = config.model || process.env.OLLAMA_MODEL || 'llama2';
        this.temperature = config.temperature || 0.7;
        
        console.log(`Ollama client initialized - URL: ${this.baseUrl}, Model: ${this.model}`);
    }

    async _sendRequest(prompt, options = {}) {
        const requestData = {
            model: this.model,
            prompt: prompt,
            temperature: options.temperature || this.temperature,
            stream: false
        };

        return new Promise((resolve, reject) => {
            const url = new URL('/api/generate', this.baseUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            
            const requestOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(JSON.stringify(requestData))
                },
                timeout: options.timeout || this.config.timeout
            };

            const req = httpModule.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        if (res.statusCode !== 200) {
                            reject(new Error(`Ollama API error: ${response.error || 'Unknown error'}`));
                            return;
                        }
                        
                        if (response.error) {
                            reject(new Error(`Ollama error: ${response.error}`));
                            return;
                        }
                        
                        resolve(response.response || '');
                    } catch (error) {
                        reject(new Error(`Failed to parse Ollama response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                if (error.code === 'ECONNREFUSED') {
                    reject(new Error('Cannot connect to Ollama. Make sure Ollama is running.'));
                } else if (error.code === 'TIMEOUT') {
                    reject(new Error('timeout'));
                } else {
                    reject(error);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('timeout'));
            });

            req.write(JSON.stringify(requestData));
            req.end();
        });
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
        return new Promise((resolve, reject) => {
            const url = new URL('/api/tags', this.baseUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            
            const requestOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'GET',
                timeout: 5000
            };

            const req = httpModule.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        if (res.statusCode === 200) {
                            // Check if our model exists
                            const models = response.models || [];
                            const modelExists = models.some(m => m.name === this.model || m.name.startsWith(this.model + ':'));
                            
                            if (!modelExists) {
                                console.warn(`Warning: Model ${this.model} not found. Available models:`, models.map(m => m.name));
                                console.warn(`You may need to run: ollama pull ${this.model}`);
                            }
                            
                            resolve(response);
                        } else {
                            reject(new Error(`Ollama status check failed: ${res.statusCode}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse Ollama status response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                if (error.code === 'ECONNREFUSED') {
                    reject(new Error('Cannot connect to Ollama'));
                } else {
                    reject(error);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Ollama status check timeout'));
            });

            req.end();
        });
    }

    // Ollama-specific method to list available models
    async listModels() {
        try {
            await this._checkOllamaStatus();
            const url = new URL('/api/tags', this.baseUrl);
            // Implementation would make HTTP request to get models
            console.log(`Available models can be listed at: ${url.toString()}`);
        } catch (error) {
            throw new Error(`Failed to list models: ${error.message}`);
        }
    }

    // Ollama-specific method to pull a model
    async pullModel(modelName) {
        console.log(`To pull model ${modelName}, run: ollama pull ${modelName}`);
        console.log('This needs to be done from the command line.');
    }
}

module.exports = OllamaClient;