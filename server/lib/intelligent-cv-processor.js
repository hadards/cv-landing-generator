// Intelligent CV Processor Factory
// Automatically selects between Gemini and Ollama based on environment

const IntelligentCVProcessorGemini = require('./intelligent-cv-processor-gemini');
const IntelligentCVProcessorOllama = require('./intelligent-cv-processor-ollama');

/**
 * Factory function to create the appropriate CV processor
 * @param {Object} config - Configuration options
 * @returns {IntelligentCVProcessorGemini|IntelligentCVProcessorOllama}
 */
function createIntelligentCVProcessor(config = {}) {
    const llmType = process.env.LLM_CLIENT_TYPE || 'gemini';
    
    console.log(`Creating CV Processor with LLM type: ${llmType}`);
    
    switch (llmType.toLowerCase()) {
        case 'ollama':
            console.log('Using Ollama CV Processor');
            return new IntelligentCVProcessorOllama(config);
        
        case 'gemini':
        default:
            console.log('Using Gemini CV Processor');
            return new IntelligentCVProcessorGemini(config);
    }
}

/**
 * Legacy export for backwards compatibility
 * Creates processor instance using factory
 */
class IntelligentCVProcessor {
    constructor(config = {}) {
        const processor = createIntelligentCVProcessor(config);
        
        // Copy all methods and properties from the selected processor
        Object.setPrototypeOf(this, Object.getPrototypeOf(processor));
        Object.assign(this, processor);
        
        return processor;
    }
}

// Export both factory function and legacy class
module.exports = IntelligentCVProcessor;
module.exports.createIntelligentCVProcessor = createIntelligentCVProcessor;
module.exports.IntelligentCVProcessorGemini = IntelligentCVProcessorGemini;
module.exports.IntelligentCVProcessorOllama = IntelligentCVProcessorOllama;