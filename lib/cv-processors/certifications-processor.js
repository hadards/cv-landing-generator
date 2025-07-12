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
Look for ONLY clear certifications, licenses, professional credentials, and completed courses in this CV.

BE VERY CONSERVATIVE - only extract if you are CERTAIN it's a certification/course.

INCLUDE ONLY:
- Professional certifications (AWS, Google Cloud, Microsoft, Cisco, etc.)
- Industry licenses (CPA, RN, PE, Bar License, etc.)
- Completed courses with certificates
- Professional training programs with credentials
- Academic certifications beyond degrees
- Technical certifications (PMP, Six Sigma, ITIL, etc.)

DO NOT INCLUDE:
- Regular work experience or job titles
- Education degrees (Bachelor's, Master's, PhD)
- Skills or technologies without certification proof
- Soft skills or general abilities
- Achievements or accomplishments that aren't certifications
- Training that doesn't result in a credential
- Anything you're not 100% sure is a certification

Return ONLY the certifications you are CERTAIN about in this format:
Certification Name | Issuing Organization | Date | ID/URL | Type

If NO clear certifications are found, respond with: "NO_CERTIFICATIONS_FOUND"

Examples of what TO include:
- AWS Solutions Architect Associate | Amazon Web Services | 2023 | | Technical
- Project Management Professional (PMP) | PMI | 2022 | | Professional
- Registered Nurse License | State Board of Nursing | 2021 | RN123456 | License
- Google Analytics Certified | Google | 2023 | | Technical

Examples of what NOT to include:
- Bachelor of Science (this is education, not certification)
- Software Engineer (this is a job title)
- JavaScript (this is a skill, not a certification)
- Team Leadership (this is a skill/achievement)

CV Text:
${cvText}

Certifications (format: Name | Issuer | Date | URL/ID | Type):`;

        const response = await this.generateSimpleText(prompt, 'conservative certifications extraction');

        if (!response || response.trim().length === 0) {
            console.log('No certifications response from AI');
            throw new Error('No certifications data could be extracted from CV');
        }

        // Check if AI explicitly said no certifications found
        if (response.trim().toUpperCase().includes('NO_CERTIFICATIONS_FOUND')) {
            console.log('AI confirmed no clear certifications found in CV');
            throw new Error('No clear certifications found in CV');
        }

        return this.parseCertificationsResponse(response);
    }

    parseCertificationsResponse(response) {
        const certifications = [];
        const lines = response.split('\n').filter(line => line.trim().length > 0);

        // Keywords that indicate this is NOT a certification
        const excludeKeywords = [
            'bachelor', 'master', 'phd', 'doctorate', 'degree',
            'university', 'college', 'school',
            'engineer', 'manager', 'developer', 'analyst',
            'experience', 'worked', 'responsible',
            'skills', 'proficient', 'knowledge'
        ];

        // Keywords that indicate this IS likely a certification
        const includeKeywords = [
            'certified', 'certification', 'license', 'credential',
            'certificate', 'professional', 'associate', 'expert',
            'aws', 'google', 'microsoft', 'cisco', 'oracle',
            'pmp', 'cpa', 'rn', 'pe', 'itil', 'six sigma',
            'comptia', 'ccna', 'mcse', 'cissp'
        ];

        lines.forEach((line, index) => {
            // Skip obvious non-certification lines
            if (line.includes('Certifications (format:') ||
                line.includes('Examples of what') ||
                line.includes('DO NOT INCLUDE:') ||
                line.includes('INCLUDE ONLY:') ||
                line.length < 5) {
                return;
            }

            const parts = line.split('|').map(part => part.trim());

            if (parts.length >= 3) {
                const certName = this.cleanValue(parts[0]).toLowerCase();
                const issuer = this.cleanValue(parts[1]).toLowerCase();

                // Check if this looks like a certification
                const hasExcludeKeyword = excludeKeywords.some(keyword =>
                    certName.includes(keyword) || issuer.includes(keyword)
                );

                const hasIncludeKeyword = includeKeywords.some(keyword =>
                    certName.includes(keyword) || issuer.includes(keyword)
                );

                // Be very conservative - only include if:
                // 1. Has include keywords OR
                // 2. Doesn't have exclude keywords AND looks like cert format
                const looksLikeCert = (
                    hasIncludeKeyword ||
                    (!hasExcludeKeyword && (
                        certName.length > 5 &&
                        issuer.length > 2 &&
                        !certName.includes('experience') &&
                        !certName.includes('worked') &&
                        !certName.includes('responsible')
                    ))
                );

                if (looksLikeCert) {
                    const certification = {
                        name: this.cleanValue(parts[0]),
                        issuer: this.cleanValue(parts[1]),
                        date: this.cleanValue(parts[2]),
                        url: this.cleanValue(parts[3] || ''),
                        type: this.cleanValue(parts[4] || 'Professional')
                    };

                    // Final validation - make sure it has proper structure
                    if (certification.name &&
                        certification.issuer &&
                        certification.name.length > 3 &&
                        certification.issuer.length > 2) {

                        certifications.push(certification);
                        console.log(`Added certification ${certifications.length}: ${certification.name} from ${certification.issuer}`);
                    } else {
                        console.log(`Rejected invalid certification: ${line}`);
                    }
                } else {
                    console.log(`Rejected non-certification: "${certName}" - doesn't meet certification criteria`);
                }
            }
        });

        if (certifications.length === 0) {
            console.log('No valid certifications could be parsed from response');
            throw new Error('No clear certifications found in CV');
        }

        console.log(`Successfully parsed ${certifications.length} conservative certifications`);
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
        console.log('No clear certifications found - section will be hidden');

        // Return empty certifications array - section will be hidden in UI
        return { certifications: [] };
    }
}

module.exports = CertificationsProcessor;