// CV Session Service - Manages memory between LLM calls for single CV processing
const { query } = require('../../database/index');

class CVSessionService {
    constructor() {
        console.log('CVSessionService initialized');
    }

    /**
     * Create a new CV processing session
     * @param {string} userId - User ID
     * @param {string} cvTextPreview - First 500 chars of CV for reference
     * @param {object} metadata - Additional metadata (cv_type, profession, etc.)
     * @returns {string} sessionId
     */
    async createSession(userId, cvTextPreview, metadata = {}) {
        try {
            const result = await query(`
                INSERT INTO cv_processing_sessions (user_id, cv_text_preview, processing_metadata)
                VALUES ($1, $2, $3)
                RETURNING id
            `, [userId, cvTextPreview, JSON.stringify(metadata)]);
            
            const sessionId = result.rows[0].id;
            console.log(`Created CV processing session: ${sessionId}`);
            return sessionId;
            
        } catch (error) {
            console.error('Error creating CV session:', error);
            throw new Error('Failed to create processing session: ' + error.message);
        }
    }

    /**
     * Store the result of a processing step
     * @param {string} sessionId - Session ID
     * @param {string} stepName - Name of the processing step
     * @param {object} data - Extracted data from this step
     * @param {number} confidence - Confidence score (0-1)
     * @param {object} metadata - Additional step metadata
     */
    async storeStepResult(sessionId, stepName, data, confidence = 1.0, metadata = {}) {
        try {
            const stepData = {
                data,
                confidence,
                timestamp: new Date().toISOString(),
                metadata
            };

            await query(`
                UPDATE cv_processing_sessions 
                SET session_data = session_data || $2,
                    step_count = step_count + 1,
                    current_step = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [
                sessionId, 
                JSON.stringify({ [stepName]: stepData }),
                stepName
            ]);
            
            console.log(`Stored step result: ${stepName} for session ${sessionId}`);
            
        } catch (error) {
            console.error(`Error storing step result for session ${sessionId}:`, error);
            throw new Error('Failed to store step result: ' + error.message);
        }
    }

    /**
     * Get current session context for next LLM call
     * @param {string} sessionId - Session ID
     * @returns {object} Session context with previous steps and known facts
     */
    async getSessionContext(sessionId) {
        try {
            const result = await query(`
                SELECT session_data, step_count, current_step, processing_metadata
                FROM cv_processing_sessions 
                WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP
            `, [sessionId]);
            
            if (result.rows.length === 0) {
                throw new Error('Session expired or not found');
            }
            
            const session = result.rows[0];
            const sessionData = session.session_data || {};
            
            // Extract known facts from previous steps
            const knownFacts = this.extractKnownFacts(sessionData);
            
            return {
                sessionId,
                previousSteps: sessionData,
                stepCount: session.step_count,
                currentStep: session.current_step,
                knownFacts,
                processingMetadata: session.processing_metadata || {}
            };
            
        } catch (error) {
            console.error(`Error getting session context for ${sessionId}:`, error);
            throw new Error('Failed to get session context: ' + error.message);
        }
    }

    /**
     * Extract known facts from previous processing steps
     * @param {object} sessionData - All previous step data
     * @returns {object} Compiled known facts
     */
    extractKnownFacts(sessionData) {
        const knownFacts = {
            name: null,
            email: null,
            currentTitle: null,
            profession: null,
            industry: null,
            experienceLevel: null,
            skills: [],
            previousFindings: {}
        };

        // Extract from basic_info step
        if (sessionData.basic_info?.data) {
            const basicInfo = sessionData.basic_info.data;
            knownFacts.name = basicInfo.name;
            knownFacts.email = basicInfo.email;
            knownFacts.currentTitle = basicInfo.currentTitle;
            knownFacts.profession = this.detectProfession(basicInfo);
        }

        // Extract from professional step
        if (sessionData.professional?.data) {
            const profData = sessionData.professional.data;
            if (profData.skills) {
                knownFacts.skills = Array.isArray(profData.skills) ? profData.skills : [];
            }
            if (profData.experience) {
                knownFacts.experienceLevel = this.determineExperienceLevel(profData.experience);
            }
        }

        // Store all previous findings for reference
        knownFacts.previousFindings = sessionData;

        return knownFacts;
    }

    /**
     * Detect profession from basic info
     * @param {object} basicInfo - Basic personal information
     * @returns {string} Detected profession
     */
    detectProfession(basicInfo) {
        if (!basicInfo.currentTitle) return 'general';
        
        const title = basicInfo.currentTitle.toLowerCase();
        
        // Simple profession detection based on job title
        if (title.includes('software') || title.includes('developer') || title.includes('engineer')) {
            return 'software_developer';
        } else if (title.includes('nurse') || title.includes('medical') || title.includes('healthcare')) {
            return 'healthcare';
        } else if (title.includes('teacher') || title.includes('educator') || title.includes('professor')) {
            return 'education';
        } else if (title.includes('cook') || title.includes('chef') || title.includes('culinary')) {
            return 'culinary';
        } else if (title.includes('sales') || title.includes('account') || title.includes('business')) {
            return 'sales_business';
        } else {
            return 'general';
        }
    }

    /**
     * Determine experience level from work history
     * @param {array} experience - Work experience array
     * @returns {string} Experience level
     */
    determineExperienceLevel(experience) {
        if (!Array.isArray(experience) || experience.length === 0) {
            return 'entry_level';
        }
        
        const totalYears = experience.reduce((total, job) => {
            // Simple year calculation - you can make this more sophisticated
            return total + (job.years || 1);
        }, 0);
        
        if (totalYears < 2) return 'entry_level';
        if (totalYears < 5) return 'mid_level';
        if (totalYears < 10) return 'senior_level';
        return 'executive_level';
    }

    /**
     * Get final combined result from all processing steps
     * @param {string} sessionId - Session ID
     * @returns {object} Combined final result
     */
    async getFinalResult(sessionId) {
        try {
            const context = await this.getSessionContext(sessionId);
            const sessionData = context.previousSteps;
            
            // Combine data from all steps
            const finalResult = {
                personalInfo: sessionData.basic_info?.data || {},
                experience: sessionData.professional?.data?.experience || [],
                skills: sessionData.professional?.data?.skills || {},
                education: sessionData.professional?.data?.education || [],
                projects: sessionData.additional?.data?.projects || [],
                certifications: sessionData.additional?.data?.certifications || [],
                
                // Processing metadata
                processingInfo: {
                    sessionId,
                    stepsCompleted: context.stepCount,
                    profession: context.knownFacts.profession,
                    experienceLevel: context.knownFacts.experienceLevel,
                    confidenceScores: this.extractConfidenceScores(sessionData)
                }
            };
            
            return finalResult;
            
        } catch (error) {
            console.error(`Error getting final result for session ${sessionId}:`, error);
            throw new Error('Failed to get final result: ' + error.message);
        }
    }

    /**
     * Extract confidence scores from all processing steps
     * @param {object} sessionData - All session data
     * @returns {object} Confidence scores by step
     */
    extractConfidenceScores(sessionData) {
        const scores = {};
        
        Object.keys(sessionData).forEach(stepName => {
            if (sessionData[stepName]?.confidence !== undefined) {
                scores[stepName] = sessionData[stepName].confidence;
            }
        });
        
        return scores;
    }

    /**
     * Clean up session data (call after processing complete)
     * @param {string} sessionId - Session ID
     */
    async cleanupSession(sessionId) {
        try {
            await query('DELETE FROM cv_processing_sessions WHERE id = $1', [sessionId]);
            console.log(`Cleaned up session: ${sessionId}`);
            
        } catch (error) {
            console.error(`Error cleaning up session ${sessionId}:`, error);
            // Don't throw error - cleanup failure shouldn't break the main flow
        }
    }

    /**
     * Clean up all expired sessions (maintenance function)
     */
    async cleanupExpiredSessions() {
        try {
            const result = await query(`
                DELETE FROM cv_processing_sessions 
                WHERE expires_at < CURRENT_TIMESTAMP
                RETURNING id
            `);
            
            console.log(`Cleaned up ${result.rows.length} expired sessions`);
            return result.rows.length;
            
        } catch (error) {
            console.error('Error cleaning up expired sessions:', error);
            return 0;
        }
    }

    /**
     * Get session statistics (for monitoring)
     * @param {string} sessionId - Session ID
     * @returns {object} Session statistics
     */
    async getSessionStats(sessionId) {
        try {
            const result = await query(`
                SELECT 
                    step_count,
                    current_step,
                    EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_time_seconds,
                    expires_at > CURRENT_TIMESTAMP as is_active
                FROM cv_processing_sessions 
                WHERE id = $1
            `, [sessionId]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return result.rows[0];
            
        } catch (error) {
            console.error(`Error getting session stats for ${sessionId}:`, error);
            return null;
        }
    }
}

module.exports = CVSessionService;