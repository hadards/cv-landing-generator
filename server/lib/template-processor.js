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
            console.log('Has edited content?', !!cvData._hasEditedContent);

            // Validate CV data has required content
            this.validateCVData(cvData);

            // Create output directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Copy template files
            await this.copyTemplateFiles(outputDir);

            // Generate data.js with EDITED CV data (this is the key fix!)
            await this.generateDataFileWithEditedContent(cvData, outputDir);

            // Process HTML template with edited data
            await this.processHTMLTemplate(cvData, outputDir);

            console.log('Landing page generated successfully with edited content in:', outputDir);

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

        console.log('CV data validation passed for:', cvData.personalInfo.name);
        console.log('Includes edited content:', !!cvData._hasEditedContent);
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

    async generateDataFileWithEditedContent(cvData, outputDir) {
        console.log('Generating data.js with edited content...');

        // Build the final CV data structure using edited content where available
        const finalCvData = this.buildFinalDataStructure(cvData);

        const dataContent = `// Generated CV Data for ${cvData.personalInfo.name}
// Generated on: ${new Date().toISOString()}
// Contains user-edited content
const cvData = ${JSON.stringify(finalCvData, null, 2)};
`;

        const dataPath = path.join(outputDir, 'data.js');
        fs.writeFileSync(dataPath, dataContent, 'utf8');
        console.log('Generated data.js with edited content');
    }

    buildFinalDataStructure(cvData) {
        console.log('Building final data structure with edited content...');

        // Start with basic structure
        const finalData = {
            personalInfo: {
                name: cvData.personalInfo.name,
                email: cvData.personalInfo.email,
                phone: cvData.personalInfo.phone,
                location: cvData.personalInfo.location,
                currentTitle: cvData.personalInfo.currentTitle,
                profilePicture: cvData.personalInfo.profilePicture,
                summary: cvData.personalInfo.summary,
                aboutMe: cvData.personalInfo.aboutMe
            },
            // Default to original structured data
            experience: cvData.experience || [],
            skills: cvData.skills || { technical: [], soft: [], languages: [] },
            education: cvData.education || [],
            projects: cvData.projects || [],
            certifications: cvData.certifications || []
        };

        // OVERRIDE with edited content if available
        if (cvData._hasEditedContent) {
            console.log('Using edited content for sections...');

            // Convert edited text back to structured data for the template
            if (cvData.experienceText) {
                finalData.experience = this.convertTextToExperience(cvData.experienceText);
                console.log('Used edited experience text');
            }

            if (cvData.skillsText) {
                finalData.skills = this.convertTextToSkills(cvData.skillsText);
                console.log('Used edited skills text');
            }

            if (cvData.educationText) {
                finalData.education = this.convertTextToEducation(cvData.educationText);
                console.log('Used edited education text');
            }

            if (cvData.projectsText) {
                finalData.projects = this.convertTextToProjects(cvData.projectsText);
                console.log('Used edited projects text');
            }

            if (cvData.certificationsText) {
                finalData.certifications = this.convertTextToCertifications(cvData.certificationsText);
                console.log('Used edited certifications text');
            }
        }

        console.log('Final data structure built with edited content');
        return finalData;
    }

    // Helper methods to convert edited text back to structured data
    convertTextToExperience(experienceText) {
        console.log('Converting experience text to structured data...');
        console.log('Input text length:', experienceText.length);

        // Split by double newlines first to separate different jobs
        let jobSections = experienceText.split('\n\n').filter(section => section.trim());

        // If no double newlines, try to split by job indicators
        if (jobSections.length === 1) {
            // Look for patterns that indicate new jobs
            const jobPatterns = [
                /^(.+?)\s+at\s+(.+?)$/gm,  // "Title at Company"
                /^(.+?)\s+-\s+(.+?)$/gm,   // "Title - Company"
                /^\d{4}[\s\-]+/gm,         // Lines starting with years
            ];

            // Try to split by lines that start with job titles
            const lines = experienceText.split('\n');
            let currentJob = [];
            const jobs = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Check if this line looks like a new job title
                const isNewJob = (
                    (line.includes(' at ') || line.includes(' - ')) &&
                    !line.toLowerCase().includes('achievement') &&
                    !line.toLowerCase().includes('responsibility') &&
                    !line.startsWith('•') &&
                    !line.startsWith('-') &&
                    line.length > 10 &&
                    line.length < 100
                );

                if (isNewJob && currentJob.length > 0) {
                    // Save previous job
                    jobs.push(currentJob.join('\n'));
                    currentJob = [line];
                } else {
                    currentJob.push(line);
                }
            }

            // Add the last job
            if (currentJob.length > 0) {
                jobs.push(currentJob.join('\n'));
            }

            jobSections = jobs;
        }

        console.log(`Found ${jobSections.length} job sections`);

        const experiences = jobSections.map((jobText, index) => {
            const lines = jobText.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length === 0) return null;

            console.log(`Processing job ${index + 1}:`, lines[0]);

            // First line should contain title and company
            const titleLine = lines[0];
            let title = 'Position';
            let company = 'Company';
            let location = '';
            let startDate = '';
            let endDate = '';
            let description = '';
            let achievements = [];

            // Parse title and company from first line
            if (titleLine.includes(' at ')) {
                const parts = titleLine.split(' at ');
                title = parts[0].trim();
                company = parts.slice(1).join(' at ').trim();
            } else if (titleLine.includes(' - ')) {
                const parts = titleLine.split(' - ');
                title = parts[0].trim();
                company = parts.slice(1).join(' - ').trim();
            } else {
                // If no clear separator, use the whole line as title
                title = titleLine;
            }

            // Process remaining lines
            let descriptionLines = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];

                // Check if line contains dates
                if (line.match(/\d{4}/) && (line.includes('-') || line.includes('to') || line.includes('Present'))) {
                    // Parse dates
                    const dateMatch = line.match(/(\d{4}(?:-\d{2})?)\s*[-–to]\s*(\d{4}(?:-\d{2})?|Present)/i);
                    if (dateMatch) {
                        startDate = dateMatch[1];
                        endDate = dateMatch[2];
                        console.log(`Extracted dates: ${startDate} - ${endDate}`);
                    }
                }
                // Check if line looks like location
                else if (line.includes(',') && line.length < 50 && !line.includes('.')) {
                    location = line;
                }
                // Check if line is an achievement (starts with bullet or dash)
                else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                    achievements.push(line.replace(/^[•\-*]\s*/, ''));
                }
                // Otherwise, it's part of the description
                else {
                    descriptionLines.push(line);
                }
            }

            description = descriptionLines.join(' ').trim();

            // If no description from lines, use a default
            if (!description && achievements.length > 0) {
                description = achievements[0];
                achievements = achievements.slice(1);
            }

            const experience = {
                title: title,
                company: company,
                location: location,
                startDate: startDate,
                endDate: endDate || 'Present',
                description: description || `Worked as ${title} at ${company}`,
                achievements: achievements
            };

            console.log(`Created experience:`, {
                title: experience.title,
                company: experience.company,
                dates: `${experience.startDate} - ${experience.endDate}`
            });

            return experience;
        }).filter(exp => exp !== null);

        console.log(`Successfully converted ${experiences.length} experience entries`);
        return experiences;
    }

    convertTextToSkills(skillsText) {
        const skills = { technical: [], soft: [], languages: [] };
        const sections = skillsText.split('\n\n');

        sections.forEach(section => {
            const lines = section.split('\n');
            const header = lines[0]?.toLowerCase() || '';
            const skillsList = lines.slice(1).join(' ').split(',').map(s => s.trim()).filter(s => s);

            if (header.includes('technical')) {
                skills.technical = skillsList;
            } else if (header.includes('professional') || header.includes('soft')) {
                skills.soft = skillsList;
            } else if (header.includes('language')) {
                skills.languages = skillsList;
            }
        });

        return skills;
    }

    convertTextToEducation(educationText) {
        const educationEntries = educationText.split('\n\n').filter(entry => entry.trim());

        return educationEntries.map(entryText => {
            const lines = entryText.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length === 0) return null;

            const firstLine = lines[0];
            const [degree, institution] = firstLine.includes(' from ') ? firstLine.split(' from ') : [firstLine, ''];

            return {
                degree: degree,
                institution: institution,
                location: '',
                graduationDate: '',
                gpa: '',
                achievements: []
            };
        }).filter(entry => entry !== null);
    }

    convertTextToProjects(projectsText) {
        const projectEntries = projectsText.split('\n\n').filter(entry => entry.trim());

        return projectEntries.map(entryText => {
            const lines = entryText.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length === 0) return null;

            const name = lines[0];
            const description = lines.slice(1).join(' ');

            return {
                name: name,
                description: description,
                technologies: [],
                url: ''
            };
        }).filter(entry => entry !== null);
    }

    convertTextToCertifications(certificationsText) {
        const certEntries = certificationsText.split('\n\n').filter(entry => entry.trim());

        return certEntries.map(entryText => {
            const lines = entryText.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length === 0) return null;

            const firstLine = lines[0];
            const [name, issuer] = firstLine.includes(' - ') ? firstLine.split(' - ') : [firstLine, ''];

            return {
                name: name,
                issuer: issuer,
                date: '',
                url: ''
            };
        }).filter(entry => entry !== null);
    }

    async processHTMLTemplate(cvData, outputDir) {
        console.log('Processing HTML template with edited data...');

        const templatePath = path.join(this.templateDir, 'index.html');
        const outputPath = path.join(outputDir, 'index.html');

        if (!fs.existsSync(templatePath)) {
            throw new Error('HTML template not found');
        }

        let htmlContent = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders with real CV data (using edited content)
        const replacements = this.createReplacements(cvData);

        for (const [placeholder, value] of Object.entries(replacements)) {
            const regex = new RegExp(`{{${placeholder}}}`, 'g');
            htmlContent = htmlContent.replace(regex, value);
        }

        // Handle profile picture if present
        if (cvData.personalInfo.profilePicture) {
            console.log('Including profile picture in landing page');

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
        console.log('Generated index.html with edited data');
    }

    createReplacements(cvData) {
        console.log('Creating replacements with edited content...');

        const personal = cvData.personalInfo;
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


        console.log(`Creating replacements for ${personal.name}:`);
        console.log(`- Current title: ${currentJob.title}`);
        console.log(`- Location: ${personal.location}`);
        console.log(`- Years experience: ${yearsExperience}`);
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
            SITE_URL: 'https://your-profile.vercel.app'
        };
    }

    calculateYearsExperience(experience) {
        if (!experience || experience.length === 0) return 0;

        let totalMonths = 0;

        experience.forEach(exp => {
            if (!exp.startDate) {
                console.warn(`No start date for ${exp.title}, skipping`);
                return;
            }

            // Parse start date - handle both YYYY and YYYY-MM formats
            let startDate;
            if (exp.startDate.includes('-')) {
                startDate = new Date(exp.startDate + '-01');
            } else if (exp.startDate.length === 4) {
                startDate = new Date(exp.startDate + '-01-01');
            } else {
                console.warn(`Invalid start date format: ${exp.startDate}`);
                return;
            }

            // Parse end date
            let endDate;
            if (exp.endDate && exp.endDate.toLowerCase() === 'present') {
                endDate = new Date();
            } else if (exp.endDate) {
                if (exp.endDate.includes('-')) {
                    endDate = new Date(exp.endDate + '-01');
                } else if (exp.endDate.length === 4) {
                    endDate = new Date(exp.endDate + '-01-01');
                } else {
                    console.warn(`Invalid end date format: ${exp.endDate}`);
                    return;
                }
            } else {
                console.warn(`No end date for ${exp.title}, skipping`);
                return;
            }

            // Validate dates
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn(`Invalid dates for ${exp.title}: ${exp.startDate} - ${exp.endDate}`);
                return;
            }

            // Ensure end date is not before start date
            if (endDate < startDate) {
                console.warn(`End date before start date for ${exp.title}, skipping`);
                return;
            }

            // Calculate months for this position
            const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                (endDate.getMonth() - startDate.getMonth());

            if (monthsDiff > 0) {
                totalMonths += monthsDiff;
                console.log(`${exp.title} at ${exp.company}: ${monthsDiff} months (${exp.startDate} - ${exp.endDate})`);
            } else {
                console.warn(`Negative or zero months for ${exp.title}: ${monthsDiff}`);
            }
        });

        const years = Math.floor(totalMonths / 12);
        console.log(`Total experience calculation: ${totalMonths} months = ${years} years`);

        // Cap at reasonable maximum (e.g., 50 years)
        return Math.min(years, 50);
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