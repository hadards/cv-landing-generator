// File: lib/utils/text-cleaner.js

class TextCleaner {
    
    static cleanExtractedText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        let cleaned = text;

        // Remove excessive whitespace
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        // Remove page breaks and form feeds
        cleaned = cleaned.replace(/\f/g, '\n');
        
        // Normalize line breaks
        cleaned = cleaned.replace(/\r\n/g, '\n');
        cleaned = cleaned.replace(/\r/g, '\n');
        
        // Remove excessive line breaks (more than 2 consecutive)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        // Clean up bullet points and formatting
        cleaned = cleaned.replace(/[•▪▫‣⁃]/g, '- ');
        cleaned = cleaned.replace(/[→←↑↓]/g, ' ');
        
        // Remove weird characters that cause issues
        cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width spaces
        cleaned = cleaned.replace(/[^\x00-\x7F\u00A0-\u024F\u1E00-\u1EFF]/g, ' '); // Keep basic Latin + extensions
        
        // Trim and normalize
        cleaned = cleaned.trim();
        
        console.log(`Text cleaned: ${text.length} -> ${cleaned.length} characters`);
        return cleaned;
    }

    static extractContactInfo(text) {
        const contactInfo = {
            emails: [],
            phones: [],
            locations: []
        };

        // Extract emails
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailRegex) || [];
        contactInfo.emails = [...new Set(emails)]; // Remove duplicates

        // Extract phone numbers (various formats)
        const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\+?[0-9]{1,4}[-.\s]?[0-9]{2,3}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/g;
        const phones = text.match(phoneRegex) || [];
        contactInfo.phones = [...new Set(phones)];

        // Extract potential locations (basic patterns)
        const locationKeywords = ['address', 'location', 'city', 'state', 'country'];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            const lowerLine = line.toLowerCase();
            if (locationKeywords.some(keyword => lowerLine.includes(keyword))) {
                // Clean up the line and add if it looks like location info
                const cleanLocation = line.replace(/^(address|location|city|state|country)[\s:]*/, '').trim();
                if (cleanLocation.length > 3 && cleanLocation.length < 100) {
                    contactInfo.locations.push(cleanLocation);
                }
            }
        });

        console.log('Contact info extracted:', {
            emails: contactInfo.emails.length,
            phones: contactInfo.phones.length,
            locations: contactInfo.locations.length
        });

        return contactInfo;
    }

    static extractNameCandidates(text) {
        const candidates = [];
        const lines = text.split('\n');
        
        // Look for name patterns in the first few lines
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            
            // Skip if too short or too long
            if (line.length < 3 || line.length > 50) continue;
            
            // Skip if contains numbers or special chars (likely not a name)
            if (/[0-9@#$%^&*()+=\[\]{}|\\:";'<>?,./]/.test(line)) continue;
            
            // Skip common CV headers
            const skipWords = ['resume', 'curriculum', 'vitae', 'cv', 'profile', 'summary', 'experience', 'education', 'skills'];
            if (skipWords.some(word => line.toLowerCase().includes(word))) continue;
            
            // Check if it looks like a name (2-4 words, proper case)
            const words = line.split(/\s+/);
            if (words.length >= 2 && words.length <= 4) {
                if (words.every(word => /^[A-Za-z][a-z]*$/.test(word) && word.length > 1)) {
                    candidates.push(line);
                }
            }
        }

        console.log(`Name candidates found: ${candidates.length}`);
        return candidates;
    }

    static limitTextLength(text, maxLength = 25000) {
        if (!text || text.length <= maxLength) {
            return text;
        }

        // Try to cut at a sentence or paragraph boundary
        const truncated = text.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastNewline = truncated.lastIndexOf('\n');
        
        const cutPoint = Math.max(lastPeriod, lastNewline);
        
        if (cutPoint > maxLength * 0.8) {
            return truncated.substring(0, cutPoint + 1) + '\n\n[Content truncated due to length]';
        }
        
        return truncated + '\n\n[Content truncated due to length]';
    }

    static removeCommonHeaders(text) {
        const lines = text.split('\n');
        const cleanedLines = [];
        
        const skipPatterns = [
            /^(page \d+ of \d+|page \d+)$/i,
            /^(curriculum vitae|resume|cv)$/i,
            /^(personal information|contact information)$/i,
            /^(confidential|private)$/i,
        ];

        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Skip empty lines at the beginning
            if (cleanedLines.length === 0 && !trimmed) {
                return;
            }
            
            // Skip lines that match common headers
            if (!skipPatterns.some(pattern => pattern.test(trimmed))) {
                cleanedLines.push(line);
            }
        });

        return cleanedLines.join('\n');
    }

    static prepareForAI(text) {
        // Full cleaning pipeline for AI processing
        let prepared = text;
        
        prepared = this.cleanExtractedText(prepared);
        prepared = this.removeCommonHeaders(prepared);
        prepared = this.limitTextLength(prepared);
        
        console.log(`🤖 Text prepared for AI: ${prepared.length} characters`);
        return prepared;
    }
}

module.exports = TextCleaner;