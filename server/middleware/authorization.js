// File: middleware/authorization.js
// Authorization middleware to prevent users from accessing other users' resources

const { getGeneratedSiteById } = require('../database/services');

/**
 * Middleware to check if user owns the requested resource
 * Checks database records to ensure user has access to the resource
 */
const authorizeResourceOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.userId || req.user.id;
            let resourceId;
            let resourceOwnerId;
            
            // Extract resource ID from different request locations
            if (req.params.id) {
                resourceId = req.params.id;
            } else if (req.query.previewId) {
                resourceId = req.query.previewId;
            } else if (req.query.generationId) {
                resourceId = req.query.generationId;
            } else if (req.body.jobId) {
                resourceId = req.body.jobId;
            }
            
            if (!resourceId) {
                return res.status(400).json({ error: 'Resource ID is required' });
            }
            
            // Check ownership based on resource type
            switch (resourceType) {
                case 'generated_site':
                    const siteRecord = await getGeneratedSiteById(resourceId);
                    if (!siteRecord) {
                        return res.status(404).json({ error: 'Resource not found' });
                    }
                    resourceOwnerId = siteRecord.user_id;
                    break;
                    
                default:
                    return res.status(500).json({ error: 'Unknown resource type' });
            }
            
            // Check if user owns the resource
            if (resourceOwnerId !== userId) {
                return res.status(403).json({ error: 'Access denied. You do not have permission to access this resource.' });
            }
            
            // User is authorized, continue
            next();
            
        } catch (error) {
            console.error('Authorization check error:', error);
            res.status(500).json({ error: 'Authorization check failed' });
        }
    };
};

/**
 * Middleware to check if user owns a file in the temporary cache
 */
const authorizeFileAccess = (fileCache) => {
    return (req, res, next) => {
        try {
            const userId = req.user.userId || req.user.id;
            const fileId = req.query.fileId || req.body.fileId;
            
            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' });
            }
            
            const fileInfo = fileCache.get(fileId);
            if (!fileInfo) {
                return res.status(404).json({ error: 'File not found' });
            }
            
            // Check if user owns the file
            const fileOwnerId = fileInfo.userId || fileInfo.user_id;
            if (fileOwnerId !== userId) {
                return res.status(403).json({ error: 'Access denied. You do not have permission to access this file.' });
            }
            
            next();
            
        } catch (error) {
            console.error('File authorization check error:', error);
            res.status(500).json({ error: 'File authorization check failed' });
        }
    };
};

module.exports = {
    authorizeResourceOwnership,
    authorizeFileAccess
};