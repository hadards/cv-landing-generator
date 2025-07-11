// File: lib/cv-processors/projects-processor.js
const BaseProcessor = require('./base-processor');

class ProjectsProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    async processText(cleanedText, existingData = {}) {
        console.log('Extracting projects and portfolio work...');
        
        // Step 1: Extract projects data using AI
        const projectsList = await this.extractProjectsData(cleanedText);
        
        // Step 2: Light enhancement - just clean up formatting, keep original content
        const cleanedProjects = await this.lightlyEnhanceProjects(projectsList, cleanedText);
        
        console.log(`Processed ${cleanedProjects.length} project entries`);
        this.logStats({ projects: cleanedProjects }, 'extracted projects');
        
        return { projects: cleanedProjects };
    }

    async extractProjectsData(cvText) {
        const prompt = `
Extract ALL projects from this CV for ANY profession. This includes professional projects, personal projects, portfolio work, significant accomplishments, and notable work.

Return each project in this EXACT format:
Project Name | Description | Technologies/Tools Used | URL/Link | Type

Rules:
- One project per line
- Use | as separator between fields
- Keep descriptions close to original wording but clean them up slightly
- Technologies/Tools can include software, methods, techniques, equipment used
- URL/Link can be empty if not mentioned
- Type should be: Professional, Personal, Academic, Volunteer, or Other
- Include ANY significant work or projects mentioned
- Works for ALL professions

Examples for different professions:
- Restaurant Menu Redesign | Created new seasonal menu with 15 dishes | Recipe development, cost analysis, food photography | | Professional
- E-commerce Website | Built online store for local business | React, Node.js, Stripe API | github.com/user/store | Personal  
- Student Reading Program | Developed literacy program for 50 students | Curriculum design, assessment tools | | Professional
- Community Garden Project | Organized neighborhood vegetable garden | Project management, fundraising | | Volunteer

CV Text:
${cvText}

Projects (format: Name | Description | Technologies | URL | Type):`;

        const response = await this.generateSimpleText(prompt, 'projects extraction');
        
        if (!response || response.trim().length === 0) {
            throw new Error('No projects data could be extracted from CV');
        }
        
        return this.parseProjectsResponse(response);
    }

    parseProjectsResponse(response) {
        const projects = [];
        const lines = response.split('\n').filter(line => line.trim().length > 0);
        
        lines.forEach((line, index) => {
            // Skip obvious non-project lines
            if (line.includes('Projects (format:') || 
                line.includes('CRITICAL RULES:') ||
                line.length < 10) {
                return;
            }
            
            const parts = line.split('|').map(part => part.trim());
            
            if (parts.length >= 3) {
                const project = {
                    name: this.cleanValue(parts[0]),
                    description: this.cleanValue(parts[1]), // Keep original description
                    technologies: this.parseSkillsList(parts[2] || ''),
                    url: this.cleanValue(parts[3] || ''),
                    type: this.cleanValue(parts[4] || 'Other')
                };
                
                // Validate required fields
                if (project.name && project.description) {
                    projects.push(project);
                    console.log(`Parsed project ${index + 1}: ${project.name}`);
                } else {
                    console.warn(`Skipped invalid project entry: ${line}`);
                }
            }
        });
        
        if (projects.length === 0) {
            throw new Error('No valid project entries could be parsed');
        }
        
        console.log(`Successfully parsed ${projects.length} projects`);
        return projects;
    }

    parseSkillsList(skillsText) {
        if (!skillsText || skillsText.trim().length === 0) {
            return [];
        }
        
        return skillsText
            .split(',')
            .map(skill => this.cleanValue(skill))
            .filter(skill => skill && skill.length > 0);
    }

    async lightlyEnhanceProjects(projectsList, cvText) {
        // Very light enhancement - just clean up formatting and grammar
        // Keep the core content and meaning the same
        const enhancedProjects = [];
        
        for (let i = 0; i < projectsList.length; i++) {
            const project = projectsList[i];
            
            try {
                const enhanced = await this.lightlyEnhanceSingleProject(project);
                enhancedProjects.push(enhanced);
            } catch (error) {
                console.error(`Light enhancement failed for project ${project.name}: ${error.message}`);
                // Keep original project if enhancement fails
                enhancedProjects.push(project);
            }
        }
        
        return enhancedProjects;
    }

    async lightlyEnhanceSingleProject(project) {
        const prompt = `
Lightly improve this project description - fix grammar and make it flow better, but keep the core content and meaning exactly the same.

Project: ${project.name}
Current Description: ${project.description}
Technologies: ${project.technologies.join(', ')}

REQUIREMENTS:
- Fix any grammar or spelling issues
- Make the description flow better
- Keep the same meaning and content
- Don't add information that wasn't there
- Don't make it overly professional if it was casual
- Maximum 2-3 sentences

Return ONLY the improved description, nothing else:`;

        try {
            const response = await this.generateSimpleText(prompt, `light enhancement for ${project.name}`);
            
            const improvedDescription = this.cleanValue(response);
            
            // Validate the response is reasonable
            if (improvedDescription && improvedDescription.length > 10 && improvedDescription.length < 500) {
                return {
                    ...project,
                    description: improvedDescription
                };
            } else {
                throw new Error('Invalid enhanced description');
            }
            
        } catch (error) {
            console.warn(`Light enhancement failed for ${project.name}, keeping original`);
            return project;
        }
    }

    async getFallbackData(existingData = {}) {
        throw new Error('Projects extraction failed - no fallback available');
    }
}

module.exports = ProjectsProcessor;