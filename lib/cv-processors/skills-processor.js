// File: lib/cv-processors/skills-processor.js
const BaseProcessor = require('./base-processor');

class SkillsProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    async processText(cleanedText, existingData = {}) {
        console.log('Extracting and organizing skills...');
        
        // Step 1: Extract all skills from CV
        const extractedSkills = await this.extractAllSkills(cleanedText);
        
        // Step 2: Categorize and organize skills
        const organizedSkills = await this.organizeSkillsIntoCategories(extractedSkills, cleanedText);
        
        // Step 3: Validate and clean the results
        const finalSkills = this.validateAndCleanSkills(organizedSkills);
        
        console.log(`Processed skills: ${finalSkills.technical.length} technical, ${finalSkills.soft.length} soft, ${finalSkills.languages.length} languages`);
        this.logStats({ skills: finalSkills }, 'extracted skills');
        
        return { skills: finalSkills };
    }

    async extractAllSkills(cvText) {
        const prompt = `
Extract ALL skills, abilities, competencies, and qualifications mentioned in this CV for ANY profession.

CV Text:
${cvText}

INSTRUCTIONS:
- Find EVERY skill mentioned for ANY job type (cook, sales, teacher, nurse, engineer, etc.)
- Include professional skills relevant to their field
- Include soft skills (leadership, communication, teamwork, etc.)
- Include technical skills and tools (any software, equipment, systems)
- Include spoken languages
- Include certifications and qualifications
- Include industry-specific skills and knowledge
- Include interpersonal and management abilities
- One skill per line
- Do not categorize yet, just list everything
- Be comprehensive - include obvious and subtle skill mentions
- Work for ANY profession or industry

Examples of skills to look for:
- Cooking: Food preparation, menu planning, kitchen management, food safety
- Sales: Customer service, negotiation, CRM systems, lead generation
- Teaching: Curriculum development, classroom management, student assessment
- Nursing: Patient care, medical procedures, documentation, emergency response
- And ANY other profession mentioned in the CV

All Skills Found:`;

        const response = await this.generateSimpleText(prompt, 'comprehensive skills extraction for any profession');
        
        if (!response || response.trim().length === 0) {
            throw new Error('No skills could be extracted from CV');
        }
        
        return this.parseSkillsList(response);
    }

    parseSkillsList(response) {
        const skills = [];
        const lines = response.split('\n');
        
        lines.forEach(line => {
            const skill = this.cleanValue(line.replace(/^[-•*]\s*/, ''));
            if (skill && skill.length > 1 && skill.length < 50) {
                // Remove duplicates (case insensitive)
                const exists = skills.some(existing => 
                    existing.toLowerCase() === skill.toLowerCase()
                );
                if (!exists) {
                    skills.push(skill);
                }
            }
        });
        
        if (skills.length === 0) {
            throw new Error('No valid skills could be parsed from response');
        }
        
        console.log(`Extracted ${skills.length} total skills`);
        return skills;
    }

    async organizeSkillsIntoCategories(skillsList, cvText) {
        const skillsText = skillsList.join(', ');
        
        const prompt = `
Organize these skills into three categories for ANY profession: Professional/Technical, Interpersonal/Soft Skills, and Languages.

Skills to categorize: ${skillsText}

Context from CV:
${cvText.substring(0, 2000)}

CATEGORIZATION RULES FOR ANY PROFESSION:
- Professional/Technical: Job-specific skills, tools, software, equipment, procedures, certifications, industry knowledge
  Examples: Cooking techniques, sales software, teaching methods, medical procedures, programming, accounting software
- Interpersonal/Soft: Universal workplace skills like communication, leadership, teamwork, problem-solving, time management
  Examples: Leadership, communication, customer service, multitasking, attention to detail, conflict resolution
- Languages: Spoken/written languages like English, Spanish, French, etc.

Return in this EXACT format:
TECHNICAL:
skill1, skill2, skill3

SOFT:
skill1, skill2, skill3

LANGUAGES:
language1, language2

Categories:`;

        const response = await this.generateSimpleText(prompt, 'skills categorization for any profession');
        
        return this.parseSkillsCategories(response);
    }

    parseSkillsCategories(response) {
        const categories = {
            technical: [],
            soft: [],
            languages: []
        };
        
        const lines = response.split('\n').map(line => line.trim());
        let currentCategory = null;
        
        lines.forEach(line => {
            if (line.toUpperCase().startsWith('TECHNICAL:')) {
                currentCategory = 'technical';
                const skills = line.replace(/^TECHNICAL:\s*/i, '');
                if (skills) {
                    this.addSkillsToCategory(categories.technical, skills);
                }
            } else if (line.toUpperCase().startsWith('SOFT:')) {
                currentCategory = 'soft';
                const skills = line.replace(/^SOFT:\s*/i, '');
                if (skills) {
                    this.addSkillsToCategory(categories.soft, skills);
                }
            } else if (line.toUpperCase().startsWith('LANGUAGES:')) {
                currentCategory = 'languages';
                const skills = line.replace(/^LANGUAGES:\s*/i, '');
                if (skills) {
                    this.addSkillsToCategory(categories.languages, skills);
                }
            } else if (currentCategory && line && !line.includes(':')) {
                this.addSkillsToCategory(categories[currentCategory], line);
            }
        });
        
        return categories;
    }

    addSkillsToCategory(categoryArray, skillsText) {
        const skills = skillsText.split(',').map(skill => this.cleanValue(skill));
        
        skills.forEach(skill => {
            if (skill && skill.length > 1 && skill.length < 30) {
                // Check for duplicates (case insensitive)
                const exists = categoryArray.some(existing => 
                    existing.toLowerCase() === skill.toLowerCase()
                );
                if (!exists) {
                    categoryArray.push(skill);
                }
            }
        });
    }

    validateAndCleanSkills(skills) {
        const cleaned = {
            technical: this.cleanSkillsArray(skills.technical || []).slice(0, 15),
            soft: this.cleanSkillsArray(skills.soft || []).slice(0, 10),
            languages: this.cleanSkillsArray(skills.languages || []).slice(0, 5)
        };
        
        // Ensure we have at least some skills
        if (cleaned.technical.length === 0 && cleaned.soft.length === 0) {
            throw new Error('No valid skills categories could be created');
        }
        
        return cleaned;
    }

    cleanSkillsArray(skillsArray) {
        return skillsArray
            .map(skill => this.cleanValue(skill))
            .filter(skill => skill && skill.length > 1 && skill.length < 30)
            .filter((skill, index, array) => 
                // Remove duplicates (case insensitive)
                index === array.findIndex(s => s.toLowerCase() === skill.toLowerCase())
            )
            .sort(); // Sort alphabetically
    }

    async getFallbackData(existingData = {}) {
        throw new Error('Skills extraction failed - no fallback available');
    }
}

module.exports = SkillsProcessor;