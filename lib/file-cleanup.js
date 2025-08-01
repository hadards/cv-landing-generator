// File: lib/file-cleanup.js - File cleanup management system
const fs = require('fs').promises;
const path = require('path');
const metricsCollector = require('./metrics-collector');

class FileCleanupManager {
    constructor() {
        this.uploadsDir = path.join(__dirname, '..', 'uploads');
        this.generatedDir = path.join(__dirname, '..', 'generated');
        this.cleanupIntervals = new Map();
        this.isRunning = false;
        
        // Default configuration
        this.config = {
            uploads: {
                maxAge: parseInt(process.env.UPLOADS_MAX_AGE_HOURS) || 24, // 24 hours
                maxFiles: parseInt(process.env.UPLOADS_MAX_FILES) || 1000,
                cleanupInterval: parseInt(process.env.UPLOADS_CLEANUP_INTERVAL_HOURS) || 4 // Every 4 hours
            },
            generated: {
                maxAge: parseInt(process.env.GENERATED_MAX_AGE_DAYS) || 30, // 30 days
                maxFiles: parseInt(process.env.GENERATED_MAX_FILES) || 500,
                cleanupInterval: parseInt(process.env.GENERATED_CLEANUP_INTERVAL_HOURS) || 12 // Every 12 hours
            },
            orphaned: {
                checkInterval: parseInt(process.env.ORPHANED_CHECK_INTERVAL_HOURS) || 24 // Daily
            }
        };
    }
    
    async start() {
        if (this.isRunning) {
            console.log('File cleanup manager is already running');
            return;
        }
        
        this.isRunning = true;
        console.log('Starting file cleanup manager...');
        
        try {
            // Verify directories exist
            await this.ensureDirectories();
            
            // Start cleanup intervals
            await this.startCleanupIntervals();
            
            // Record startup metrics
            metricsCollector.recordUserActivity('cleanup_manager_started');
            
            console.log('File cleanup manager started successfully');
            console.log('Cleanup configuration:', {
                uploads: `${this.config.uploads.maxAge}h max age, every ${this.config.uploads.cleanupInterval}h`,
                generated: `${this.config.generated.maxAge}d max age, every ${this.config.generated.cleanupInterval}h`,
                orphaned: `check every ${this.config.orphaned.checkInterval}h`
            });
            
        } catch (error) {
            console.error('Failed to start file cleanup manager:', error);
            this.isRunning = false;
            throw error;
        }
    }
    
    async stop() {
        if (!this.isRunning) {
            return;
        }
        
        console.log('Stopping file cleanup manager...');
        
        // Clear all intervals
        for (const [name, intervalId] of this.cleanupIntervals) {
            clearInterval(intervalId);
            console.log(`Stopped ${name} cleanup interval`);
        }
        
        this.cleanupIntervals.clear();
        this.isRunning = false;
        
        console.log('File cleanup manager stopped');
    }
    
    async ensureDirectories() {
        try {
            await fs.access(this.uploadsDir);
        } catch (error) {
            console.log('Creating uploads directory...');
            await fs.mkdir(this.uploadsDir, { recursive: true });
        }
        
        try {
            await fs.access(this.generatedDir);
        } catch (error) {
            console.log('Creating generated directory...');
            await fs.mkdir(this.generatedDir, { recursive: true });
        }
    }
    
    async startCleanupIntervals() {
        // Upload files cleanup
        const uploadsInterval = setInterval(async () => {
            try {
                await this.cleanupUploads();
            } catch (error) {
                console.error('Upload cleanup failed:', error);
                metricsCollector.recordError(error, { context: 'upload_cleanup' });
            }
        }, this.config.uploads.cleanupInterval * 60 * 60 * 1000);
        
        this.cleanupIntervals.set('uploads', uploadsInterval);
        
        // Generated files cleanup
        const generatedInterval = setInterval(async () => {
            try {
                await this.cleanupGenerated();
            } catch (error) {
                console.error('Generated files cleanup failed:', error);
                metricsCollector.recordError(error, { context: 'generated_cleanup' });
            }
        }, this.config.generated.cleanupInterval * 60 * 60 * 1000);
        
        this.cleanupIntervals.set('generated', generatedInterval);
        
        // Orphaned files cleanup
        const orphanedInterval = setInterval(async () => {
            try {
                await this.cleanupOrphanedFiles();
            } catch (error) {
                console.error('Orphaned files cleanup failed:', error);
                metricsCollector.recordError(error, { context: 'orphaned_cleanup' });
            }
        }, this.config.orphaned.checkInterval * 60 * 60 * 1000);
        
        this.cleanupIntervals.set('orphaned', orphanedInterval);
        
        // Run initial cleanup after a short delay
        setTimeout(async () => {
            console.log('Running initial file cleanup...');
            await this.runFullCleanup();
        }, 30000); // 30 seconds delay
    }
    
    async cleanupUploads() {
        console.log('Starting upload files cleanup...');
        const startTime = Date.now();
        
        try {
            const files = await fs.readdir(this.uploadsDir);
            const now = Date.now();
            const maxAgeMs = this.config.uploads.maxAge * 60 * 60 * 1000;
            
            let deletedCount = 0;
            let totalSize = 0;
            const filesToDelete = [];
            
            // Analyze files
            for (const file of files) {
                const filePath = path.join(this.uploadsDir, file);
                
                try {
                    const stats = await fs.stat(filePath);
                    const age = now - stats.mtime.getTime();
                    
                    totalSize += stats.size;
                    
                    if (age > maxAgeMs) {
                        filesToDelete.push({
                            path: filePath,
                            name: file,
                            size: stats.size,
                            age: Math.floor(age / (60 * 60 * 1000)) // hours
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to stat upload file ${file}:`, error.message);
                }
            }
            
            // Handle file count limit
            if (files.length > this.config.uploads.maxFiles) {
                const excess = files.length - this.config.uploads.maxFiles;
                console.log(`Upload directory has ${files.length} files (limit: ${this.config.uploads.maxFiles}), cleaning up ${excess} oldest files`);
                
                // Get all files with stats, sort by age
                const allFiles = [];
                for (const file of files) {
                    const filePath = path.join(this.uploadsDir, file);
                    try {
                        const stats = await fs.stat(filePath);
                        allFiles.push({
                            path: filePath,
                            name: file,
                            size: stats.size,
                            mtime: stats.mtime.getTime()
                        });
                    } catch (error) {
                        // Skip files we can't stat
                    }
                }
                
                // Sort by modification time (oldest first) and take excess files
                allFiles.sort((a, b) => a.mtime - b.mtime);
                for (let i = 0; i < excess; i++) {
                    if (allFiles[i] && !filesToDelete.find(f => f.path === allFiles[i].path)) {
                        filesToDelete.push({
                            path: allFiles[i].path,
                            name: allFiles[i].name,
                            size: allFiles[i].size,
                            reason: 'count_limit'
                        });
                    }
                }
            }
            
            // Delete files
            for (const file of filesToDelete) {
                try {
                    await fs.unlink(file.path);
                    deletedCount++;
                    console.log(`Deleted upload: ${file.name} (${file.age ? file.age + 'h old' : 'count limit'}, ${Math.round(file.size / 1024)}KB)`);
                } catch (error) {
                    console.warn(`Failed to delete upload file ${file.name}:`, error.message);
                }
            }
            
            const duration = Date.now() - startTime;
            const remainingFiles = files.length - deletedCount;
            
            console.log(`Upload cleanup completed: ${deletedCount} files deleted, ${remainingFiles} remaining (${duration}ms)`);
            
            // Record metrics
            metricsCollector.recordPerformance('file_cleanup_uploads', duration, {
                files_deleted: deletedCount,
                files_remaining: remainingFiles,
                total_size_mb: Math.round(totalSize / 1024 / 1024)
            });
            
            return {
                deleted: deletedCount,
                remaining: remainingFiles,
                duration
            };
            
        } catch (error) {
            console.error('Upload cleanup failed:', error);
            metricsCollector.recordError(error, { context: 'upload_cleanup' });
            throw error;
        }
    }
    
    async cleanupGenerated() {
        console.log('Starting generated files cleanup...');
        const startTime = Date.now();
        
        try {
            const userDirs = await fs.readdir(this.generatedDir);
            const now = Date.now();
            const maxAgeMs = this.config.generated.maxAge * 24 * 60 * 60 * 1000; // days to ms
            
            let deletedSites = 0;
            let totalSites = 0;
            
            for (const userDir of userDirs) {
                const userPath = path.join(this.generatedDir, userDir);
                
                try {
                    const userStats = await fs.stat(userPath);
                    if (!userStats.isDirectory()) continue;
                    
                    const sites = await fs.readdir(userPath);
                    
                    for (const site of sites) {
                        const sitePath = path.join(userPath, site);
                        
                        try {
                            const siteStats = await fs.stat(sitePath);
                            if (!siteStats.isDirectory()) continue;
                            
                            totalSites++;
                            const age = now - siteStats.mtime.getTime();
                            
                            if (age > maxAgeMs) {
                                await this.deleteDirectory(sitePath);
                                deletedSites++;
                                const ageDays = Math.floor(age / (24 * 60 * 60 * 1000));
                                console.log(`Deleted generated site: ${userDir}/${site} (${ageDays} days old)`);
                            }
                        } catch (error) {
                            console.warn(`Failed to process site ${userDir}/${site}:`, error.message);
                        }
                    }
                    
                    // Clean up empty user directories
                    try {
                        const remainingSites = await fs.readdir(userPath);
                        if (remainingSites.length === 0) {
                            await fs.rmdir(userPath);
                            console.log(`Removed empty user directory: ${userDir}`);
                        }
                    } catch (error) {
                        // Directory not empty or other error, ignore
                    }
                    
                } catch (error) {
                    console.warn(`Failed to process user directory ${userDir}:`, error.message);
                }
            }
            
            // Handle site count limit
            if (totalSites > this.config.generated.maxFiles) {
                const excess = totalSites - this.config.generated.maxFiles;
                console.log(`Found ${totalSites} generated sites (limit: ${this.config.generated.maxFiles}), need to clean up ${excess} more`);
                await this.cleanupOldestSites(excess);
            }
            
            const duration = Date.now() - startTime;
            const remainingSites = totalSites - deletedSites;
            
            console.log(`Generated files cleanup completed: ${deletedSites} sites deleted, ${remainingSites} remaining (${duration}ms)`);
            
            // Record metrics
            metricsCollector.recordPerformance('file_cleanup_generated', duration, {
                sites_deleted: deletedSites,
                sites_remaining: remainingSites
            });
            
            return {
                deleted: deletedSites,
                remaining: remainingSites,
                duration
            };
            
        } catch (error) {
            console.error('Generated files cleanup failed:', error);
            metricsCollector.recordError(error, { context: 'generated_cleanup' });
            throw error;
        }
    }
    
    async cleanupOldestSites(count) {
        const allSites = [];
        
        try {
            const userDirs = await fs.readdir(this.generatedDir);
            
            for (const userDir of userDirs) {
                const userPath = path.join(this.generatedDir, userDir);
                
                try {
                    const userStats = await fs.stat(userPath);
                    if (!userStats.isDirectory()) continue;
                    
                    const sites = await fs.readdir(userPath);
                    
                    for (const site of sites) {
                        const sitePath = path.join(userPath, site);
                        
                        try {
                            const siteStats = await fs.stat(sitePath);
                            if (siteStats.isDirectory()) {
                                allSites.push({
                                    path: sitePath,
                                    name: `${userDir}/${site}`,
                                    mtime: siteStats.mtime.getTime()
                                });
                            }
                        } catch (error) {
                            // Skip files we can't stat
                        }
                    }
                } catch (error) {
                    // Skip directories we can't read
                }
            }
            
            // Sort by modification time (oldest first) and delete
            allSites.sort((a, b) => a.mtime - b.mtime);
            
            for (let i = 0; i < Math.min(count, allSites.length); i++) {
                try {
                    await this.deleteDirectory(allSites[i].path);
                    console.log(`Deleted oldest site: ${allSites[i].name}`);
                } catch (error) {
                    console.warn(`Failed to delete site ${allSites[i].name}:`, error.message);
                }
            }
            
        } catch (error) {
            console.error('Failed to cleanup oldest sites:', error);
        }
    }
    
    async cleanupOrphanedFiles() {
        console.log('Starting orphaned files cleanup...');
        const startTime = Date.now();
        
        try {
            // This would typically check database records against filesystem
            // For now, we'll do basic orphaned file detection
            
            let deletedCount = 0;
            
            // Check for files that don't follow expected naming patterns
            const uploads = await fs.readdir(this.uploadsDir);
            const suspiciousFiles = uploads.filter(file => {
                // Files should be hex strings from multer
                return !/^[a-f0-9]{32}$/.test(file) && file !== '.gitkeep';
            });
            
            for (const file of suspiciousFiles) {
                const filePath = path.join(this.uploadsDir, file);
                try {
                    // Check if it's actually a file and old enough
                    const stats = await fs.stat(filePath);
                    const age = Date.now() - stats.mtime.getTime();
                    const oneHour = 60 * 60 * 1000;
                    
                    if (stats.isFile() && age > oneHour) {
                        await fs.unlink(filePath);
                        deletedCount++;
                        console.log(`Deleted suspicious file: ${file}`);
                    }
                } catch (error) {
                    console.warn(`Failed to process suspicious file ${file}:`, error.message);
                }
            }
            
            const duration = Date.now() - startTime;
            console.log(`Orphaned files cleanup completed: ${deletedCount} files deleted (${duration}ms)`);
            
            // Record metrics
            metricsCollector.recordPerformance('file_cleanup_orphaned', duration, {
                files_deleted: deletedCount
            });
            
            return {
                deleted: deletedCount,
                duration
            };
            
        } catch (error) {
            console.error('Orphaned files cleanup failed:', error);
            metricsCollector.recordError(error, { context: 'orphaned_cleanup' });
            throw error;
        }
    }
    
    async deleteDirectory(dirPath) {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
                await this.deleteDirectory(itemPath);
            } else {
                await fs.unlink(itemPath);
            }
        }
        
        await fs.rmdir(dirPath);
    }
    
    async runFullCleanup() {
        console.log('Running full file cleanup...');
        const startTime = Date.now();
        
        try {
            const results = await Promise.allSettled([
                this.cleanupUploads(),
                this.cleanupGenerated(),
                this.cleanupOrphanedFiles()
            ]);
            
            const duration = Date.now() - startTime;
            
            let totalDeleted = 0;
            results.forEach((result, index) => {
                const names = ['uploads', 'generated', 'orphaned'];
                if (result.status === 'fulfilled') {
                    totalDeleted += result.value.deleted;
                    console.log(`${names[index]} cleanup: ${result.value.deleted} items deleted`);
                } else {
                    console.error(`${names[index]} cleanup failed:`, result.reason);
                }
            });
            
            console.log(`Full cleanup completed: ${totalDeleted} total items deleted (${duration}ms)`);
            
            // Record metrics
            metricsCollector.recordPerformance('file_cleanup_full', duration, {
                total_deleted: totalDeleted
            });
            
            return {
                total_deleted: totalDeleted,
                duration,
                results
            };
            
        } catch (error) {
            console.error('Full cleanup failed:', error);
            metricsCollector.recordError(error, { context: 'full_cleanup' });
            throw error;
        }
    }
    
    async getCleanupStats() {
        try {
            const stats = {
                uploads: { count: 0, size: 0, oldest: null, newest: null },
                generated: { count: 0, sites: 0, oldest: null, newest: null },
                config: this.config,
                is_running: this.isRunning
            };
            
            // Upload stats
            try {
                const uploads = await fs.readdir(this.uploadsDir);
                stats.uploads.count = uploads.length;
                
                let totalSize = 0;
                let oldestTime = Date.now();
                let newestTime = 0;
                
                for (const file of uploads) {
                    try {
                        const filePath = path.join(this.uploadsDir, file);
                        const fileStats = await fs.stat(filePath);
                        totalSize += fileStats.size;
                        
                        const mtime = fileStats.mtime.getTime();
                        if (mtime < oldestTime) oldestTime = mtime;
                        if (mtime > newestTime) newestTime = mtime;
                    } catch (error) {
                        // Skip files we can't stat
                    }
                }
                
                stats.uploads.size = totalSize;
                if (uploads.length > 0) {
                    stats.uploads.oldest = new Date(oldestTime).toISOString();
                    stats.uploads.newest = new Date(newestTime).toISOString();
                }
            } catch (error) {
                console.warn('Failed to get upload stats:', error.message);
            }
            
            // Generated stats
            try {
                const userDirs = await fs.readdir(this.generatedDir);
                stats.generated.count = userDirs.length;
                
                let totalSites = 0;
                let oldestTime = Date.now();
                let newestTime = 0;
                
                for (const userDir of userDirs) {
                    try {
                        const userPath = path.join(this.generatedDir, userDir);
                        const userStats = await fs.stat(userPath);
                        if (!userStats.isDirectory()) continue;
                        
                        const sites = await fs.readdir(userPath);
                        totalSites += sites.length;
                        
                        for (const site of sites) {
                            try {
                                const sitePath = path.join(userPath, site);
                                const siteStats = await fs.stat(sitePath);
                                if (siteStats.isDirectory()) {
                                    const mtime = siteStats.mtime.getTime();
                                    if (mtime < oldestTime) oldestTime = mtime;
                                    if (mtime > newestTime) newestTime = mtime;
                                }
                            } catch (error) {
                                // Skip sites we can't stat
                            }
                        }
                    } catch (error) {
                        // Skip user dirs we can't read
                    }
                }
                
                stats.generated.sites = totalSites;
                if (totalSites > 0) {
                    stats.generated.oldest = new Date(oldestTime).toISOString();
                    stats.generated.newest = new Date(newestTime).toISOString();
                }
            } catch (error) {
                console.warn('Failed to get generated stats:', error.message);
            }
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get cleanup stats:', error);
            throw error;
        }
    }
}

// Create singleton instance
const fileCleanupManager = new FileCleanupManager();

module.exports = fileCleanupManager;