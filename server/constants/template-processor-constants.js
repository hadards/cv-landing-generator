// File: constants/template-processor-constants.js
// Centralized constants for template processor - no magic values!

module.exports = {
    // File handling
    TEMPLATE_FILES: ['styles.css', 'script.js', 'README.md'],
    GENERATED_FILES: ['index.html', 'styles.css', 'script.js', 'data.js', 'README.md'],

    // Parsing thresholds
    MIN_JOB_LINE_LENGTH: 20,
    SUMMARY_EXCERPT_LENGTH: 150,
    SKILLS_KEYWORD_LIMIT: 10,
    MAX_YEARS_CAP: 50,
    DEFAULT_YEARS_EXPERIENCE: 3,

    // Text patterns
    BULLET_CHARS: ['•', '-', '*'],

    // Regular expressions
    PATTERNS: {
        DATE: /\d{1,2}\/\d{4}|\d{4}/,
        DATE_RANGE: /(\d{1,2}\/\d{4})\s*[-–]\s*((?:\d{1,2}\/\d{4})|Present)/i,
        BULLET_PREFIX: /^[•\-*]\s*/,
        TITLE_TAG: /<title>.*?<\/title>/,
        HERO_AVATAR_DIV: /<div id="hero-avatar"[^>]*class="[^"]*"[^>]*>[\s\S]*?<\/div>/
    },

    // Default values
    DEFAULTS: {
        POSITION_TITLE: 'Position',
        COMPANY_NAME: 'Company',
        END_DATE: 'Present',
        SITE_URL: 'https://your-profile.vercel.app'
    },

    // Job title keywords for parsing
    JOB_KEYWORDS: [
        'Lead',
        'Manager',
        'Director',
        'Developer',
        'Engineer',
        'Analyst',
        'Specialist',
        'Consultant'
    ],

    // Skill categories
    SKILL_CATEGORIES: {
        TECHNICAL: 'technical',
        PROFESSIONAL: 'professional',
        SOFT: 'soft',
        LANGUAGES: 'languages'
    },

    // Section keywords
    SECTION_KEYWORDS: {
        KEY_ACHIEVEMENTS: 'key achievement'
    }
};
