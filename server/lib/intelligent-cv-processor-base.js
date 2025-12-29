// Base class for Intelligent CV Processors
// Contains common logic shared between Gemini and Ollama implementations

const CVSessionService = require('./services/cv-session-service');
const TextCleaner = require('./utils/text-cleaner');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

class IntelligentCVProcessorBase {
    constructor() {
        // Initialize session service
        this.sessionService = new CVSessionService();
    }

    /**
     * Extract text from uploaded file
     * @param {string} filePath - Path to uploaded file
     * @param {string} mimeType - MIME type of file
     * @returns {string} Extracted text
     */
    async extractTextFromFile(filePath, mimeType) {
        try {
            let extractedText = '';

            switch (mimeType) {
                case 'application/pdf':
                    extractedText = await this.extractFromPDF(filePath);
                    break;
                case 'application/msword':
                    throw new Error('Legacy DOC format is not supported. Please save your document as DOCX format and upload again.');
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    extractedText = await this.extractFromWord(filePath);
                    break;
                case 'text/plain':
                    extractedText = fs.readFileSync(filePath, 'utf8');
                    break;
                default:
                    throw new Error(`Unsupported file type: ${mimeType}. Only PDF, DOCX, and TXT files are supported.`);
            }

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text could be extracted from the file. The file may be empty or corrupted.');
            }

            return extractedText.trim();

        } catch (error) {
            console.error('Text extraction failed:', error.message);

            // Provide more user-friendly error messages
            if (error.message.includes('body element')) {
                throw new Error('This appears to be a legacy DOC file. Please save your document as DOCX format (File > Save As > Word Document (.docx)) and upload again.');
            }

            // Re-throw user-friendly errors as-is
            if (error.message.includes('not supported') ||
                error.message.includes('Unsupported file type') ||
                error.message.includes('No text could be extracted')) {
                throw error;
            }

            // Wrap technical errors with user-friendly message
            throw new Error(`Failed to extract text from file: ${error.message}`);
        }
    }

    /**
     * Extract text from PDF file
     */
    async extractFromPDF(filePath) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } catch (error) {
            throw new Error(`PDF extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from Word document
     */
    async extractFromWord(filePath) {
        try {
            const result = await mammoth.extractRawText({path: filePath});

            if (!result || !result.value) {
                throw new Error('No text could be extracted from the Word document');
            }

            return result.value;
        } catch (error) {
            // Detect legacy DOC format errors
            if (error.message.includes('body element') || error.message.includes('not a docx file')) {
                throw new Error('This appears to be a legacy DOC file. Only DOCX format is supported. Please save your document as DOCX (File > Save As > Word Document (.docx)) and upload again.');
            }

            throw new Error(`Word document extraction failed: ${error.message}`);
        }
    }

    /**
     * Main entry point for CV processing
     * @param {string} cvText - Extracted CV text
     * @param {string} userId - User ID for session management
     * @returns {Object} Structured CV data
     */
    async processCV(cvText, userId) {
        try {
            // Clean the text first
            const cleanedText = TextCleaner.prepareForAI(cvText);
            
            // Create a processing session for this CV
            const sessionId = await this.sessionService.createSession(userId, {
                originalText: cvText,
                cleanedText: cleanedText,
                status: 'processing'
            });
            
            try {
                // Process with memory-enhanced multi-step approach
                const result = await this.processWithMemory(cleanedText, sessionId);
                
                // Mark session as completed  
                await this.sessionService.storeStepResult(sessionId, 'final_result', result, 1.0, {
                    status: 'completed',
                    processing_time: Date.now() - Date.now()
                });
                
                return result;
                
            } catch (processingError) {
                // Mark session as failed
                await this.sessionService.storeStepResult(sessionId, 'error', { 
                    error: processingError.message 
                }, 0.0, {
                    status: 'failed',
                    error_timestamp: new Date().toISOString()
                });
                
                throw processingError;
            }
            
        } catch (error) {
            console.error('CV processing failed:', error.message);
            throw error;
        }
    }

    /**
     * Process CV with session memory and context
     */
    async processWithMemory(cvText, sessionId) {
        try {
            // Step 1: Extract basic personal information
            const basicInfo = await this.extractBasicInfo(cvText);
            await this.sessionService.storeStepResult(sessionId, 'basic_info', basicInfo);
            
            // Step 2: Extract professional experience with context
            const context = await this.sessionService.getSessionContext(sessionId);
            const professionalInfo = await this.extractProfessional(cvText, context);
            await this.sessionService.storeStepResult(sessionId, 'professional', professionalInfo);
            
            // Step 3: Extract additional details with full context
            const updatedContext = await this.sessionService.getSessionContext(sessionId);
            const additionalInfo = await this.extractAdditional(cvText, updatedContext);
            await this.sessionService.storeStepResult(sessionId, 'additional', additionalInfo);
            
            // Step 4: Assemble final result
            const finalContext = await this.sessionService.getSessionContext(sessionId);
            
            // Extract data from previous steps (stored in previousSteps, not steps)
            const steps = finalContext.previousSteps || {};
            const basicInfoData = steps.basic_info?.data || {};
            const professionalInfoData = steps.professional?.data || {};
            const additionalInfoData = steps.additional?.data || {};
            
            const result = {
                personalInfo: basicInfoData,
                experience: professionalInfoData.experience || [],
                skills: professionalInfoData.skills || [],
                education: professionalInfoData.education || [],
                projects: additionalInfoData.projects || [],
                certifications: additionalInfoData.certifications || [],
                languages: additionalInfoData.languages || [],
                summary: basicInfoData.summary || '',
                metadata: {
                    processed_at: new Date().toISOString(),
                    processor: this.getProcessorName(),
                    session_id: sessionId,
                    steps_completed: Object.keys(steps).length
                }
            };
            
            return result;
            
        } catch (error) {
            console.error(`Error in memory-enhanced processing:`, error.message);
            throw error;
        }
    }

    /**
     * Retry mechanism with exponential backoff
     */
    async retryWithBackoff(operation, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Legacy method for backwards compatibility
     */
    async structureWithOllama(extractedText) {
        // Create a temporary session for legacy processing
        const tempSessionId = await this.sessionService.createSession('legacy-user', {
            originalText: extractedText,
            status: 'processing'
        });
        
        try {
            const result = await this.processWithMemory(extractedText, tempSessionId);
            await this.sessionService.storeStepResult(tempSessionId, 'legacy_completed', result, 1.0, { status: 'completed' });
            return result;
        } catch (error) {
            await this.sessionService.storeStepResult(tempSessionId, 'legacy_error', { error: error.message }, 0.0, { status: 'failed' });
            throw error;
        }
    }

    // Abstract methods that must be implemented by subclasses
    async extractBasicInfo(cvText) {
        throw new Error('extractBasicInfo must be implemented by subclass');
    }

    async extractProfessional(cvText, context) {
        throw new Error('extractProfessional must be implemented by subclass');
    }

    async extractAdditional(cvText, context) {
        throw new Error('extractAdditional must be implemented by subclass');
    }

    async testConnection() {
        throw new Error('testConnection must be implemented by subclass');
    }

    getProcessorName() {
        throw new Error('getProcessorName must be implemented by subclass');
    }
}

module.exports = IntelligentCVProcessorBase;