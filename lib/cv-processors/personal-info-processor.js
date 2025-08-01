// File: lib/cv-processors/personal-info-processor.js
const BaseProcessor = require('./base-processor');
const TextCleaner = require('../utils/text-cleaner');

class PersonalInfoProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    async processText(cleanedText, existingData = {}) {
        console.log('Extracting personal information...');
        
        // Step 1: Extract contact info using regex patterns
        const contactInfo = TextCleaner.extractContactInfo(cleanedText);
        
        // Step 2: Extract name using AI
        const nameData = await this.extractName(cleanedText);
        
        // Step 3: Extract location using AI
        const locationData = await this.extractLocation(cleanedText, contactInfo);
        
        // Step 4: Determine current job title
        const jobTitle = await this.extractCurrentJobTitle(cleanedText);
        
        // Combine all data
        const personalInfo = {
            name: this.cleanValue(nameData.name),
            email: contactInfo.emails[0] || '',
            phone: contactInfo.phones[0] || '',
            location: this.cleanValue(locationData.location),
            currentTitle: this.cleanValue(jobTitle)
        };
        
        this.logStats(personalInfo, 'extracted personal info');
        
        // Validate we have the minimum required data
        if (!personalInfo.name) {
            throw new Error('Unable to extract name from CV');
        }
        
        return { personalInfo };
    }

    async extractName(cvText) {
        const prompt = `
Extract the person's full name from this CV text.

CV Text:
${cvText.substring(0, 1000)}

Instructions:
- Look for the person's full name (usually at the top)
- Return only the name, nothing else
- If multiple names appear, choose the main person's name
- Do not include titles like Mr., Dr., etc.

Name:`;

        try {
            const response = await this.generateSimpleText(prompt, 'name extraction');
            const cleanedName = this.cleanValue(response);
            
            // Validate the name looks reasonable
            if (cleanedName && cleanedName.length > 1 && cleanedName.length < 50) {
                console.log(`✅ Name extracted: "${cleanedName}"`);
                return { name: cleanedName };
            } else {
                throw new Error('Invalid name format received');
            }
            
        } catch (error) {
            console.error('❌ AI name extraction failed:', error.message);
            
            // Fallback: try to find name using text patterns
            const candidates = TextCleaner.extractNameCandidates(cvText);
            if (candidates.length > 0) {
                console.log(`Using fallback name: "${candidates[0]}"``);
                return { name: candidates[0] };
            }
            
            throw new Error('Unable to extract name');
        }
    }

    async extractLocation(cvText, contactInfo) {
        // Start with any locations found by regex
        let locationCandidates = [...contactInfo.locations];
        
        const prompt = `
Extract the person's current location/address from this CV.

CV Text:
${cvText.substring(0, 2000)}

Instructions:
- Look for current address, city, state, country
- Return in format: City, State/Country
- If only city is mentioned, that's fine
- Do not include full street addresses
- Return only the location, nothing else

Location:`;

        try {
            const response = await this.generateSimpleText(prompt, 'location extraction');
            const cleanedLocation = this.cleanValue(response);
            
            if (cleanedLocation && cleanedLocation.length > 2) {
                console.log(`✅ Location extracted: "${cleanedLocation}"`);
                return { location: cleanedLocation };
            }
            
        } catch (error) {
            console.error('❌ AI location extraction failed:', error.message);
        }
        
        // Fallback to regex-found locations
        if (locationCandidates.length > 0) {
            console.log(`Using fallback location: "${locationCandidates[0]}"``);
            return { location: locationCandidates[0] };
        }
        
        return { location: '' };
    }

    async extractCurrentJobTitle(cvText) {
        const prompt = `
Extract the person's current job title from this CV.

CV Text:
${cvText.substring(0, 2000)}

Instructions:
- Look for their current position/job title
- Usually found near the top or in experience section
- Look for words like "Current", "Present", dates like 2024, 2025
- Return only the job title, not the company
- Examples: "Software Engineer", "Marketing Manager", "Data Analyst"

Current Job Title:`;

        try {
            const response = await this.generateSimpleText(prompt, 'job title extraction');
            const cleanedTitle = this.cleanValue(response);
            
            if (cleanedTitle && cleanedTitle.length > 2 && cleanedTitle.length < 100) {
                console.log(`✅ Job title extracted: "${cleanedTitle}"`);
                return cleanedTitle;
            }
            
        } catch (error) {
            console.error('❌ AI job title extraction failed:', error.message);
        }
        
        return 'Professional';
    }

    async getFallbackData(existingData = {}) {
        console.log('Generating fallback personal info...');
        
        return {
            personalInfo: {
                name: existingData.name || 'Professional',
                email: existingData.email || '',
                phone: existingData.phone || '',
                location: existingData.location || '',
                currentTitle: existingData.currentTitle || 'Professional'
            }
        };
    }
}

module.exports = PersonalInfoProcessor;