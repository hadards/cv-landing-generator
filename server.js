// File: server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const CVParser = require('./lib/cv-parser-modular');
const TemplateProcessor = require('./lib/template-processor');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is required for CV processing');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET is required for authentication');
    process.exit(1);
}

const templateProcessor = new TemplateProcessor();
const cvParser = new CVParser();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
        }
    }
});

// Create required directories
const uploadsDir = path.join(__dirname, 'uploads');
const generatedDir = path.join(__dirname, 'generated');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Store uploaded files info (in production, use database)
const uploadedFiles = new Map();
const generatedLandingPages = new Map();

// File upload handler
async function uploadHandler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const uploadedFile = req.file;
            
            if (!uploadedFile) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const fileInfo = {
                id: Date.now().toString(),
                originalName: uploadedFile.originalname,
                filename: uploadedFile.filename,
                path: uploadedFile.path,
                size: uploadedFile.size,
                mimetype: uploadedFile.mimetype,
                uploadedAt: new Date().toISOString(),
                userId: decoded.userId,
                status: 'uploaded'
            };

            // Store file info
            uploadedFiles.set(fileInfo.id, fileInfo);

            res.status(200).json({
                success: true,
                message: 'File uploaded successfully',
                file: fileInfo
            });

        } catch (jwtError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
}

// Process file handler with real CV parsing (NO MOCK DATA)
async function processFileHandler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { fileId } = req.body;
        
        if (!fileId) {
            res.status(400).json({ error: 'File ID is required' });
            return;
        }

        const fileInfo = uploadedFiles.get(fileId);
        if (!fileInfo) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        console.log('Processing CV file:', fileInfo.originalName);

        // Extract text from the uploaded file
        console.log('Extracting text from file...');
        const extractedText = await cvParser.extractTextFromFile(fileInfo.path, fileInfo.mimetype);
        console.log('Extracted text length:', extractedText.length);

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from the file');
        }

        // Structure the data with Gemini AI (REAL PROCESSING - Phase 1)
        console.log('Processing with Modular CV Parser (Phase 1: Personal Info + About Me)...');
        const structuredData = await cvParser.processCV(extractedText);
        console.log('Structured data generated for:', structuredData.personalInfo?.name);

        // Validate the structured data
        if (!structuredData.personalInfo?.name) {
            throw new Error('Unable to extract name from CV');
        }

        // Update file status
        fileInfo.status = 'processed';
        fileInfo.processedAt = new Date().toISOString();
        fileInfo.extractedText = extractedText;
        fileInfo.structuredData = structuredData;
        uploadedFiles.set(fileId, fileInfo);

        res.status(200).json({
            success: true,
            message: 'CV processed successfully',
            extractedText: extractedText,
            structuredData: structuredData,
            fileId: fileId,
            processedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('CV processing error:', error);
        res.status(500).json({
            error: 'CV processing failed',
            message: error.message
        });
    }
}

// Status check handler
async function statusHandler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { fileId } = req.query;
        
        if (!fileId) {
            res.status(400).json({ error: 'File ID is required' });
            return;
        }

        const fileInfo = uploadedFiles.get(fileId);
        if (!fileInfo) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        res.status(200).json({
            success: true,
            file: fileInfo
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Status check failed',
            message: error.message
        });
    }
}

// Auth handlers
async function loginHandler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { credential } = req.body;

        if (!credential) {
            res.status(400).json({ error: 'Google credential is required' });
            return;
        }

        // For development, accept mock credential
        if (credential === 'mock_google_jwt_token_for_testing') {
            const user = {
                id: 'mock_user_123',
                email: 'test@example.com',
                name: 'Test User',
                picture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGVzdCBVc2VyPC90ZXh0Pgo8L3N2Zz4K',
                verified: true
            };

            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(200).json({
                success: true,
                user: user,
                token: token,
                message: 'Login successful'
            });
        } else {
            // In production, verify with Google
            try {
                const ticket = await client.verifyIdToken({
                    idToken: credential,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });

                const payload = ticket.getPayload();
                
                if (!payload) {
                    res.status(400).json({ error: 'Invalid Google token' });
                    return;
                }

                const user = {
                    id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    picture: payload.picture,
                    verified: payload.email_verified
                };

                const token = jwt.sign(
                    { userId: user.id, email: user.email },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );

                res.status(200).json({
                    success: true,
                    user: user,
                    token: token,
                    message: 'Login successful'
                });
            } catch (googleError) {
                res.status(400).json({ error: 'Invalid Google credential' });
            }
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
}

async function logoutHandler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: error.message
        });
    }
}

async function userHandler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            res.status(200).json({
                success: true,
                user: {
                    id: decoded.userId,
                    email: decoded.email,
                    name: 'Test User',
                    picture: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSI4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGVzdCBVc2VyPC90ZXh0Pgo8L3N2Zz4K'
                }
            });
        } catch (jwtError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }

    } catch (error) {
        console.error('User info error:', error);
        res.status(500).json({
            error: 'Failed to get user info',
            message: error.message
        });
    }
}

async function healthHandler(req, res) {
    try {
        res.status(200).json({
            status: 'healthy',
            message: 'CV Landing Generator API is running',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            geminiConfigured: !!process.env.GEMINI_API_KEY
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

async function testHandler(req, res) {
    try {
        const { method, query, body } = req;

        res.status(200).json({
            message: 'Test endpoint working!',
            requestMethod: method,
            queryParams: query,
            requestBody: body,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
}

// Generate landing page handler - USE REAL CV DATA
async function generateLandingPageHandler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Verify user is authenticated
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const { structuredData } = req.body;
            
            if (!structuredData) {
                res.status(400).json({ error: 'Structured CV data is required' });
                return;
            }

            // Validate that this is real CV data, not mock
            if (!structuredData.personalInfo?.name || !structuredData.personalInfo?.email) {
                res.status(400).json({ error: 'Invalid CV data - missing required personal information' });
                return;
            }

            console.log('Generating landing page for:', structuredData.personalInfo.name);
            console.log('User ID:', decoded.userId);

            // Generate the landing page using REAL CV data
            const outputDir = path.join(__dirname, 'generated', decoded.userId, Date.now().toString());
            const result = await templateProcessor.generateLandingPage(structuredData, outputDir);

            // Store generation info
            const generationInfo = {
                id: Date.now().toString(),
                userId: decoded.userId,
                outputDir: outputDir,
                generatedAt: new Date().toISOString(),
                files: result.files,
                cvData: structuredData,
                personName: structuredData.personalInfo.name
            };

            // Store for later retrieval
            generatedLandingPages.set(generationInfo.id, generationInfo);

            console.log('Landing page generated successfully for:', structuredData.personalInfo.name);

            res.status(200).json({
                success: true,
                message: `Landing page generated successfully for ${structuredData.personalInfo.name}`,
                generation: generationInfo,
                previewUrl: `/preview/${generationInfo.id}`
            });

        } catch (jwtError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }

    } catch (error) {
        console.error('Landing page generation error:', error);
        res.status(500).json({
            error: 'Generation failed',
            message: error.message
        });
    }
}

// Preview handler
async function previewHandler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { previewId } = req.query;
        
        if (!previewId) {
            res.status(400).json({ error: 'Preview ID is required' });
            return;
        }

        const generationInfo = generatedLandingPages.get(previewId);
        
        if (!generationInfo) {
            res.status(404).json({ error: 'Preview not found' });
            return;
        }

        // Check if the generated files exist
        const indexPath = path.join(generationInfo.outputDir, 'index.html');
        
        if (!fs.existsSync(indexPath)) {
            res.status(404).json({ error: 'Generated files not found' });
            return;
        }

        res.status(200).json({
            success: true,
            message: `Preview ready for ${generationInfo.personName}`,
            previewId: previewId,
            generatedAt: generationInfo.generatedAt,
            files: generationInfo.files
        });

    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({
            error: 'Preview failed',
            message: error.message
        });
    }
}

// API routes
app.get('/api/health', healthHandler);
app.get('/api/test', testHandler);
app.post('/api/test', testHandler);

// Auth routes
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/logout', logoutHandler);
app.get('/api/auth/user', userHandler);

// File upload routes
app.post('/api/cv/upload', upload.single('cvFile'), uploadHandler);
app.post('/api/cv/process', processFileHandler);
app.get('/api/cv/status', statusHandler);

// Landing page generation routes
app.post('/api/cv/generate', generateLandingPageHandler);
app.get('/api/cv/preview', previewHandler);

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`CV Landing Generator API Server`);
    console.log(`=================================`);
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Upload: POST http://localhost:${PORT}/api/cv/upload`);
    console.log(`Process: POST http://localhost:${PORT}/api/cv/process`);
    console.log(`Generate: POST http://localhost:${PORT}/api/cv/generate`);
    console.log(`=================================`);
    console.log(`Gemini API: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`=================================`);
});