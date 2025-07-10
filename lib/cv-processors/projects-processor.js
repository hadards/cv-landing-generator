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
        
        // Step 2: Enhance each project with better descriptions
        const enhancedProjects = await this.enhanceProjectEntries(projectsList, cleanedText);
        
        console.log(`Processed ${enhancedProjects.length} project entries`);
        this.logStats({ projects: enhancedProjects }, 'extracted projects');
        
        return { projects: enhancedProjects };
    }

    async extractProjectsData(cvText) {
        const prompt = `
Extract ALL projects from this CV for ANY profession. This includes professional projects, personal projects, portfolio work, significant accomplishments, and notable work.

Return each project in this EXACT format:
Project Name | Description | Technologies/Tools Used | URL/Link | Type

Rules:
- One project per line
- Use | as separator between fields
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
- Wedding Cake Design | Custom 3-tier cake for 200 guests | Fondant work, sugar flowers, royal icing | instagram.com/cakes | Personal

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
            const parts = line.split('|').map(part => part.trim());
            
            if (parts.length >= 3) {
                const project = {
                    name: this.cleanValue(parts[0]),
                    description: this.cleanValue(parts[1]),
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

    async enhanceProjectEntries(projectsList, cvText) {
        const enhancedProjects = [];
        
        for (let i = 0; i < projectsList.length; i++) {
            const project = projectsList[i];
            console.log(`Enhancing project ${i + 1}: ${project.name}`);
            
            try {
                const enhanced = await this.enhanceSingleProject(project, cvText);
                enhancedProjects.push(enhanced);
            } catch (error) {
                console.error(`Failed to enhance project ${project.name}: ${error.message}`);
                // Keep original project if enhancement fails
                enhancedProjects.push(project);
            }
        }
        
        return enhancedProjects;
    }

    async enhanceSingleProject(project, cvText) {
        const prompt = `
Enhance this project by improving the description and making it more compelling.

Project: ${project.name}
Current Description: ${project.description}
Technologies: ${project.technologies.join(', ')}
Type: ${project.type}

Full CV Context:
${cvText.substring(0, 4000)}

REQUIREMENTS:
1. Rewrite description to be more compelling and professional (2-3 sentences max)
2. Highlight the impact, results, or significance of the project
3. Make it sound impressive while staying factual
4. Show problem-solving, innovation, or leadership if applicable
5. Use active language that demonstrates skills and value

Return in this format:
DESCRIPTION: [Enhanced description here]

Enhanced project:`;

        const response = await this.generateSimpleText(prompt, `project enhancement for ${project.name}`);
        
        return this.parseEnhancedProjectResponse(response, project);
    }

    parseEnhancedProjectResponse(response, originalProject) {
        const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let description = originalProject.description;
        
        lines.forEach(line => {
            if (line.startsWith('DESCRIPTION:')) {
                const enhancedDesc = this.cleanValue(line.replace('DESCRIPTION:', ''));
                if (enhancedDesc && enhancedDesc.length > 10) {
                    description = enhancedDesc;
                }
            }
        });
        
        // Validate enhanced content
        if (!description || description.length < 10) {
            console.warn(`Enhancement failed for ${originalProject.name}, using original description`);
            description = originalProject.description;
        }
        
        return {
            ...originalProject,
            description: description
        };
    }

    async getFallbackData(existingData = {}) {
        throw new Error('Projects extraction failed - no fallback available');
    }
}

module.exports = ProjectsProcessor;