// File: lib/cv-parser.js
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class CVParser {
    constructor() {
        // Validate API key on construction
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is required for CV processing');
        }

        // Log API key info for debugging (safely)
        console.log('Initializing Gemini with API key length:', process.env.GEMINI_API_KEY.length);
        console.log('API key starts with:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');

        try {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            console.log('✅ Gemini AI initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Gemini AI:', error);
            throw new Error('Failed to initialize Gemini AI: ' + error.message);
        }
    }

    async extractTextFromFile(filePath, mimeType) {
        try {
            console.log('Extracting text from:', filePath, 'Type:', mimeType);
            
            switch (mimeType) {
                case 'application/pdf':
                    return await this.extractFromPDF(filePath);
                case 'application/msword':
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    return await this.extractFromWord(filePath);
                default:
                    throw new Error('Unsupported file type: ' + mimeType);
            }
        } catch (error) {
            console.error('Text extraction error:', error);
            throw new Error('Failed to extract text from file: ' + error.message);
        }
    }

    async extractFromPDF(filePath) {
        console.log('Extracting from PDF...');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        console.log('PDF extraction successful, text length:', data.text.length);
        return data.text;
    }

    async extractFromWord(filePath) {
        console.log('Extracting from Word document...');
        const result = await mammoth.extractRawText({ path: filePath });
        console.log('Word extraction successful, text length:', result.value.length);
        return result.value;
    }

    async structureWithGemini(extractedText) {
        try {
            console.log('Processing CV with Gemini AI...');
            console.log('Input text length:', extractedText.length);
            
            // Limit text length to avoid API limits
            const maxLength = 30000; // Gemini 1.5 Flash limit
            const textToProcess = extractedText.length > maxLength 
                ? extractedText.substring(0, maxLength) + '\n\n[Text truncated due to length]'
                : extractedText;
            
            console.log('Processing text length:', textToProcess.length);
            
            // Step 1: Extract basic structured data
            const basicData = await this.extractBasicStructure(textToProcess);
            console.log('Basic structure extracted for:', basicData.personalInfo?.name || 'Unknown');

            // Step 2: Generate enhanced content for each section
            const enhancedData = await this.enhanceWithAI(basicData, textToProcess);
            console.log('Enhanced data generated');

            // Step 3: Validate and clean the final data
            const finalData = this.validateAndCleanData(enhancedData);
            
            return finalData;
            
        } catch (error) {
            console.error('Gemini processing error:', error);
            
            // Provide more specific error messages
            if (error.message.includes('API_KEY_INVALID')) {
                throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in the .env file.');
            } else if (error.message.includes('QUOTA_EXCEEDED')) {
                throw new Error('Gemini API quota exceeded. Please check your API usage limits.');
            } else if (error.message.includes('PERMISSION_DENIED')) {
                throw new Error('Permission denied for Gemini API. Please verify your API key permissions.');
            } else {
                throw new Error('Failed to process CV with AI: ' + error.message);
            }
        }
    }

    async extractBasicStructure(extractedText) {
        const prompt = `
You are a professional CV/Resume parser. Extract and structure the CV content into JSON format.

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON (no markdown, no explanations)
- Escape ALL special characters in strings (\\n, \\", \\t, etc.)
- Use \\n for line breaks in descriptions
- Replace bullets (•) with "- " in text
- NO trailing commas
- Start with { and end with }

Extract these fields:
- personalInfo: {name, email, phone, location}
- experience: [{title, company, location, startDate, endDate, description, achievements: []}]
- education: [{degree, institution, location, graduationDate, gpa, achievements: []}]
- skills: {technical: [], soft: [], languages: []}
- projects: [{name, description, technologies: [], url}]
- certifications: [{name, issuer, date, url}]

Data Guidelines:
- Use "Present" for current positions
- Format dates as "YYYY-MM" or "YYYY"
- Convert bullet points to numbered or dashed lists in descriptions
- Keep descriptions factual and properly escaped
- Extract specific achievements as separate array items
- Use empty string "" or empty array [] for missing data
- Do NOT include summary or aboutMe fields

CV Content:
${extractedText}

Return properly escaped JSON:`;

        console.log('Sending basic structure request to Gemini...');
        console.log('Prompt length:', prompt.length);

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log('Received response from Gemini, length:', text.length);

            // Clean the response - remove markdown code blocks if present
            let cleanedText = text.trim();
            
            // Remove ```json and ``` if present
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            // Remove any leading/trailing whitespace
            cleanedText = cleanedText.trim();
            
            // Fix common JSON issues from Gemini
            cleanedText = this.sanitizeJsonResponse(cleanedText);
            
            console.log('Cleaned response length:', cleanedText.length);
            console.log('Cleaned response starts with:', cleanedText.substring(0, 100) + '...');

            try {
                const parsedData = JSON.parse(cleanedText);
                console.log('✅ Successfully parsed JSON from Gemini');
                return parsedData;
            } catch (parseError) {
                console.error('❌ Failed to parse JSON from Gemini:', parseError);
                console.log('Error at position:', parseError.message);
                console.log('Problematic area:', cleanedText.substring(Math.max(0, 4390-50), 4450));
                
                // Try to fix and parse again
                const fixedText = this.fixJsonErrors(cleanedText);
                try {
                    const parsedData = JSON.parse(fixedText);
                    console.log('✅ Successfully parsed JSON after fixing');
                    return parsedData;
                } catch (secondError) {
                    console.error('❌ Still failed after fixing:', secondError);
                    throw new Error('Invalid JSON response from AI');
                }
            }
        } catch (apiError) {
            console.error('❌ Gemini API call failed:', apiError);
            throw apiError;
        }
    }

    sanitizeJsonResponse(jsonString) {
        // Fix common JSON issues that Gemini might produce
        let fixed = jsonString;
        
        // Replace problematic characters in strings
        fixed = fixed.replace(/\n/g, '\\n');           // Fix unescaped newlines
        fixed = fixed.replace(/\r/g, '\\r');           // Fix unescaped carriage returns
        fixed = fixed.replace(/\t/g, '\\t');           // Fix unescaped tabs
        fixed = fixed.replace(/\\/g, '\\\\');          // Fix unescaped backslashes (but avoid double-escaping)
        fixed = fixed.replace(/\\\\n/g, '\\n');        // Fix double-escaped newlines
        fixed = fixed.replace(/\\\\r/g, '\\r');        // Fix double-escaped carriage returns
        fixed = fixed.replace(/\\\\t/g, '\\t');        // Fix double-escaped tabs
        
        // Remove or replace problematic Unicode characters
        fixed = fixed.replace(/•/g, '\\u2022');        // Bullet points
        fixed = fixed.replace(/–/g, '\\u2013');        // En dash
        fixed = fixed.replace(/—/g, '\\u2014');        // Em dash
        fixed = fixed.replace(/'/g, "\\'");            // Smart quotes
        fixed = fixed.replace(/'/g, "\\'");            // Smart quotes
        fixed = fixed.replace(/"/g, '\\"');            // Smart quotes
        fixed = fixed.replace(/"/g, '\\"');            // Smart quotes
        
        return fixed;
    }

    fixJsonErrors(jsonString) {
        // More aggressive JSON fixing
        let fixed = jsonString;
        
        // Try to find and fix the specific error area
        // Replace unescaped quotes in string values
        fixed = fixed.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
            return `"${p1}\\"${p2}\\"${p3}"`;
        });
        
        // Remove trailing commas
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix incomplete strings at the end
        if (fixed.match(/[^\\]"[^"]*$/)) {
            fixed += '"';
        }
        
        return fixed;
    }

    async enhanceWithAI(basicData, originalText) {
        console.log('Enhancing data with AI for each section...');
        
        try {
            // Generate professional summary
            const summary = await this.generateSummary(basicData, originalText);
            
            // Generate about me section
            const aboutMe = await this.generateAboutMe(basicData, originalText);
            
            // Enhance experience descriptions (simplified for now to avoid API issues)
            const enhancedExperience = basicData.experience || [];
            
            // Enhance education descriptions (simplified for now)
            const enhancedEducation = basicData.education || [];
            
            // Enhance project descriptions (simplified for now)
            const enhancedProjects = basicData.projects || [];
            
            // Enhance skills organization
            const enhancedSkills = await this.enhanceSkills(basicData.skills, originalText);

            return {
                ...basicData,
                personalInfo: {
                    ...basicData.personalInfo,
                    summary: summary,
                    aboutMe: aboutMe
                },
                experience: enhancedExperience,
                education: enhancedEducation,
                projects: enhancedProjects,
                skills: enhancedSkills
            };
        } catch (error) {
            console.error('Enhancement error:', error);
            // Return basic data if enhancement fails
            return {
                ...basicData,
                personalInfo: {
                    ...basicData.personalInfo,
                    summary: this.generateFallbackSummary(basicData),
                    aboutMe: this.generateFallbackAboutMe(basicData)
                }
            };
        }
    }

    async generateSummary(cvData, originalText) {
        console.log('Generating professional summary...');
        
        const prompt = `
Based on this CV data, create a compelling professional summary (2-3 sentences) for any profession.

Personal Info: ${JSON.stringify(cvData.personalInfo || {})}
Experience: ${JSON.stringify((cvData.experience || []).slice(0, 2))}
Skills: ${JSON.stringify(cvData.skills || {})}
Education: ${JSON.stringify((cvData.education || []).slice(0, 1))}

Requirements:
- 2-3 sentences maximum
- Work for ANY profession (tech, healthcare, finance, education, etc.)
- Highlight years of experience if determinable
- Mention key skills and expertise areas relevant to their field
- Sound professional and compelling
- Be specific to this person's actual background and industry
- Use industry-appropriate language

Return ONLY the summary text, no formatting or explanations.
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const summary = response.text().trim();
            console.log('✅ Summary generated successfully');
            return summary;
        } catch (error) {
            console.error('Summary generation failed:', error);
            return this.generateFallbackSummary(cvData);
        }
    }

    async generateAboutMe(cvData, originalText) {
        console.log('Generating About Me section...');
        
        const prompt = `
Create a compelling "About Me" section (3-4 sentences) for this person's professional landing page.
This should work for ANY profession and industry.

Personal Info: ${JSON.stringify(cvData.personalInfo || {})}
Experience: ${JSON.stringify((cvData.experience || []).slice(0, 2))}
Skills: ${JSON.stringify(cvData.skills || {})}
Education: ${JSON.stringify((cvData.education || []).slice(0, 1))}

Requirements:
- 3-4 sentences
- Write in first person ("I am...")
- Tell their professional journey/story appropriate to their industry
- Highlight what makes them unique in their field
- Show personality while staying professional
- Work for any profession (tech, healthcare, finance, marketing, etc.)
- Use industry-appropriate language and tone
- Be specific to this person's actual background

Return ONLY the about me text, no formatting or explanations.
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const aboutMe = response.text().trim();
            console.log('✅ About Me generated successfully');
            return aboutMe;
        } catch (error) {
            console.error('About Me generation failed:', error);
            return this.generateFallbackAboutMe(cvData);
        }
    }

    async enhanceSkills(skills, originalText) {
        console.log('Organizing and enhancing skills...');
        
        const prompt = `
Organize and enhance the skills section based on the CV data.
Categorize skills appropriately and add any missing ones from the text.

Current Skills: ${JSON.stringify(skills || {})}

Requirements:
- Categorize skills into technical, soft, and languages
- Add any skills mentioned in CV but missing from current data
- Remove duplicates
- Order by relevance/importance
- Ensure technical skills are specific technologies/tools
- Ensure soft skills are professional competencies

CRITICAL: Return ONLY valid JSON. No markdown blocks. No explanations.
Start with { and end with } only.

Example format:
{"technical": ["Python", "JavaScript"], "soft": ["Leadership"], "languages": ["English"]}
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const rawText = response.text().trim();
            
            // Clean response - remove markdown if present
            let cleanedText = rawText;
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            cleanedText = cleanedText.trim();
            
            const enhancedSkills = JSON.parse(cleanedText);
            console.log('✅ Skills enhanced successfully');
            
            return {
                technical: Array.isArray(enhancedSkills.technical) ? enhancedSkills.technical : skills?.technical || [],
                soft: Array.isArray(enhancedSkills.soft) ? enhancedSkills.soft : skills?.soft || [],
                languages: Array.isArray(enhancedSkills.languages) ? enhancedSkills.languages : skills?.languages || []
            };
        } catch (error) {
            console.error('Skills enhancement failed:', error);
            return skills || { technical: [], soft: [], languages: [] };
        }
    }

    generateFallbackSummary(cvData) {
        const currentJob = cvData.experience?.[0];
        const skills = cvData.skills?.technical?.slice(0, 3) || cvData.skills?.soft?.slice(0, 3) || [];
        
        if (currentJob) {
            return `Experienced ${currentJob.title} with proven expertise in ${skills.join(', ') || 'their field'}. Strong professional with a track record of delivering results at ${currentJob.company || 'leading organizations'}.`;
        }
        
        const education = cvData.education?.[0];
        if (education) {
            return `${education.degree} graduate with expertise in ${skills.join(', ') || 'their field'} and strong ${cvData.skills?.soft?.slice(0, 2).join(' and ') || 'professional'} skills.`;
        }
        
        return `Professional with expertise in ${skills.join(', ') || 'various fields'} and strong ${cvData.skills?.soft?.slice(0, 2).join(' and ') || 'interpersonal'} skills.`;
    }

    generateFallbackAboutMe(cvData) {
        const currentJob = cvData.experience?.[0];
        const yearsOfExperience = this.calculateYearsOfExperience(cvData.experience);
        const education = cvData.education?.[0];
        const skills = cvData.skills?.technical?.slice(0, 2) || cvData.skills?.soft?.slice(0, 2) || [];
        
        if (currentJob) {
            return `I am a passionate ${currentJob.title} with ${yearsOfExperience}+ years of experience in ${skills.join(' and ') || 'my field'}. I thrive in professional environments where I can leverage my expertise in ${skills.concat(cvData.skills?.soft?.slice(0, 2) || []).slice(0, 3).join(', ') || 'various areas'} to drive meaningful results. I am committed to continuous learning and excellence in my profession.`;
        }
        
        if (education) {
            return `I am a dedicated professional with a strong foundation in ${education.degree}. My expertise in ${skills.join(' and ') || 'various areas'} allows me to contribute effectively to ${education.degree.includes('Engineering') ? 'technical projects' : education.degree.includes('Business') ? 'business initiatives' : 'professional endeavors'}. I am passionate about applying my knowledge to create positive impact in my field.`;
        }
        
        return `I am a committed professional with expertise in ${skills.join(' and ') || 'various areas'}. I bring strong ${cvData.skills?.soft?.slice(0, 2).join(' and ') || 'problem-solving and communication'} skills to every project I undertake. I am dedicated to continuous improvement and delivering exceptional results.`;
    }

    calculateYearsOfExperience(experience) {
        if (!experience || experience.length === 0) return 0;
        
        let totalMonths = 0;
        experience.forEach(exp => {
            const startDate = new Date(exp.startDate + '-01');
            const endDate = exp.endDate?.toLowerCase() === 'present' ? new Date() : new Date(exp.endDate + '-01');
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                              (endDate.getMonth() - startDate.getMonth());
                totalMonths += months;
            }
        });
        
        return Math.floor(totalMonths / 12);
    }

    validateAndCleanData(data) {
        console.log('Validating and cleaning final data...');
        
        // Ensure all required fields exist with proper structure
        const cleaned = {
            personalInfo: {
                name: data.personalInfo?.name || '',
                email: data.personalInfo?.email || '',
                phone: data.personalInfo?.phone || '',
                location: data.personalInfo?.location || '',
                summary: data.personalInfo?.summary || '',
                aboutMe: data.personalInfo?.aboutMe || ''
            },
            experience: Array.isArray(data.experience) ? data.experience.map(exp => ({
                title: exp.title || '',
                company: exp.company || '',
                location: exp.location || '',
                startDate: exp.startDate || '',
                endDate: exp.endDate || '',
                description: exp.description || '',
                achievements: Array.isArray(exp.achievements) ? exp.achievements.filter(a => a && a.trim()) : []
            })).filter(exp => exp.title && exp.company) : [],
            education: Array.isArray(data.education) ? data.education.map(edu => ({
                degree: edu.degree || '',
                institution: edu.institution || '',
                location: edu.location || '',
                graduationDate: edu.graduationDate || '',
                gpa: edu.gpa || '',
                achievements: Array.isArray(edu.achievements) ? edu.achievements.filter(a => a && a.trim()) : []
            })).filter(edu => edu.degree && edu.institution) : [],
            skills: {
                technical: Array.isArray(data.skills?.technical) ? 
                    data.skills.technical.filter(s => s && s.trim()).slice(0, 15) : [],
                soft: Array.isArray(data.skills?.soft) ? 
                    data.skills.soft.filter(s => s && s.trim()).slice(0, 10) : [],
                languages: Array.isArray(data.skills?.languages) ? 
                    data.skills.languages.filter(s => s && s.trim()).slice(0, 5) : []
            },
            projects: Array.isArray(data.projects) ? data.projects.map(proj => ({
                name: proj.name || '',
                description: proj.description || '',
                technologies: Array.isArray(proj.technologies) ? 
                    proj.technologies.filter(t => t && t.trim()) : [],
                url: proj.url || ''
            })).filter(proj => proj.name && proj.description) : [],
            certifications: Array.isArray(data.certifications) ? data.certifications.map(cert => ({
                name: cert.name || '',
                issuer: cert.issuer || '',
                date: cert.date || '',
                url: cert.url || ''
            })).filter(cert => cert.name && cert.issuer) : []
        };

        // Ensure we have at least some content
        if (!cleaned.personalInfo.name) {
            throw new Error('Unable to extract name from CV');
        }

        if (cleaned.experience.length === 0 && cleaned.education.length === 0) {
            throw new Error('Unable to extract experience or education from CV');
        }

        console.log('✅ Data validation completed successfully for:', cleaned.personalInfo.name);
        return cleaned;
    }
}

module.exports = CVParser;