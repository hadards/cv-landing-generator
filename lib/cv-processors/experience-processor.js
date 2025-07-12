// File: lib/cv-processors/experience-processor.js
const BaseProcessor = require('./base-processor');

class ExperienceProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    async processText(cleanedText, existingData = {}) {
        console.log('Extracting work experience...');

        // Step 1: Extract experience data using AI
        const experienceList = await this.extractExperienceData(cleanedText);

        // Step 2: Enhance each experience entry with better descriptions
        const enhancedExperience = await this.enhanceExperienceEntries(experienceList, cleanedText);

        console.log(`Processed ${enhancedExperience.length} experience entries`);
        this.logStats({ experience: enhancedExperience }, 'extracted experience');

        return { experience: enhancedExperience };
    }

    async extractExperienceData(cvText) {
        const prompt = `
Extract work experience from this CV. ONLY extract from the "Work Experience" or "Employment" section, NOT from summary or skills sections.

Job Title | Company Name | Location | Start Date | End Date | Description

Rules:
- ONLY extract jobs from the actual Work Experience/Employment section
- One job per line
- Use | as separator between fields
- For dates: use YYYY-MM format or just YYYY if month unknown
- Use "Present" for current positions
- Location can be empty if not mentioned
- Description should be 1-2 sentences from the CV
- Do NOT add extra information not in the CV
- List jobs from most recent to oldest

CV Text:
${cvText}

Work Experience (format: Title | Company | Location | Start | End | Description):`;

        const response = await this.generateSimpleText(prompt, 'experience extraction');

        if (!response || response.trim().length === 0) {
            throw new Error('No experience data could be extracted from CV');
        }

        return this.parseExperienceResponse(response);
    }

    parseExperienceResponse(response) {
        const jobs = [];
        const lines = response.split('\n').filter(line => line.trim().length > 0);

        lines.forEach((line, index) => {
            const parts = line.split('|').map(part => part.trim());

            if (parts.length >= 5) {
                const job = {
                    title: this.cleanValue(parts[0]),
                    company: this.cleanValue(parts[1]),
                    location: this.cleanValue(parts[2]),
                    startDate: this.cleanValue(parts[3]),
                    endDate: this.cleanValue(parts[4]),
                    description: this.cleanValue(parts[5] || ''),
                    achievements: []
                };

                // Validate required fields
                if (job.title && job.company) {
                    jobs.push(job);
                    console.log(`Parsed job ${index + 1}: ${job.title} at ${job.company}`);
                } else {
                    console.warn(`Skipped invalid job entry: ${line}`);
                }
            }
        });

        if (jobs.length === 0) {
            throw new Error('No valid experience entries could be parsed');
        }

        console.log(`Successfully parsed ${jobs.length} jobs`);
        return jobs;
    }

    async enhanceExperienceEntries(jobs, cvText) {
        const enhancedJobs = [];

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            console.log(`Enhancing job ${i + 1}: ${job.title} at ${job.company}`);

            try {
                const enhanced = await this.enhanceSingleJob(job, cvText);
                enhancedJobs.push(enhanced);
            } catch (error) {
                console.error(`Failed to enhance job ${job.title}: ${error.message}`);
                // Keep original job if enhancement fails
                enhancedJobs.push(job);
            }
        }

        return enhancedJobs;
    }

    async enhanceSingleJob(job, cvText) {
        const prompt = `
Enhance this job experience by rewriting the description in FIRST PERSON and extracting achievements.

Job: ${job.title} at ${job.company}
Current Description: ${job.description}
Duration: ${job.startDate} to ${job.endDate}

Full CV Context:
${cvText.substring(0, 4000)}

REQUIREMENTS:
1. Rewrite description in FIRST PERSON (2-3 sentences max)
2. Extract 2-4 specific achievements as bullet points
3. Use action verbs and quantify results where possible
4. Make it compelling but stay factual
5. Focus on impact and results

Return in this format:
DESCRIPTION: [First-person description here]
ACHIEVEMENTS:
- [Achievement 1]
- [Achievement 2]
- [Achievement 3]
- [Achievement 4]

Enhanced job experience:`;

        const response = await this.generateSimpleText(prompt, `job enhancement for ${job.title}`);

        return this.parseEnhancedJobResponse(response, job);
    }

    parseEnhancedJobResponse(response, originalJob) {
        const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        let description = originalJob.description;
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
        if (!description || description.length < 20) {
            console.warn(`Enhancement failed for ${originalJob.title}, using original description`);
            description = originalJob.description;
        }

        return {
            ...originalJob,
            description: description,
            achievements: achievements
        };
    }

    async getFallbackData(existingData = {}) {
        throw new Error('Experience extraction failed - no fallback available');
    }
}

module.exports = ExperienceProcessor;