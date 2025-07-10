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
        
        // Step 2: Enhance each certification with better descriptions
        const enhancedCertifications = await this.enhanceCertificationEntries(certificationsList, cleanedText);
        
        console.log(`Processed ${enhancedCertifications.length} certification entries`);
        this.logStats({ certifications: enhancedCertifications }, 'extracted certifications');
        
        return { certifications: enhancedCertifications };
    }

    async extractCertificationsData(cvText) {
        const prompt = `
Extract ALL certifications, licenses, professional credentials, and training from this CV for ANY profession.

Return each certification in this EXACT format:
Certification Name | Issuing Organization | Date Obtained | URL/ID | Type

Rules:
- One certification per line
- Use | as separator between fields
- Date format: YYYY-MM or YYYY
- URL/ID can be empty if not mentioned
- Type should be: Professional, Academic, Technical, License, or Training
- Include ALL types: IT certifications, medical licenses, teaching credentials, trade certifications, etc.

Examples for different professions:
- AWS Solutions Architect | Amazon Web Services | 2023 | aws.amazon.com/certification | Technical
- Registered Nurse License | State Board of Nursing | 2020 | RN123456 | License  
- PMP Certification | Project Management Institute | 2022 | | Professional
- Google Analytics Certified | Google | 2023 | | Technical
- Teaching Certificate | Department of Education | 2019 | | Academic
- Real Estate License | State Real Estate Commission | 2021 | RE789012 | License

CV Text:
${cvText}

Certifications (format: Name | Issuer | Date | URL/ID | Type):`;

        const response = await this.generateSimpleText(prompt, 'certifications extraction');
        
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
            if (line.includes('Certifications') || 
                line.includes('format:') || 
                line.includes('Rules:') ||
                line.includes('Examples') ||
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

    async enhanceCertificationEntries(certificationsList, cvText) {
        const enhancedCertifications = [];
        
        for (let i = 0; i < certificationsList.length; i++) {
            const certification = certificationsList[i];
            console.log(`Enhancing certification ${i + 1}: ${certification.name}`);
            
            try {
                const enhanced = await this.enhanceSingleCertification(certification, cvText);
                enhancedCertifications.push(enhanced);
            } catch (error) {
                console.error(`Failed to enhance certification ${certification.name}: ${error.message}`);
                // Keep original certification if enhancement fails
                enhancedCertifications.push(certification);
            }
        }
        
        return enhancedCertifications;
    }

    async enhanceSingleCertification(certification, cvText) {
        const prompt = `
Enhance this certification by adding relevant details and improving the description.

Certification: ${certification.name}
Issuer: ${certification.issuer}
Date: ${certification.date}
Type: ${certification.type}

Full CV Context:
${cvText.substring(0, 3000)}

REQUIREMENTS:
1. Add a brief description of what this certification represents (1-2 sentences)
2. Mention the skills or knowledge it validates
3. If it's a well-known certification, explain its industry value
4. Keep it professional and factual
5. Focus on the credibility and expertise it demonstrates

Return in this format:
DESCRIPTION: [Enhanced description here]
SKILLS: [Skills/knowledge validated by this certification]

Enhanced certification:`;

        const response = await this.generateSimpleText(prompt, `certification enhancement for ${certification.name}`);
        
        return this.parseEnhancedCertificationResponse(response, certification);
    }

    parseEnhancedCertificationResponse(response, originalCertification) {
        const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let description = '';
        let skills = '';
        
        lines.forEach(line => {
            if (line.startsWith('DESCRIPTION:')) {
                description = this.cleanValue(line.replace('DESCRIPTION:', ''));
            } else if (line.startsWith('SKILLS:')) {
                skills = this.cleanValue(line.replace('SKILLS:', ''));
            }
        });
        
        // Create fallback description if enhancement failed
        if (!description || description.length < 10) {
            description = this.generateFallbackDescription(originalCertification);
        }
        
        return {
            ...originalCertification,
            description: description,
            skills: skills || `Skills validated by ${originalCertification.name} certification`
        };
    }

    generateFallbackDescription(certification) {
        const { name, issuer, type } = certification;
        
        // Generate basic descriptions based on certification type and common patterns
        if (type.toLowerCase() === 'technical') {
            return `${name} certification demonstrates technical proficiency and expertise in specialized technologies and methodologies.`;
        } else if (type.toLowerCase() === 'professional') {
            return `${name} professional certification validates industry knowledge and adherence to professional standards.`;
        } else if (type.toLowerCase() === 'license') {
            return `${name} license certifies legal authorization to practice and perform professional duties in the field.`;
        } else if (type.toLowerCase() === 'academic') {
            return `${name} academic credential demonstrates educational achievement and specialized knowledge.`;
        } else {
            return `${name} certification from ${issuer} validates professional competency and expertise in the field.`;
        }
    }

    async getFallbackData(existingData = {}) {
        // Return empty certifications array - this section is optional
        console.log('No certifications found - returning empty array');
        return { certifications: [] };
    }
}

module.exports = CertificationsProcessor;