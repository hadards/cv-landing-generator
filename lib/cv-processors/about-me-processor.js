// File: lib/cv-processors/about-me-processor.js
const BaseProcessor = require('./base-processor');

class AboutMeProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    async processText(cleanedText, existingData = {}) {
        console.log('📝 Generating about me content...');
        
        const personalInfo = existingData.personalInfo || {};
        
        // Step 1: Generate professional summary
        const summary = await this.generateSummary(cleanedText, personalInfo);
        
        // Step 2: Generate about me paragraph
        const aboutMe = await this.generateAboutMe(cleanedText, personalInfo);
        
        // Combine the results
        const aboutData = {
            summary: this.cleanValue(summary),
            aboutMe: this.cleanValue(aboutMe)
        };
        
        this.logStats(aboutData, 'generated about content');
        
        return { aboutData };
    }

    async generateSummary(cvText, personalInfo) {
        const name = personalInfo.name || 'Professional';
        const title = personalInfo.currentTitle || 'Professional';
        
        const prompt = `
Create a professional summary (2-3 sentences) for ${name} based on their CV.

Person: ${name}
Current Title: ${title}

CV Content:
${cvText.substring(0, 3000)}

Requirements:
- 2-3 sentences maximum
- Professional and compelling tone
- Highlight key strengths and experience
- Mention years of experience if you can determine it
- Adapt to their actual profession and industry
- Make it specific to their background

Professional Summary:`;

        try {
            const response = await this.generateSimpleText(prompt, 'summary generation');
            
            if (response && response.length > 20 && response.length < 500) {
                console.log(`✅ Summary generated (${response.length} chars)`);
                return response;
            } else {
                throw new Error('Invalid summary length');
            }
            
        } catch (error) {
            console.error('❌ Summary generation failed:', error.message);
            return this.getFallbackSummary(personalInfo);
        }
    }

    async generateAboutMe(cvText, personalInfo) {
        const name = personalInfo.name || 'Professional';
        const title = personalInfo.currentTitle || 'Professional';
        
        const prompt = `
Create a compelling "About Me" section (3-4 sentences) for ${name}'s professional landing page.

Person: ${name}
Current Title: ${title}

CV Content:
${cvText.substring(0, 3000)}

Requirements:
- 3-4 sentences
- Write in first person ("I am...")
- Tell their professional story and journey
- Show personality while staying professional
- Highlight what makes them unique
- Adapt to their actual industry and background
- Sound engaging and personal

About Me:`;

        try {
            const response = await this.generateSimpleText(prompt, 'about me generation');
            
            if (response && response.length > 50 && response.length < 800) {
                console.log(`✅ About me generated (${response.length} chars)`);
                return response;
            } else {
                throw new Error('Invalid about me length');
            }
            
        } catch (error) {
            console.error('❌ About me generation failed:', error.message);
            return this.getFallbackAboutMe(personalInfo);
        }
    }

    getFallbackSummary(personalInfo) {
        const title = personalInfo.currentTitle || 'Professional';
        const name = personalInfo.name || 'Professional';
        
        console.log('🔄 Using fallback summary');
        
        if (title.toLowerCase().includes('engineer') || title.toLowerCase().includes('developer')) {
            return `Experienced ${title} with a strong background in technology and software development. Passionate about creating innovative solutions and delivering high-quality results in dynamic environments.`;
        } else if (title.toLowerCase().includes('manager') || title.toLowerCase().includes('lead')) {
            return `Accomplished ${title} with proven expertise in team leadership and strategic planning. Dedicated to driving organizational success through effective management and innovative problem-solving.`;
        } else if (title.toLowerCase().includes('analyst') || title.toLowerCase().includes('data')) {
            return `Skilled ${title} with expertise in data analysis and strategic insights. Committed to transforming complex data into actionable business intelligence and driving informed decision-making.`;
        } else {
            return `Dedicated ${title} with a strong track record of professional excellence. Passionate about delivering outstanding results and contributing meaningfully to organizational objectives.`;
        }
    }

    getFallbackAboutMe(personalInfo) {
        const title = personalInfo.currentTitle || 'professional';
        const name = personalInfo.name || 'professional';
        
        console.log('🔄 Using fallback about me');
        
        if (title.toLowerCase().includes('engineer') || title.toLowerCase().includes('developer')) {
            return `I am a passionate ${title} who thrives on solving complex technical challenges and building innovative solutions. My journey in technology has been driven by curiosity and a commitment to continuous learning. I enjoy collaborating with diverse teams to create impactful software that makes a difference. When I'm not coding, I stay current with emerging technologies and contribute to the tech community.`;
        } else if (title.toLowerCase().includes('manager') || title.toLowerCase().includes('lead')) {
            return `I am an experienced ${title} who believes in empowering teams to achieve their full potential. My approach combines strategic thinking with hands-on leadership to drive results and foster innovation. I'm passionate about building collaborative environments where people can grow and excel. My goal is to create positive impact through effective leadership and meaningful professional relationships.`;
        } else if (title.toLowerCase().includes('analyst') || title.toLowerCase().includes('data')) {
            return `I am a detail-oriented ${title} who enjoys uncovering insights hidden within complex datasets. My passion lies in transforming raw data into compelling stories that drive business decisions. I thrive in environments where analytical thinking meets creative problem-solving. I'm committed to using data as a tool for positive change and strategic advancement.`;
        } else {
            return `I am a dedicated ${title} who brings enthusiasm and expertise to every project I undertake. My career has been shaped by a commitment to excellence and continuous improvement. I believe in the power of collaboration and innovative thinking to overcome challenges and create meaningful outcomes. I'm passionate about making a positive impact in my field and contributing to organizational success.`;
        }
    }

    async getFallbackData(existingData = {}) {
        const personalInfo = existingData.personalInfo || {};
        
        console.log('🔄 Generating fallback about data...');
        
        return {
            aboutData: {
                summary: this.getFallbackSummary(personalInfo),
                aboutMe: this.getFallbackAboutMe(personalInfo)
            }
        };
    }
}

module.exports = AboutMeProcessor;