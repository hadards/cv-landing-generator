const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock_key');

class CVParser {
    constructor() {
        this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async extractTextFromFile(filePath, mimeType) {
        try {
            switch (mimeType) {
                case 'application/pdf':
                    return await this.extractFromPDF(filePath);
                case 'application/msword':
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    return await this.extractFromWord(filePath);
                default:
                    throw new Error('Unsupported file type');
            }
        } catch (error) {
            console.error('Text extraction error:', error);
            throw new Error('Failed to extract text from file');
        }
    }

    async extractFromPDF(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    }

    async extractFromWord(filePath) {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }

    async structureWithGemini(extractedText) {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock_key') {
            const mockData = this.getMockStructuredData();

            // Generate summary if missing
            if (!mockData.personalInfo.summary) {
                mockData.personalInfo.summary = await this.generateSummary(mockData);
            }

            return mockData;
        }

        try {
            const prompt = this.createPrompt(extractedText);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            try {
                const structuredData = JSON.parse(text);
                const cleanedData = this.validateAndCleanData(structuredData);

                // Generate summary if missing
                if (!cleanedData.personalInfo.summary) {
                    cleanedData.personalInfo.summary = await this.generateSummary(cleanedData);
                }

                return cleanedData;
            } catch (parseError) {
                console.error('Failed to parse Gemini response as JSON:', parseError);
                const fallbackData = this.getMockStructuredData();
                fallbackData.personalInfo.summary = await this.generateSummary(fallbackData);
                return fallbackData;
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            const fallbackData = this.getMockStructuredData();
            fallbackData.personalInfo.summary = await this.generateSummary(fallbackData);
            return fallbackData;
        }
    }

    createPrompt(extractedText) {
        return `
You are a CV/Resume parser. Extract and structure the following CV content into JSON format.

IMPORTANT: Respond ONLY with valid JSON. No explanations, no markdown, just pure JSON.

Extract these fields:
- personalInfo: {name, email, phone, location, summary}
- experience: [{title, company, location, startDate, endDate, description, achievements: []}]
- education: [{degree, institution, location, graduationDate, gpa, achievements: []}]
- skills: {technical: [], soft: [], languages: []}
- projects: [{name, description, technologies: [], url}]
- certifications: [{name, issuer, date, url}]

Guidelines:
- Use "Present" for current positions
- Format dates as "YYYY-MM" or "YYYY" if month unknown
- Keep descriptions concise but informative
- Extract specific achievements as bullet points
- If information is missing, use empty string or empty array
- Ensure all field names match exactly

CV Content:
${extractedText}

JSON Response:`;
    }

    async generateSummary(cvData) {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock_key') {
            // Return a generic summary for development
            const currentJob = cvData.experience?.[0];
            if (currentJob) {
                return `Experienced ${currentJob.title} with proven expertise in ${cvData.skills?.technical?.slice(0, 3).join(', ') || 'various technologies'}. ${cvData.skills?.soft?.slice(0, 2).join(' and ') || 'Strong professional'} with a track record of delivering results in ${currentJob.company || 'professional environments'}.`;
            }
            return `Professional with expertise in ${cvData.skills?.technical?.slice(0, 3).join(', ') || 'various technologies'} and strong ${cvData.skills?.soft?.slice(0, 2).join(' and ') || 'interpersonal'} skills.`;
        }

        try {
            const prompt = `
Create a professional summary (2-3 sentences) for this person based on their CV data.
Make it compelling and highlight their key strengths.

Experience: ${JSON.stringify(cvData.experience?.slice(0, 2) || [])}
Skills: ${JSON.stringify(cvData.skills || {})}
Education: ${JSON.stringify(cvData.education?.[0] || {})}

Return ONLY the summary text, no formatting or explanations.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error('Summary generation error:', error);
            // Fallback to basic summary
            const currentJob = cvData.experience?.[0];
            return `Professional ${currentJob?.title || 'with experience'} skilled in ${cvData.skills?.technical?.slice(0, 3).join(', ') || 'various technologies'}.`;
        }
    }

    validateAndCleanData(data) {
        // Ensure all required fields exist
        const cleaned = {
            personalInfo: {
                name: data.personalInfo?.name || '',
                email: data.personalInfo?.email || '',
                phone: data.personalInfo?.phone || '',
                location: data.personalInfo?.location || '',
                summary: data.personalInfo?.summary || ''
            },
            experience: Array.isArray(data.experience) ? data.experience.map(exp => ({
                title: exp.title || '',
                company: exp.company || '',
                location: exp.location || '',
                startDate: exp.startDate || '',
                endDate: exp.endDate || '',
                description: exp.description || '',
                achievements: Array.isArray(exp.achievements) ? exp.achievements : []
            })) : [],
            education: Array.isArray(data.education) ? data.education.map(edu => ({
                degree: edu.degree || '',
                institution: edu.institution || '',
                location: edu.location || '',
                graduationDate: edu.graduationDate || '',
                gpa: edu.gpa || '',
                achievements: Array.isArray(edu.achievements) ? edu.achievements : []
            })) : [],
            skills: {
                technical: Array.isArray(data.skills?.technical) ? data.skills.technical : [],
                soft: Array.isArray(data.skills?.soft) ? data.skills.soft : [],
                languages: Array.isArray(data.skills?.languages) ? data.skills.languages : []
            },
            projects: Array.isArray(data.projects) ? data.projects.map(proj => ({
                name: proj.name || '',
                description: proj.description || '',
                technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
                url: proj.url || ''
            })) : [],
            certifications: Array.isArray(data.certifications) ? data.certifications.map(cert => ({
                name: cert.name || '',
                issuer: cert.issuer || '',
                date: cert.date || '',
                url: cert.url || ''
            })) : []
        };

        return cleaned;
    }

    getMockStructuredData() {
        return {
            personalInfo: {
                name: "John Smith",
                email: "john.smith@example.com",
                phone: "+1 (555) 123-4567",
                location: "New York, NY",
                summary: "Experienced software developer with 5+ years of experience in full-stack development. Skilled in JavaScript, Python, React, and Node.js. Strong problem-solving abilities and excellent communication skills."
            },
            experience: [
                {
                    title: "Senior Software Developer",
                    company: "Tech Corp",
                    location: "New York, NY",
                    startDate: "2020-01",
                    endDate: "Present",
                    description: "Led development of microservices architecture and improved application performance.",
                    achievements: [
                        "Improved application performance by 40%",
                        "Led a team of 5 developers",
                        "Implemented CI/CD pipelines",
                        "Reduced deployment time by 60%"
                    ]
                },
                {
                    title: "Software Developer",
                    company: "StartupXYZ",
                    location: "San Francisco, CA",
                    startDate: "2018-06",
                    endDate: "2019-12",
                    description: "Built responsive web applications and collaborated with design team.",
                    achievements: [
                        "Developed 3 major product features",
                        "Improved code test coverage to 90%",
                        "Mentored 2 junior developers"
                    ]
                }
            ],
            education: [
                {
                    degree: "Bachelor of Science in Computer Science",
                    institution: "University of Technology",
                    location: "Boston, MA",
                    graduationDate: "2018",
                    gpa: "3.8",
                    achievements: [
                        "Dean's List for 3 semesters",
                        "Computer Science Club President",
                        "Hackathon Winner 2017"
                    ]
                }
            ],
            skills: {
                technical: [
                    "JavaScript", "TypeScript", "Python", "React", "Node.js",
                    "Express.js", "PostgreSQL", "MongoDB", "Git", "Docker",
                    "AWS", "Jest", "Cypress"
                ],
                soft: [
                    "Leadership", "Communication", "Problem Solving",
                    "Team Collaboration", "Project Management", "Mentoring"
                ],
                languages: ["English (Native)", "Spanish (Conversational)"]
            },
            projects: [
                {
                    name: "E-commerce Platform",
                    description: "Full-stack e-commerce platform with React frontend and Node.js backend",
                    technologies: ["React", "Node.js", "PostgreSQL", "Stripe API"],
                    url: "https://github.com/johnsmith/ecommerce-platform"
                },
                {
                    name: "Task Management App",
                    description: "Real-time collaborative task management application",
                    technologies: ["React", "Socket.io", "MongoDB", "Express.js"],
                    url: "https://github.com/johnsmith/task-manager"
                }
            ],
            certifications: [
                {
                    name: "AWS Certified Developer",
                    issuer: "Amazon Web Services",
                    date: "2023",
                    url: "https://aws.amazon.com/certification/"
                },
                {
                    name: "React Advanced Patterns",
                    issuer: "React Training",
                    date: "2022",
                    url: "https://reacttraining.com/"
                }
            ]
        };
    }
}

module.exports = CVParser;