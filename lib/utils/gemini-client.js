// File: lib/utils/gemini-client.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiClient {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        console.log('✅ Gemini client initialized');
    }

    async generateText(prompt, options = {}) {
        const {
            maxRetries = 3,
            timeout = 30000,
            description = 'AI request'
        } = options;

        console.log(`🤖 ${description} - sending request to Gemini...`);
        console.log(`📝 Prompt length: ${prompt.length} characters`);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();

                console.log(`✅ ${description} - received response (${text.length} chars)`);
                return text;

            } catch (error) {
                console.error(`❌ ${description} - attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    if (error.message.includes('API_KEY_INVALID')) {
                        throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY.');
                    } else if (error.message.includes('QUOTA_EXCEEDED')) {
                        throw new Error('Gemini API quota exceeded. Please check your usage limits.');
                    } else {
                        throw new Error(`${description} failed: ${error.message}`);
                    }
                }
                
                // Wait before retry (exponential backoff)
                await this.delay(1000 * attempt);
            }
        }
    }

    async generateSimpleText(prompt, description = 'Text generation') {
        const enhancedPrompt = `
${prompt}

IMPORTANT RULES:
- Return ONLY the requested text
- No markdown formatting
- No explanations or extra text
- No quotes around the response
- Keep response concise and professional
`;

        return await this.generateText(enhancedPrompt, { description });
    }

    async extractSimpleData(prompt, description = 'Data extraction') {
        const enhancedPrompt = `
${prompt}

CRITICAL INSTRUCTIONS:
- Return ONLY the requested information
- Use simple format: field=value
- One line per field
- No extra text or explanations
- If field not found, write: field=
`;

        return await this.generateText(enhancedPrompt, { description });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Utility method to test if client is working
    async testConnection() {
        // try {
        //     const response = await this.generateSimpleText(
        //         'Say hello in one word.',
        //         'Connection test'
        //     );
            
        //     console.log('🎉 Gemini client test successful:', response);
        //     return true;
        // } catch (error) {
        //     console.error('💥 Gemini client test failed:', error.message);
        //     return false;
        // }
    }
}

module.exports = GeminiClient;