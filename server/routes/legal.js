// File: routes/legal.js - Legal documents API endpoints
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');

const router = express.Router();

// Configure marked for security
marked.setOptions({
    sanitize: false, // We control the markdown content
    gfm: true,
    breaks: true
});

/**
 * Get legal document content
 * @param {string} filename - Name of the legal document file
 * @returns {object} Document content and metadata
 */
const getLegalDocument = async (filename) => {
    try {
        const filePath = path.join(__dirname, '..', '..', `${filename}.md`);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Extract title and last updated from markdown content
        const lines = content.split('\n');
        let title = filename.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        let lastUpdated = null;
        
        // Look for title in first few lines
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('# ')) {
                title = line.substring(2).trim();
                break;
            }
        }
        
        // Look for last updated date
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (line.includes('Last Updated') || line.includes('last updated')) {
                const match = line.match(/(\w+ \d+, \d+)/);
                if (match) {
                    lastUpdated = match[1];
                }
                break;
            }
        }
        
        return {
            success: true,
            document: {
                filename,
                title,
                lastUpdated,
                content: content,
                html: marked(content)
            }
        };
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {
                success: false,
                error: 'Document not found',
                message: `Legal document '${filename}' does not exist`
            };
        }
        throw error;
    }
};

/**
 * GET /api/legal/terms
 * Get Terms of Service
 */
router.get('/terms', async (req, res) => {
    try {
        const result = await getLegalDocument('TERMS_OF_SERVICE');
        
        if (!result.success) {
            return res.status(404).json(result);
        }
        
        // Set appropriate headers for legal content
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        res.json(result);
        
    } catch (error) {
        console.error('Error serving Terms of Service:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to load Terms of Service'
        });
    }
});

/**
 * GET /api/legal/privacy
 * Get Privacy Policy
 */
router.get('/privacy', async (req, res) => {
    try {
        const result = await getLegalDocument('PRIVACY_POLICY');
        
        if (!result.success) {
            return res.status(404).json(result);
        }
        
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        res.json(result);
        
    } catch (error) {
        console.error('Error serving Privacy Policy:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to load Privacy Policy'
        });
    }
});

/**
 * GET /api/legal/disclaimer
 * Get Service Disclaimer
 */
router.get('/disclaimer', async (req, res) => {
    try {
        const result = await getLegalDocument('DISCLAIMER');
        
        if (!result.success) {
            return res.status(404).json(result);
        }
        
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        res.json(result);
        
    } catch (error) {
        console.error('Error serving Disclaimer:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to load Disclaimer'
        });
    }
});

/**
 * GET /api/legal/summary
 * Get summary of all legal documents with metadata
 */
router.get('/summary', async (req, res) => {
    try {
        const documents = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'DISCLAIMER'];
        const summary = {
            success: true,
            documents: [],
            experimental: true,
            freeTier: true,
            lastUpdated: null
        };
        
        for (const doc of documents) {
            try {
                const result = await getLegalDocument(doc);
                if (result.success) {
                    summary.documents.push({
                        type: doc.toLowerCase().replace('_', ''),
                        title: result.document.title,
                        lastUpdated: result.document.lastUpdated,
                        endpoint: `/api/legal/${doc.toLowerCase().replace('_of_service', '').replace('_policy', '').replace('disclaimer', 'disclaimer')}`
                    });
                    
                    // Track most recent update
                    if (result.document.lastUpdated) {
                        const docDate = new Date(result.document.lastUpdated);
                        const currentLatest = summary.lastUpdated ? new Date(summary.lastUpdated) : new Date(0);
                        if (docDate > currentLatest) {
                            summary.lastUpdated = result.document.lastUpdated;
                        }
                    }
                }
            } catch (error) {
                console.warn(`Failed to load document ${doc}:`, error.message);
            }
        }
        
        res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
        res.json(summary);
        
    } catch (error) {
        console.error('Error generating legal summary:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to generate legal document summary'
        });
    }
});

module.exports = router;