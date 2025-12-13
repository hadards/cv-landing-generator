// File: lib/simple-queue-manager.js
// Simple queue manager for CV processing with database persistence and error mapping

const { randomUUID } = require('crypto');

class SimpleQueueManager {
    constructor(dbServices, fileCache = null) {
        this.db = dbServices;
        this.fileCache = fileCache;
        this.isProcessing = false;
        this.MAX_CONCURRENT = 1; // Process one at a time for free tier
        this.CLEANUP_INTERVAL = 60000; // Clean up every minute
        
        // Start background processes
        this.startQueueProcessor();
        this.startCleanup();
    }

    /**
     * Add a job to the queue
     */
    async addJob(userId, fileId) {
        try {
            // Get current queue length to determine position
            const queueLength = await this.db.query(
                'SELECT COUNT(*) as count FROM processing_jobs WHERE status = $1',
                ['queued']
            );
            
            const position = parseInt(queueLength.rows[0].count) + 1;
            const estimatedWaitMinutes = Math.max(1, position * 2); // 2 minutes per job estimate

            // Insert new job
            const result = await this.db.query(`
                INSERT INTO processing_jobs (user_id, file_id, position, estimated_wait_minutes)
                VALUES ($1, $2, $3, $4)
                RETURNING id, position, estimated_wait_minutes, created_at
            `, [userId, fileId, position, estimatedWaitMinutes]);

            const job = result.rows[0];
            console.log(`Job ${job.id} added to queue at position ${job.position}`);

            return {
                jobId: job.id,
                position: job.position,
                estimatedWaitMinutes: job.estimated_wait_minutes,
                queuedAt: job.created_at
            };

        } catch (error) {
            console.error('Error adding job to queue:', error);
            throw error;
        }
    }

    /**
     * Get job status by ID
     */
    async getJobStatus(jobId) {
        try {
            const result = await this.db.query(`
                SELECT id, user_id, status, position, structured_data, error_message,
                       estimated_wait_minutes, created_at, started_at, completed_at,
                       processing_time_seconds
                FROM processing_jobs 
                WHERE id = $1
            `, [jobId]);

            if (result.rows.length === 0) {
                return null;
            }

            const job = result.rows[0];
            
            // If queued, update position based on current queue
            if (job.status === 'queued') {
                const positionResult = await this.db.query(`
                    SELECT COUNT(*) + 1 as current_position
                    FROM processing_jobs 
                    WHERE status = 'queued' AND created_at < $1
                `, [job.created_at]);
                
                job.position = parseInt(positionResult.rows[0].current_position);
            }

            return job;
        } catch (error) {
            console.error('Error getting job status:', error);
            throw error;
        }
    }

    /**
     * Get all jobs for a user
     */
    async getUserJobs(userId) {
        try {
            const result = await this.db.query(`
                SELECT id, status, position, created_at, completed_at, error_message
                FROM processing_jobs 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT 10
            `, [userId]);

            return result.rows;
        } catch (error) {
            console.error('Error getting user jobs:', error);
            throw error;
        }
    }

    /**
     * Cancel a queued job
     */
    async cancelJob(jobId, userId) {
        try {
            const result = await this.db.query(`
                UPDATE processing_jobs 
                SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2 AND status = 'queued'
                RETURNING id
            `, [jobId, userId]);

            if (result.rows.length > 0) {
                console.log(`Job ${jobId} cancelled by user ${userId}`);
                await this.updateQueuePositions();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error cancelling job:', error);
            throw error;
        }
    }

    /**
     * Background queue processor
     */
    async startQueueProcessor() {
        setInterval(async () => {
            if (!this.isProcessing) {
                await this.processNextJob();
            }
        }, 2000); // Check every 2 seconds

        console.log('Queue processor started');
    }

    /**
     * Process the next job in queue
     */
    async processNextJob() {
        try {
            // Get next job to process
            const result = await this.db.query(`
                SELECT id, user_id, file_id
                FROM processing_jobs 
                WHERE status = 'queued' 
                ORDER BY created_at ASC 
                LIMIT 1
            `);

            if (result.rows.length === 0) {
                return; // No jobs to process
            }

            const job = result.rows[0];
            this.isProcessing = true;

            console.log(`Starting processing job ${job.id}`);

            // Mark job as processing
            await this.db.query(`
                UPDATE processing_jobs 
                SET status = 'processing', started_at = CURRENT_TIMESTAMP, position = 0
                WHERE id = $1
            `, [job.id]);

            // Update positions for remaining queued jobs
            await this.updateQueuePositions();

            try {
                // Process the CV
                const IntelligentCVProcessor = require('./intelligent-cv-processor');
                const processor = new IntelligentCVProcessor();
                
                // Get file info from cache
                console.log('Attempting to get file for job:', {
                    fileId: job.file_id,
                    hasCacheReference: !!this.fileCache
                });
                
                let fileInfo = null;
                if (this.fileCache) {
                    fileInfo = this.fileCache.get(job.file_id);
                } 
                
                // FALLBACK: If not in cache, check database (hydration)
                if (!fileInfo) {
                    console.log(`Cache miss for file ${job.file_id}, attempting DB hydration...`);
                    const { getFileUploadById } = require('../database/services');
                    const dbFile = await getFileUploadById(job.file_id);
                    
                    if (dbFile) {
                        // Reconstruct fileInfo from DB record
                        fileInfo = {
                            id: dbFile.id,
                            originalName: dbFile.original_filename || dbFile.filename,
                            filename: dbFile.filename,
                            path: dbFile.filepath,
                            mimetype: dbFile.mime_type,
                            extractedText: dbFile.extracted_text,
                            size: dbFile.file_size
                        };
                        
                        // Re-populate cache to speed up subsequent accesses
                        if (this.fileCache) {
                            this.fileCache.set(job.file_id, fileInfo);
                        }
                        console.log('Job hydrated from database successfully');
                    }
                }
                
                if (!fileInfo) {
                    throw new Error('File not found in cache or database');
                }
                
                if (!fileInfo.extractedText) {
                    throw new Error('File found but no extracted text available');
                }

                const startTime = Date.now();
                const structuredData = await processor.processCV(fileInfo.extractedText || '', job.user_id);
                const processingTime = Math.floor((Date.now() - startTime) / 1000);

                // Mark job as completed
                await this.db.query(`
                    UPDATE processing_jobs 
                    SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                        structured_data = $1, processing_time_seconds = $2
                    WHERE id = $3
                `, [JSON.stringify(structuredData), processingTime, job.id]);

                console.log(`Job ${job.id} completed successfully in ${processingTime}s`);

            } catch (error) {
                console.error(`Job ${job.id} failed:`, error);
                
                // === ARCHITECTURAL FIX: Error Mapping ===
                let userMessage = error.message;
                
                // Map infrastructure errors to friendly user messages
                if (error.message.includes('connect to Ollama') || 
                    error.message.includes('ECONNREFUSED') ||
                    error.message.includes('fetch failed')) {
                    userMessage = 'The AI service is temporarily unavailable. Please try again later.';
                    console.warn('Infrastructure Error Detected:', error.message);
                } else if (error.message.includes('timeout')) {
                    userMessage = 'Processing timed out. The document may be too complex or the service is busy.';
                } else if (error.message.includes('API_KEY_INVALID') || error.message.includes('QUOTA_EXCEEDED')) {
                     userMessage = 'Service usage limit reached. Please try again tomorrow.';
                     console.error('API Quota Error:', error.message);
                }

                // Mark job as failed with sanitized message
                await this.db.query(`
                    UPDATE processing_jobs 
                    SET status = 'failed', completed_at = CURRENT_TIMESTAMP,
                        error_message = $1
                    WHERE id = $2
                `, [userMessage, job.id]);
            }

        } catch (error) {
            console.error('Error processing job:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Update queue positions for all queued jobs
     */
    async updateQueuePositions() {
        try {
            await this.db.query(`
                WITH ranked_jobs AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_position
                    FROM processing_jobs 
                    WHERE status = 'queued'
                )
                UPDATE processing_jobs 
                SET position = ranked_jobs.new_position
                FROM ranked_jobs
                WHERE processing_jobs.id = ranked_jobs.id
            `);
        } catch (error) {
            console.error('Error updating queue positions:', error);
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        try {
            const result = await this.db.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'queued') as queued,
                    COUNT(*) FILTER (WHERE status = 'processing') as processing,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    AVG(processing_time_seconds) FILTER (WHERE status = 'completed') as avg_processing_time
                FROM processing_jobs 
                WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
            `);

            return result.rows[0];
        } catch (error) {
            console.error('Error getting queue stats:', error);
            throw error;
        }
    }

    /**
     * Cleanup old jobs
     */
    startCleanup() {
        setInterval(async () => {
            try {
                // Delete completed/failed jobs older than 24 hours
                const result = await this.db.query(`
                    DELETE FROM processing_jobs 
                    WHERE status IN ('completed', 'failed', 'cancelled')
                    AND completed_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
                `);
                
                if (result.rowCount > 0) {
                    console.log(`Cleaned up ${result.rowCount} old jobs`);
                }
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        }, this.CLEANUP_INTERVAL);

        console.log('Queue cleanup started');
    }
}

module.exports = SimpleQueueManager;