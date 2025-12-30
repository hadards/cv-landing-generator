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
                // Pass original structured data as reference for better parsing
                finalData.experience = this.convertTextToExperience(
                    cvData.experienceText,
                    cvData.experience || []
                );
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
    convertTextToExperience(experienceText, originalExperience = []) {
        console.log('Converting experience text to structured data...');
        console.log('Input text length:', experienceText.length);
        console.log('Has original structured data:', originalExperience.length > 0);

        // If we have original structured data and it matches the text length, use it!
        if (originalExperience.length > 0) {
            console.log(`Using original structured data as reference (${originalExperience.length} jobs)`);

            // Just parse achievements from the text, keep the structured title/company/dates
            const lines = experienceText.split('\n').map(line => line.trim()).filter(line => line);
            console.log(`Total lines after filtering: ${lines.length}`);
            if (lines.length > 0) {
                console.log(`First line: "${lines[0].substring(0, 100)}"`);
                console.log(`Second line: "${lines[1]?.substring(0, 100) || 'N/A'}"`);
            }

            // Find job headers (lines with dates)
            const jobBoundaries = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const hasDatePattern = /\d{1,2}\/\d{4}|\d{4}/.test(line);
                const notBullet = !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*');
                const notHeader = !line.toLowerCase().includes('key achievement');
                const isLong = line.length > 20;

                if (i < 5) {
                    console.log(`Line ${i} (len=${line.length}): date=${hasDatePattern} bullet=${!notBullet} header=${!notHeader} => ${hasDatePattern && notBullet && notHeader && isLong ? 'MATCH' : 'skip'}`);
                }

                if (hasDatePattern && notBullet && notHeader && line.length > 20) {
                    jobBoundaries.push(i);
                }
            }

            console.log(`Found ${jobBoundaries.length} job sections in text at lines:`, jobBoundaries);

            // If we found NO boundaries, just use original structured data as-is
            if (jobBoundaries.length === 0) {
                console.log('No job boundaries found in text - using original structured data as-is');
                return originalExperience;
            }

            const result = [];
            for (let i = 0; i < Math.min(jobBoundaries.length, originalExperience.length); i++) {
                const startIdx = jobBoundaries[i];
                const endIdx = i < jobBoundaries.length - 1 ? jobBoundaries[i + 1] : lines.length;
                const jobLines = lines.slice(startIdx, endIdx);

                // Extract achievements from text
                const achievements = jobLines
                    .filter(line => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))
                    .map(line => line.replace(/^[•\-*]\s*/, ''));

                // Use original structured data for title/company/dates
                const original = originalExperience[i];
                result.push({
                    title: original.title || 'Position',
                    company: original.company || 'Company',
                    location: original.location || '',
                    startDate: original.startDate || '',
                    endDate: original.endDate || 'Present',
                    description: original.description || '',
                    achievements: achievements.length > 0 ? achievements : (original.achievements || [])
                });

                console.log(`  Job ${i + 1}: ${result[i].title} at ${result[i].company}`);
            }

            console.log(`Successfully merged ${result.length} experience entries`);
            return result;
        }

        // Fallback: parse from text only (when no structured data available)
        console.log('No original structured data, parsing from text only');
        const lines = experienceText.split('\n').map(line => line.trim()).filter(line => line);

        // Detect job boundaries
        const jobBoundaries = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const hasDatePattern = /\d{1,2}\/\d{4}|\d{4}/.test(line);
            const notBullet = !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*');
            const notHeader = !line.toLowerCase().includes('key achievement');
            const isLongEnough = line.length > 20;

            if (hasDatePattern && notBullet && notHeader && isLongEnough) {
                jobBoundaries.push(i);
            }
        }

        console.log(`Found ${jobBoundaries.length} job boundaries`);

        const experiences = [];
        for (let i = 0; i < jobBoundaries.length; i++) {
            const startIdx = jobBoundaries[i];
            const endIdx = i < jobBoundaries.length - 1 ? jobBoundaries[i + 1] : lines.length;
            const jobLines = lines.slice(startIdx, endIdx);

            // Parse header
            const headerLine = jobLines[0];
            const dateMatch = headerLine.match(/(\d{1,2}\/\d{4})\s*[-–]\s*((?:\d{1,2}\/\d{4})|Present)/i);
            const startDate = dateMatch ? dateMatch[1] : '';
            const endDate = dateMatch ? dateMatch[2] : 'Present';

            // Extract title and company from header (everything before dates)
            let titleCompanyPart = dateMatch ? headerLine.substring(0, dateMatch.index).trim() : headerLine;

            // Look for company names in common list or capitalize patterns
            const words = titleCompanyPart.split(' ');
            let title = titleCompanyPart;
            let company = 'Company';

            // Simple heuristic: if line has "at", split there
            if (titleCompanyPart.includes(' at ')) {
                [title, company] = titleCompanyPart.split(' at ').map(s => s.trim());
            } else {
                // Find first capitalized word after position keywords as company start
                const jobKeywords = ['Lead', 'Manager', 'Director', 'Developer', 'Engineer', 'Analyst', 'Specialist', 'Consultant'];
                let companyStartIdx = -1;
                for (let j = 0; j < words.length; j++) {
                    if (jobKeywords.includes(words[j]) && j + 1 < words.length) {
                        companyStartIdx = j + 1;
                        break;
                    }
                }
                if (companyStartIdx > 0) {
                    title = words.slice(0, companyStartIdx).join(' ');
                    company = words.slice(companyStartIdx).join(' ');
                }
            }

            // Extract achievements
            const achievements = jobLines
                .slice(1)
                .filter(line => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))
                .map(line => line.replace(/^[•\-*]\s*/, ''));

            experiences.push({
                title,
                company,
                location: '',
                startDate,
                endDate,
                description: '',
                achievements
            });
        }

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
            SITE_URL: process.env.SITE_URL || process.env.FRONTEND_URL || 'https://your-profile.vercel.app'
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

            // Parse start date - handle multiple formats:
            // YYYY-MM, YYYY, MM/YYYY, M/YYYY
            let startDate;
            if (exp.startDate.includes('/')) {
                // MM/YYYY or M/YYYY format
                const [month, year] = exp.startDate.split('/');
                startDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
            } else if (exp.startDate.includes('-')) {
                // YYYY-MM format
                startDate = new Date(exp.startDate + '-01');
            } else if (exp.startDate.length === 4) {
                // YYYY format
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
                if (exp.endDate.includes('/')) {
                    // MM/YYYY or M/YYYY format
                    const [month, year] = exp.endDate.split('/');
                    endDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
                } else if (exp.endDate.includes('-')) {
                    // YYYY-MM format
                    endDate = new Date(exp.endDate + '-01');
                } else if (exp.endDate.length === 4) {
                    // YYYY format
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