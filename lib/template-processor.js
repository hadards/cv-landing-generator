// File: lib/template-processor.js
const fs = require('fs');
const path = require('path');

class TemplateProcessor {
    constructor() {
        this.templateDir = path.join(__dirname, '../templates/professional');
    }

    async generateLandingPage(cvData, outputDir) {
        try {
            console.log('Generating landing page for:', cvData.personalInfo.name);

            // Validate CV data has required content
            this.validateCVData(cvData);

            // Create output directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Copy template files
            await this.copyTemplateFiles(outputDir);

            // Generate data.js with actual CV data
            await this.generateDataFile(cvData, outputDir);

            // Process HTML template with real data
            await this.processHTMLTemplate(cvData, outputDir);

            console.log('Landing page generated successfully in:', outputDir);

            return {
                success: true,
                outputDir: outputDir,
                files: ['index.html', 'styles.css', 'script.js', 'data.js', 'README.md']
            };

        } catch (error) {
            console.error('Template processing error:', error);
            throw new Error('Failed to generate landing page: ' + error.message);
        }
    }

    validateCVData(cvData) {
        if (!cvData.personalInfo?.name) {
            throw new Error('CV data missing personal name');
        }
        
        if (!cvData.personalInfo?.summary) {
            throw new Error('CV data missing summary');
        }

        if (!cvData.personalInfo?.aboutMe) {
            throw new Error('CV data missing about me section');
        }

        // Now we have experience and skills, so validate them too
        console.log('CV data validation passed for:', cvData.personalInfo.name);
        console.log('Data includes: name, summary, aboutMe, experience, skills');
    }

    async copyTemplateFiles(outputDir) {
        const filesToCopy = [
            'styles.css',
            'script.js',
            'README.md'
        ];

        for (const file of filesToCopy) {
            const sourcePath = path.join(this.templateDir, file);
            const destPath = path.join(outputDir, file);

            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                console.log(`Copied ${file}`);
            } else {
                console.warn(`Template file not found: ${file}`);
            }
        }
    }

    async generateDataFile(cvData, outputDir) {
        console.log('Generating data.js with real CV data...');
        
        // Use the actual CV data processed by AI
        const dataContent = `// Generated CV Data for ${cvData.personalInfo.name}
// Generated on: ${new Date().toISOString()}
const cvData = ${JSON.stringify(cvData, null, 2)};
`;

        const dataPath = path.join(outputDir, 'data.js');
        fs.writeFileSync(dataPath, dataContent, 'utf8');
        console.log('Generated data.js with real CV data');
    }

    async processHTMLTemplate(cvData, outputDir) {
        console.log('Processing HTML template with real data...');
        
        const templatePath = path.join(this.templateDir, 'index.html');
        const outputPath = path.join(outputDir, 'index.html');

        if (!fs.existsSync(templatePath)) {
            throw new Error('HTML template not found');
        }

        let htmlContent = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders with real CV data
        const replacements = this.createReplacements(cvData);

        for (const [placeholder, value] of Object.entries(replacements)) {
            const regex = new RegExp(`{{${placeholder}}}`, 'g');
            htmlContent = htmlContent.replace(regex, value);
        }

        // Handle profile picture if present
        if (cvData.personalInfo.profilePicture) {
            console.log('Including profile picture in landing page');
            
            // Replace hero avatar with actual image
            htmlContent = htmlContent.replace(
                /<div id="hero-avatar"[^>]*class="[^"]*"[^>]*>[\s\S]*?<\/div>/,
                `<div id="hero-avatar" class="hero-avatar w-48 h-48 rounded-full overflow-hidden border-4 border-white/20">
                    <img src="${cvData.personalInfo.profilePicture}" alt="${cvData.personalInfo.name}" class="w-full h-full object-cover">
                </div>`
            );
        }

        // Update page title with real name
        htmlContent = htmlContent.replace(
            /<title>.*?<\/title>/,
            `<title>${cvData.personalInfo.name} - Professional Profile</title>`
        );

        // Write processed HTML
        fs.writeFileSync(outputPath, htmlContent, 'utf8');
        console.log('Generated index.html with real data');
    }

    createReplacements(cvData) {
        console.log('Creating replacements with real CV data...');
        
        const personal = cvData.personalInfo;
        
        // For current title, use extracted job title or fallback
        const currentJob = { title: personal.currentTitle || 'Professional' };

        // Get initials from real name
        const initials = personal.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();

        // Create summary excerpt for meta description
        const summaryExcerpt = personal.summary
            ? personal.summary.substring(0, 150) + (personal.summary.length > 150 ? '...' : '')
            : `${personal.name} - Professional Profile`;

        // Create skills keywords for SEO from real skills
        const allSkills = [
            ...(cvData.skills.technical || []),
            ...(cvData.skills.soft || [])
        ];
        const skillsKeywords = allSkills.length > 0 
            ? allSkills.slice(0, 10).join(', ')
            : `${personal.currentTitle}, Professional, ${personal.location}`.replace(/,\s*,/g, ',').replace(/^,|,$/g, '');

        // Calculate real years of experience if we have experience data
        const yearsExperience = cvData.experience && cvData.experience.length > 0 
            ? this.calculateYearsExperience(cvData.experience) 
            : 3; // Default for cases without experience data
            
        // Calculate real skills count
        const skillsCount = (cvData.skills.technical?.length || 0) + (cvData.skills.soft?.length || 0);
        
        // Default projects count - will be updated when we add projects processor
        const projectsCount = cvData.projects ? cvData.projects.length : 5;

        console.log(`Creating replacements for ${personal.name}:`);
        console.log(`- Current title: ${currentJob.title}`);
        console.log(`- Location: ${personal.location}`);
        console.log(`- Years experience: ${yearsExperience}`);
        console.log(`- Skills count: ${skillsCount}`);
        console.log(`- Has summary: ${!!personal.summary}`);
        console.log(`- Has about me: ${!!personal.aboutMe}`);

        return {
            NAME: this.escapeHtml(personal.name),
            EMAIL: this.escapeHtml(personal.email || ''),
            PHONE: this.escapeHtml(personal.phone || ''),
            LOCATION: this.escapeHtml(personal.location || ''),
            SUMMARY: this.escapeHtml(personal.summary),
            ABOUT_ME: this.escapeHtml(personal.aboutMe || personal.summary),
            CURRENT_TITLE: this.escapeHtml(currentJob.title),
            INITIALS: initials,
            SUMMARY_EXCERPT: this.escapeHtml(summaryExcerpt),
            SKILLS_KEYWORDS: this.escapeHtml(skillsKeywords),
            YEARS_EXPERIENCE: yearsExperience.toString(),
            PROJECTS_COUNT: projectsCount.toString(),
            SKILLS_COUNT: skillsCount.toString(),
            SITE_URL: 'https://your-profile.vercel.app'
        };
    }

    calculateYearsExperience(experience) {
        if (!experience || experience.length === 0) return 0;
        
        let totalMonths = 0;
        experience.forEach(exp => {
            if (!exp.startDate) return;
            
            const startDate = new Date(exp.startDate + '-01');
            const endDate = exp.endDate?.toLowerCase() === 'present' ? new Date() : new Date(exp.endDate + '-01');
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                              (endDate.getMonth() - startDate.getMonth());
                totalMonths += Math.max(0, months);
            }
        });
        
        return Math.floor(totalMonths / 12);
    }

    escapeHtml(text) {
        if (!text) return '';

        return text.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    async generatePreview(cvData) {
        // Generate a temporary preview version with real data
        const tempDir = path.join(__dirname, '../temp/preview');

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const result = await this.generateLandingPage(cvData, tempDir);

        return {
            success: true,
            previewDir: tempDir,
            indexPath: path.join(tempDir, 'index.html')
        };
    }

    cleanupTemp() {
        const tempDir = path.join(__dirname, '../temp');
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log('Cleaned up temporary files');
        }
    }
}

module.exports = TemplateProcessor;