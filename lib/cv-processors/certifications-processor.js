// File: lib/cv-processors/certifications-processor.js
const BaseProcessor = require('./base-processor');

class CertificationsProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    async processText(cleanedText, existingData = {}) {
        console.log('Extracting certifications and professional credentials...');
        
        // Step 1: Extract certifications data using AI
        const certificationsList = await this.extractCertificationsData(cleanedText);
        
        // Step 2: Light enhancement - just add basic context without over-explaining
        const enhancedCertifications = await this.lightlyEnhanceCertifications(certificationsList);
        
        console.log(`Processed ${enhancedCertifications.length} certification entries`);
        this.logStats({ certifications: enhancedCertifications }, 'extracted certifications');
        
        return { certifications: enhancedCertifications };
    }

    async extractCertificationsData(cvText) {
        const prompt = `
Extract ALL certifications, licenses, and credentials from this CV EXACTLY as written.

Return each certification in this EXACT format:
Certification Name | Issuing Organization | Date | URL/ID | Type

CRITICAL RULES:
- Keep names and organizations EXACTLY as written in the CV
- Do NOT add descriptions or enhancements
- Extract only what's explicitly mentioned
- Preserve original wording and terminology
- If information is brief, keep it brief

Types: Professional, Academic, Technical, License, Training

Examples:
- AWS Solutions Architect | Amazon Web Services | 2023 | | Technical
- RN License | State Board | 2020 | RN123456 | License
- PMP | PMI | 2022 | | Professional

CV Text:
${cvText}

Certifications (format: Name | Issuer | Date | URL/ID | Type):`;

        const response = await this.generateSimpleText(prompt, 'extract original certifications');
        
        if (!response || response.trim().length === 0) {
            throw new Error('No certifications data could be extracted from CV');
        }
        
        return this.parseCertificationsResponse(response);
    }

    parseCertificationsResponse(response) {
        const certifications = [];
        const lines = response.split('\n').filter(line => line.trim().length > 0);
        
        lines.forEach((line, index) => {
            // Skip lines that don't look like certification entries
            if (line.includes('Certifications (format:') || 
                line.includes('CRITICAL RULES:') ||
                line.includes('Examples:') ||
                line.length < 10) {
                return;
            }
            
            const parts = line.split('|').map(part => part.trim());
            
            if (parts.length >= 3) {
                const certification = {
                    name: this.cleanValue(parts[0]),
                    issuer: this.cleanValue(parts[1]),
                    date: this.cleanValue(parts[2]),
                    url: this.cleanValue(parts[3] || ''),
                    type: this.cleanValue(parts[4] || 'Professional')
                    // NO description field - keep it simple like original CV
                };
                
                // Validate required fields
                if (certification.name && certification.issuer) {
                    certifications.push(certification);
                    console.log(`Parsed certification ${index + 1}: ${certification.name} from ${certification.issuer}`);
                } else {
                    console.warn(`Skipped invalid certification entry: ${line}`);
                }
            }
        });
        
        if (certifications.length === 0) {
            throw new Error('No valid certification entries could be parsed');
        }
        
        console.log(`Successfully parsed ${certifications.length} certifications`);
        return certifications;
    }

    async lightlyEnhanceCertifications(certificationsList) {
        // Add basic descriptions for well-known certifications
        // Keep it short and factual
        const enhancedCertifications = [];
        
        for (const cert of certificationsList) {
            const enhanced = await this.addBasicDescription(cert);
            enhancedCertifications.push(enhanced);
        }
        
        return enhancedCertifications;
    }

    async addBasicDescription(certification) {
        // Add a very brief, factual description for context
        const prompt = `
Add a brief, factual description (1 sentence) for this certification. Keep it professional and concise.

Certification: ${certification.name}
Issuer: ${certification.issuer}
Type: ${certification.type}

REQUIREMENTS:
- Maximum 1 sentence
- Factual and professional
- Explain what this certification validates
- Don't be overly promotional

Return ONLY the description, nothing else:`;

        try {
            const response = await this.generateSimpleText(prompt, `description for ${certification.name}`);
            
            const description = this.cleanValue(response);
            
            // Validate the response
            if (description && description.length > 5 && description.length < 150) {
                return {
                    ...certification,
                    description: description
                };
            } else {
                // If enhancement fails, return without description
                return certification;
            }
            
        } catch (error) {
            console.warn(`Description generation failed for ${certification.name}, keeping without description`);
            return certification;
        }
    }

    async getFallbackData(existingData = {}) {
        console.log('No certifications data found - section will be hidden');
        
        // Return empty certifications array - section will be hidden in UI
        return { certifications: [] };
    }
}

module.exports = CertificationsProcessor;