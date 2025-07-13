// File: api/cv/preview.js
const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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

    // In production, you'd get this from your database
    // For now, we'll use the same storage as the main server
    const generationInfo = getGenerationInfo(previewId); // You'll need to implement this
    
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

    // Read the HTML file
    const htmlContent = fs.readFileSync(indexPath, 'utf8');

    // Return HTML directly for preview
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      error: 'Preview failed',
      message: error.message
    });
  }
}

// File: api/cv/download.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { generationId } = req.query;
    
    if (!generationId) {
      res.status(400).json({ error: 'Generation ID is required' });
      return;
    }

    // Get generation info
    const generationInfo = getGenerationInfo(generationId);
    
    if (!generationInfo) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    const outputDir = generationInfo.outputDir;
    
    if (!fs.existsSync(outputDir)) {
      res.status(404).json({ error: 'Generated files not found' });
      return;
    }

    // Create ZIP file
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const personName = generationInfo.personName || 'landing-page';
    const zipFileName = `${personName.replace(/\s+/g, '-').toLowerCase()}-landing-page.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    archive.pipe(res);

    // Add all files from the generated directory
    const filesToInclude = ['index.html', 'styles.css', 'script.js', 'data.js', 'README.md'];
    
    filesToInclude.forEach(fileName => {
      const filePath = path.join(outputDir, fileName);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: fileName });
      }
    });

    // Add any assets if they exist
    const assetsDir = path.join(outputDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      archive.directory(assetsDir, 'assets');
    }

    await archive.finalize();

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
}

// Helper function to get generation info (you'll need to implement this based on your storage)
function getGenerationInfo(id) {
  // This should connect to your actual storage system
  // For now, return a mock structure
  return {
    id: id,
    outputDir: path.join(__dirname, '../../generated', 'user123', id),
    personName: 'John Doe',
    generatedAt: new Date().toISOString(),
    files: ['index.html', 'styles.css', 'script.js', 'data.js', 'README.md']
  };
}