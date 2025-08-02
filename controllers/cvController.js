// File: controllers/cvController.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { randomUUID } = require('crypto');

const IntelligentCVProcessor = require('../lib/intelligent-cv-processor-gemini');
const TemplateProcessor = require('../lib/template-processor');
const { 
    saveFileUpload, 
    getFileUploadById, 
    updateFileUpload,
    saveGeneratedSite,
    getGeneratedSiteById,
    updateSiteDeployment,
    getUserSites,
    logProcessing 
} = require('../database/services');

// Initialize services
const templateProcessor = new TemplateProcessor();
const intelligentProcessor = new IntelligentCVProcessor();

class CVController {
    
    // Upload CV file
    static async uploadFile(req, res) {
        try {
            const uploadedFile = req.file;
            
            if (!uploadedFile) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const fileInfo = {
                id: randomUUID(),
                user_id: req.user.userId,
                filename: uploadedFile.originalname,
                filepath: uploadedFile.path,
                file_size: uploadedFile.size,
                mime_type: uploadedFile.mimetype,
                extracted_text: null,
                structured_data: null
            };

            // Store file info in database
            await saveFileUpload(fileInfo);
            
            // Log the operation
            await logProcessing(req.user.userId, 'file_upload', 'success');

            res.status(200).json({
                success: true,
                message: 'File uploaded successfully',
                file: {
                    id: fileInfo.id,
                    originalName: uploadedFile.originalname,
                    filename: uploadedFile.filename,
                    path: uploadedFile.path,
                    size: uploadedFile.size,
                    mimetype: uploadedFile.mimetype,
                    uploadedAt: new Date().toISOString(),
                    userId: req.user.userId,
                    status: 'uploaded'
                }
            });

        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({
                error: 'Upload failed',
                message: error.message
            });
        }
    }

    // Process CV file with AI
    static async processFile(req, res) {
        try {
            const { fileId } = req.body;
            
            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' });
            }

            const fileInfo = await getFileUploadById(fileId);
            if (!fileInfo) {
                return res.status(404).json({ error: 'File not found' });
            }

            console.log('Processing CV file:', fileInfo.filename);

            // Extract text from the uploaded file
            console.log('Extracting text from file...');
            const extractedText = await intelligentProcessor.extractTextFromFile(fileInfo.filepath, fileInfo.mime_type);
            console.log('Extracted text length:', extractedText.length);

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text could be extracted from the file');
            }

            // Structure the data with Intelligent CV Processor + Memory
            console.log('Processing with Intelligent CV Processor (Gemini + Memory)...');
            const structuredData = await intelligentProcessor.processCV(extractedText, req.user.userId);
            console.log('✅ Intelligent processing completed for:', structuredData.personalInfo?.name);

            // Validate the structured data
            if (!structuredData.personalInfo?.name) {
                throw new Error('Unable to extract name from CV');
            }

            // Update file in database
            await updateFileUpload(fileId, {
                extracted_text: extractedText,
                structured_data: structuredData
            });
            
            // Log the processing
            await logProcessing(req.user.userId, 'cv_processing', 'success');

            res.status(200).json({
                success: true,
                message: 'CV processed with Intelligent Processor (Gemini + Memory)',
                extractedText: extractedText,
                structuredData: structuredData,
                fileId: fileId,
                processedAt: new Date().toISOString(),
                processingMetadata: {
                    processor: 'IntelligentCVProcessorGemini',
                    sessionMemoryUsed: structuredData.processingMetadata?.sessionMemoryUsed,
                    llmProvider: structuredData.processingMetadata?.llmProvider,
                    stepsCompleted: structuredData.processingInfo?.stepsCompleted,
                    profession: structuredData.processingInfo?.profession,
                    experienceLevel: structuredData.processingInfo?.experienceLevel
                }
            });

        } catch (error) {
            console.error('CV processing error:', error);
            res.status(500).json({
                error: 'CV processing failed',
                message: error.message
            });
        }
    }

    // Get file processing status
    static async getFileStatus(req, res) {
        try {
            const { fileId } = req.query;
            
            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' });
            }

            const fileInfo = await getFileUploadById(fileId);
            if (!fileInfo) {
                return res.status(404).json({ error: 'File not found' });
            }

            // Convert to expected format
            const responseFile = {
                id: fileInfo.id,
                originalName: fileInfo.filename,
                filename: fileInfo.filename,
                path: fileInfo.filepath,
                size: fileInfo.file_size,
                mimetype: fileInfo.mime_type,
                uploadedAt: fileInfo.created_at,
                userId: fileInfo.user_id,
                status: fileInfo.extracted_text ? 'processed' : 'uploaded',
                extractedText: fileInfo.extracted_text,
                structuredData: fileInfo.structured_data
            };

            res.status(200).json({
                success: true,
                file: responseFile
            });

        } catch (error) {
            console.error('Status check error:', error);
            res.status(500).json({
                error: 'Status check failed',
                message: error.message
            });
        }
    }

    // Generate landing page from CV data
    static async generateLandingPage(req, res) {
        try {
            const { structuredData } = req.body;
            
            if (!structuredData) {
                return res.status(400).json({ error: 'Structured CV data is required' });
            }

            // Validate that this is real CV data, not mock
            if (!structuredData.personalInfo?.name || !structuredData.personalInfo?.email) {
                return res.status(400).json({ error: 'Invalid CV data - missing required personal information' });
            }

            console.log('Generating landing page for:', structuredData.personalInfo.name);
            console.log('User ID:', req.user.userId);

            // Generate unique ID for this generation
            const generationId = randomUUID();
            
            // Generate the landing page using real CV data
            const outputDir = path.join(__dirname, '../generated', req.user.userId, generationId.replace(/-/g, ''));
            const result = await templateProcessor.generateLandingPage(structuredData, outputDir);

            // Store generation info in database
            const generationInfo = {
                id: generationId,
                user_id: req.user.userId,
                name: structuredData.personalInfo.name,
                structured_data: structuredData,
                html_content: result.files.find(f => f.endsWith('index.html')) ? fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8') : null,
                css_content: result.files.find(f => f.endsWith('styles.css')) ? fs.readFileSync(path.join(outputDir, 'styles.css'), 'utf8') : null,
                folder_path: outputDir
            };

            // Save to database
            await saveGeneratedSite(generationInfo);
            
            // Log the generation
            await logProcessing(req.user.userId, 'landing_page_generation', 'success');

            console.log('Landing page generated successfully for:', structuredData.personalInfo.name);

            res.status(200).json({
                success: true,
                message: `Landing page generated successfully for ${structuredData.personalInfo.name}`,
                generation: {
                    id: generationInfo.id,
                    userId: req.user.userId,
                    outputDir: outputDir,
                    generatedAt: new Date().toISOString(),
                    files: result.files,
                    cvData: structuredData,
                    personName: structuredData.personalInfo.name
                },
                previewUrl: `/preview/${generationInfo.id}`
            });

        } catch (error) {
            console.error('Landing page generation error:', error);
            res.status(500).json({
                error: 'Generation failed',
                message: error.message
            });
        }
    }

    // Preview generated landing page
    static async previewLandingPage(req, res) {
        try {
            const { previewId } = req.query;
            
            if (!previewId) {
                return res.status(400).json({ error: 'Preview ID is required' });
            }

            console.log('Loading preview for ID:', previewId);

            // Get generation info from database
            const siteInfo = await getGeneratedSiteById(previewId);
            
            if (!siteInfo) {
                return res.status(404).json({ error: 'Preview not found' });
            }
            
            const outputDir = siteInfo.folder_path;
            const generationInfo = {
                personName: siteInfo.name
            };
            const indexPath = path.join(outputDir, 'index.html');
            
            if (!fs.existsSync(indexPath)) {
                return res.status(404).json({ error: 'Generated files not found' });
            }

            // Read the HTML file
            let htmlContent = fs.readFileSync(indexPath, 'utf8');

            // Update relative paths to work with our static file server
            const baseUrl = `${req.protocol}://${req.get('host')}/api/cv/static?previewId=${previewId}&file=`;
            
            // Replace CSS and JS references
            htmlContent = htmlContent.replace(
                /href="styles\.css"/g, 
                `href="${baseUrl}styles.css"`
            );
            
            htmlContent = htmlContent.replace(
                /src="data\.js"/g, 
                `src="${baseUrl}data.js"`
            );
            
            htmlContent = htmlContent.replace(
                /src="script\.js"/g, 
                `src="${baseUrl}script.js"`
            );

            // Set proper headers
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            
            console.log('Serving preview HTML for:', generationInfo.personName);
            res.status(200).send(htmlContent);

        } catch (error) {
            console.error('Preview error:', error);
            res.status(500).json({
                error: 'Preview failed',
                message: error.message
            });
        }
    }

    // Serve static files for preview
    static async serveStaticFile(req, res) {
        try {
            const { previewId, file } = req.query;
            
            if (!previewId || !file) {
                return res.status(400).json({ error: 'Preview ID and file name are required' });
            }

            console.log('Serving static file:', file, 'for preview:', previewId);

            // Get generation info from database
            const siteInfo = await getGeneratedSiteById(previewId);
            
            if (!siteInfo) {
                return res.status(404).json({ error: 'Preview not found' });
            }

            const filePath = path.join(siteInfo.folder_path, file);
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            // Set content type based on file extension
            const ext = path.extname(file).toLowerCase();
            const contentTypes = {
                '.css': 'text/css; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.html': 'text/html; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg'
            };

            const contentType = contentTypes[ext] || 'text/plain';

            // Read and serve the file
            const fileContent = fs.readFileSync(filePath);
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-cache');
            
            console.log('Served static file:', file, 'type:', contentType);
            res.status(200).send(fileContent);

        } catch (error) {
            console.error('Static file error:', error);
            res.status(500).json({
                error: 'File serving failed',
                message: error.message
            });
        }
    }

    // Download landing page as ZIP
    static async downloadLandingPage(req, res) {
        try {
            const { generationId } = req.query;
            
            if (!generationId) {
                return res.status(400).json({ error: 'Generation ID is required' });
            }

            console.log('Download requested for generation:', generationId);

            const siteInfo = await getGeneratedSiteById(generationId);
            
            if (!siteInfo) {
                return res.status(404).json({ error: 'Generation not found' });
            }

            const outputDir = siteInfo.folder_path;
            const generationInfo = {
                personName: siteInfo.name
            };
            
            if (!fs.existsSync(outputDir)) {
                return res.status(404).json({ error: 'Generated files not found' });
            }

            // Create ZIP file name
            const personName = generationInfo.personName || 'landing-page';
            const cleanName = personName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            const zipFileName = `${cleanName}-landing-page.zip`;

            // Set download headers
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
            res.setHeader('Cache-Control', 'no-cache');

            // Create ZIP archive
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            // Handle archive errors
            archive.on('error', (err) => {
                console.error('Archive error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to create archive' });
                }
            });

            // Pipe archive to response
            archive.pipe(res);

            // Add files to archive
            const filesToInclude = ['index.html', 'styles.css', 'script.js', 'data.js'];
            
            filesToInclude.forEach(fileName => {
                const filePath = path.join(outputDir, fileName);
                if (fs.existsSync(filePath)) {
                    console.log(`Adding ${fileName} to archive`);
                    archive.file(filePath, { name: fileName });
                }
            });

            // Add README file
            const readmePath = path.join(outputDir, 'README.md');
            if (fs.existsSync(readmePath)) {
                archive.file(readmePath, { name: 'README.md' });
            }

            // Finalize the archive
            console.log('Finalizing archive...');
            await archive.finalize();
            
            console.log(`Download completed: ${zipFileName}`);

        } catch (error) {
            console.error('Download error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Download failed',
                    message: error.message
                });
            }
        }
    }

    // Get uploaded files for user (for dashboard)
    static async getUploadedFiles(userId) {
        // This would need implementation in database services if needed
        return [];
    }

    // Get generated landing pages for user (for dashboard)
    static async getGeneratedLandingPages(userId) {
        return await getUserSites(userId);
    }
}

module.exports = CVController;