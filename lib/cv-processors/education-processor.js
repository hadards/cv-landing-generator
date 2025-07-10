// File: lib/cv-processors/education-processor.js
const BaseProcessor = require('./base-processor');

class EducationProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    async processText(cleanedText, existingData = {}) {
        console.log('Extracting education background...');
        
        // Step 1: Extract education data using AI
        const educationList = await this.extractEducationData(cleanedText);
        
        // Step 2: Enhance each education entry with better descriptions
        const enhancedEducation = await this.enhanceEducationEntries(educationList, cleanedText);
        
        console.log(`Processed ${enhancedEducation.length} education entries`);
        this.logStats({ education: enhancedEducation }, 'extracted education');
        
        return { education: enhancedEducation };
    }

    async extractEducationData(cvText) {
        const prompt = `
Extract ALL education from this CV for ANY profession. Return each degree/education in this EXACT format:

Degree/Qualification | Institution | Location | Graduation Date | GPA/Grade | Description

Rules:
- One education entry per line
- Use | as separator between fields
- For dates: use YYYY or YYYY-MM format
- Include degrees, diplomas, certificates, training, courses
- GPA/Grade can be empty if not mentioned
- Location can be empty if not mentioned
- Description should be 1-2 sentences about the program/achievements
- Works for ALL education types: university degrees, vocational training, certifications, courses
- List from most recent to oldest

Examples for different professions:
- Bachelor of Science in Computer Science | MIT | Boston, MA | 2020 | 3.8 | Focused on software engineering and algorithms
- Culinary Arts Diploma | Le Cordon Bleu | Paris, France | 2019 | | Professional cooking program with French cuisine specialization
- Registered Nurse Certification | Community College | Chicago, IL | 2021 | | Nursing program with clinical training in patient care
- Teaching Certificate | State University | Austin, TX | 2018 | | Education program with classroom management training

CV Text:
${cvText}

Education (format: Degree | Institution | Location | Date | GPA | Description):`;

        const response = await this.generateSimpleText(prompt, 'education extraction');
        
        if (!response || response.trim().length === 0) {
            throw new Error('No education data could be extracted from CV');
        }
        
        return this.parseEducationResponse(response);
    }

    parseEducationResponse(response) {
        const educationEntries = [];
        const lines = response.split('\n').filter(line => line.trim().length > 0);
        
        lines.forEach((line, index) => {
            const parts = line.split('|').map(part => part.trim());
            
            if (parts.length >= 4) {
                const education = {
                    degree: this.cleanValue(parts[0]),
                    institution: this.cleanValue(parts[1]),
                    location: this.cleanValue(parts[2]),
                    graduationDate: this.cleanValue(parts[3]),
                    gpa: this.cleanValue(parts[4] || ''),
                    description: this.cleanValue(parts[5] || ''),
                    achievements: []
                };
                
                // Validate required fields
                if (education.degree && education.institution) {
                    educationEntries.push(education);
                    console.log(`Parsed education ${index + 1}: ${education.degree} from ${education.institution}`);
                } else {
                    console.warn(`Skipped invalid education entry: ${line}`);
                }
            }
        });
        
        if (educationEntries.length === 0) {
            throw new Error('No valid education entries could be parsed');
        }
        
        console.log(`Successfully parsed ${educationEntries.length} education entries`);
        return educationEntries;
    }

    async enhanceEducationEntries(educationList, cvText) {
        const enhancedEducation = [];
        
        for (let i = 0; i < educationList.length; i++) {
            const education = educationList[i];
            console.log(`Enhancing education ${i + 1}: ${education.degree} from ${education.institution}`);
            
            try {
                const enhanced = await this.enhanceSingleEducation(education, cvText);
                enhancedEducation.push(enhanced);
            } catch (error) {
                console.error(`Failed to enhance education ${education.degree}: ${error.message}`);
                // Keep original education if enhancement fails
                enhancedEducation.push(education);
            }
        }
        
        return enhancedEducation;
    }

    async enhanceSingleEducation(education, cvText) {
        const prompt = `
Enhance this education entry by improving the description and extracting achievements.

Education: ${education.degree} from ${education.institution}
Current Description: ${education.description}
Graduation: ${education.graduationDate}
GPA: ${education.gpa}

Full CV Context:
${cvText.substring(0, 4000)}

REQUIREMENTS:
1. Improve description (2-3 sentences max) - make it more compelling
2. Extract 2-4 specific academic achievements if mentioned in CV
3. Include relevant coursework, honors, activities, projects if mentioned
4. Stay factual but make it engaging
5. Focus on what makes this education valuable

Return in this format:
DESCRIPTION: [Enhanced description here]
ACHIEVEMENTS:
- [Achievement 1]
- [Achievement 2]
- [Achievement 3]
- [Achievement 4]

Enhanced education:`;

        const response = await this.generateSimpleText(prompt, `education enhancement for ${education.degree}`);
        
        return this.parseEnhancedEducationResponse(response, education);
    }

    parseEnhancedEducationResponse(response, originalEducation) {
        const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let description = originalEducation.description;
        const achievements = [];
        
        let inAchievements = false;
        
        lines.forEach(line => {
            if (line.startsWith('DESCRIPTION:')) {
                description = this.cleanValue(line.replace('DESCRIPTION:', ''));
            } else if (line.startsWith('ACHIEVEMENTS:')) {
                inAchievements = true;
            } else if (inAchievements && line.startsWith('-')) {
                const achievement = this.cleanValue(line.substring(1));
                if (achievement && achievement.length > 5) {
                    achievements.push(achievement);
                }
            }
        });
        
        // Validate enhanced content
        if (!description || description.length < 10) {
            console.warn(`Enhancement failed for ${originalEducation.degree}, using original description`);
            description = originalEducation.description;
        }
        
        return {
            ...originalEducation,
            description: description,
            achievements: achievements
        };
    }

    async getFallbackData(existingData = {}) {
        throw new Error('Education extraction failed - no fallback available');
    }
}

module.exports = EducationProcessor;