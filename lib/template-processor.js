// File: lib/template-processor.js
const fs = require('fs');
const path = require('path');

class TemplateProcessor {
    constructor() {
        this.templateDir = path.join(__dirname, '../templates/professional');
    }

    async generateLandingPage(cvData, outputDir) {
        try {
            console.log('Generating landing page with data:', cvData.personalInfo.name);

            // Create output directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Copy template files
            await this.copyTemplateFiles(outputDir);

            // Generate data.js with actual CV data
            await this.generateDataFile(cvData, outputDir);

            // Process HTML template with placeholders
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
        // Generate the data.js file with actual CV data
        const dataContent = `// Generated CV Data
const cvData = ${JSON.stringify(cvData, null, 2)};
`;

        const dataPath = path.join(outputDir, 'data.js');
        fs.writeFileSync(dataPath, dataContent, 'utf8');
        console.log('Generated data.js');
    }

    async processHTMLTemplate(cvData, outputDir) {
        const templatePath = path.join(this.templateDir, 'index.html');
        const outputPath = path.join(outputDir, 'index.html');

        if (!fs.existsSync(templatePath)) {
            throw new Error('HTML template not found');
        }

        let htmlContent = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders in HTML
        const replacements = this.createReplacements(cvData);

        for (const [placeholder, value] of Object.entries(replacements)) {
            const regex = new RegExp(`{{${placeholder}}}`, 'g');
            htmlContent = htmlContent.replace(regex, value);
        }

        // Handle profile picture in the template
        if (cvData.personalInfo.profilePicture) {
            // Replace avatar placeholders with actual image
            htmlContent = htmlContent.replace(
                /class="w-48 h-48 rounded-full bg-white\/10[^"]*"[^>]*>{{INITIALS}}</,
                `class="w-48 h-48 rounded-full object-cover border-4 border-white/20"><img src="${cvData.personalInfo.profilePicture}" alt="${cvData.personalInfo.name}" class="w-full h-full rounded-full object-cover">`
            );

            // Update header avatar too
            htmlContent = htmlContent.replace(
                /<div id="header-avatar"[^>]*>[\s\S]*?<\/div>/,
                `<div id="header-avatar" class="w-10 h-10 rounded-full overflow-hidden">
        <img src="${cvData.personalInfo.profilePicture}" alt="${cvData.personalInfo.name}" class="w-full h-full object-cover">
      </div>`
            );
        }

        // Write processed HTML
        fs.writeFileSync(outputPath, htmlContent, 'utf8');
        console.log('Generated index.html');
    }

    createReplacements(cvData) {
        const personal = cvData.personalInfo;
        const currentJob = cvData.experience.length > 0 ? cvData.experience[0] : {};

        // Get initials
        const initials = personal.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();

        // Create summary excerpt for meta description
        const summaryExcerpt = personal.summary
            ? personal.summary.substring(0, 150) + (personal.summary.length > 150 ? '...' : '')
            : `${personal.name} - Professional Profile`;

        // Create skills keywords for SEO
        const skillsKeywords = [
            ...cvData.skills.technical.slice(0, 10),
            ...cvData.skills.soft.slice(0, 5)
        ].join(', ');

        // Calculate years of experience
        const yearsExperience = this.calculateYearsExperience(cvData.experience);

        // Count projects and skills
        const projectsCount = cvData.projects ? cvData.projects.length : 0;
        const skillsCount = (cvData.skills.technical?.length || 0) + (cvData.skills.soft?.length || 0);

        return {
            NAME: this.escapeHtml(personal.name),
            EMAIL: this.escapeHtml(personal.email),
            PHONE: this.escapeHtml(personal.phone),
            LOCATION: this.escapeHtml(personal.location),
            SUMMARY: this.escapeHtml(personal.summary),
            ABOUT_ME: this.escapeHtml(personal.aboutMe || personal.summary),
            CURRENT_TITLE: this.escapeHtml(currentJob.title || 'Professional'),
            INITIALS: initials,
            SUMMARY_EXCERPT: this.escapeHtml(summaryExcerpt),
            SKILLS_KEYWORDS: this.escapeHtml(skillsKeywords),
            YEARS_EXPERIENCE: yearsExperience.toString(),
            PROJECTS_COUNT: projectsCount.toString(),
            SKILLS_COUNT: skillsCount.toString(),
            SITE_URL: 'https://your-username.vercel.app' // Will be updated with actual URL
        };
    }

    calculateYearsExperience(experience) {
        if (!experience || experience.length === 0) return 0;
        
        let totalMonths = 0;
        experience.forEach(exp => {
            const startDate = new Date(exp.startDate + '-01');
            const endDate = exp.endDate?.toLowerCase() === 'present' ? new Date() : new Date(exp.endDate + '-01');
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                              (endDate.getMonth() - startDate.getMonth());
                totalMonths += months;
            }
        });
        
        return Math.floor(totalMonths / 12);
    }

    escapeHtml(text) {
        if (!text) return '';

        const div = { innerHTML: '' };
        div.textContent = text;
        return div.innerHTML || text.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    async generatePreview(cvData) {
        // Generate a temporary preview version
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