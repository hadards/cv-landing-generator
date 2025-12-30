# CV Processor Improvements Design

**Date:** 2025-12-30
**Author:** Design collaboration session
**Status:** Approved for implementation

## Problem Statement

The current CV processor (`intelligent-cv-processor-gemini.js`) has two major issues:

1. **Incomplete data extraction** - Randomly misses data across all CV sections (experience, skills, education, projects, certifications)
2. **High token usage** - Sends full CV text to LLM 3 times (once per processing step), consuming 9k-12k tokens per CV

Additional concerns:
- Tech-biased extraction (assumes software developers, ignores teachers, chefs, lawyers, etc.)
- Complex session management with 3-step processing
- Slower processing time (15-20 seconds)

## Solution Overview

**Replace 3-step sequential processing with single-pass comprehensive extraction**

- **Single LLM call** with profession-agnostic comprehensive prompt
- **JSON schema-first approach** leveraging Gemini 2.5's structured output capabilities
- **Universal field interpretation** that works for all professions
- **60-70% token reduction** (3.5k-5k tokens vs 9k-12k)
- **Better accuracy** - LLM sees full context in one pass

## Design Decisions

### 1. Single-Pass vs Multi-Step Processing

**Decision:** Single comprehensive extraction pass

**Rationale:**
- Modern LLMs (Gemini 2.5 Flash) can handle complex extraction in one call
- Full context awareness reduces missed data
- Massive token savings (66% fewer API calls)
- Simpler code with fewer failure points

**Trade-offs:**
- Slightly longer prompt (~1.5k tokens vs ~500 tokens per step)
- Still much cheaper overall: 3.5k-5k total vs 9k-12k
- Better completeness outweighs single-prompt complexity

### 2. Profession-Agnostic Design

**Decision:** No closed lists of professions, let LLM infer domain

**Challenge:** CVs can be from ANY profession (developers, teachers, chefs, lawyers, nurses, real estate agents, etc.)

**Solution:**
- Remove tech-specific terminology from prompts
- Use universal field names with flexible interpretation
- Provide examples across domains to show pattern, not constrain
- Trust LLM to understand domain-specific context

**Example:**
```
"technical" skills means:
- Software: JavaScript, React, AWS
- Chef: French cuisine, knife skills, menu development
- Teacher: Curriculum design, differentiated instruction
- Lawyer: Legal research, contract law, litigation
```

### 3. JSON Schema-First Prompting

**Decision:** Comprehensive JSON schema + clear extraction instructions

**Why this works for Gemini 2.5:**
- Native structured output support
- Excellent schema following without few-shot examples
- More token-efficient than examples
- Produces consistent, parseable JSON

**Prompt Structure:**
1. **Critical instructions** - HOW to extract (read full doc, be thorough, handle missing data)
2. **Complete JSON schema** - WHAT structure to return
3. **Field interpretations** - Context on what each field means across professions
4. **Profession examples** - Show variety without constraining
5. **Validation reminders** - Final checks before returning

## Technical Implementation

### Core Changes to `intelligent-cv-processor-gemini.js`

#### 1. Replace Multi-Step Processing

**Remove:**
- `extractBasicInfo(cvText)`
- `extractProfessional(cvText, context)`
- `extractAdditional(cvText, context)`
- `processWithMemory(cvText, sessionId)` (3-step version)

**Add:**
```javascript
async extractAllData(cvText) {
  const prompt = this.buildComprehensivePrompt(cvText);

  try {
    const result = await this.generateContentSafe(prompt);
    const response = result.response.text();
    const parsed = this.parseAIJsonResponse(response);

    return this.normalizeExtractedData(parsed);
  } catch (error) {
    console.error('Single-pass extraction failed:', error);
    throw new Error('Failed to extract CV data: ' + error.message);
  }
}
```

#### 2. Comprehensive Prompt Builder

```javascript
buildComprehensivePrompt(cvText) {
  return `
You are an expert CV/resume analyzer. Extract ALL information from this CV into structured JSON.

=== CRITICAL INSTRUCTIONS ===

1. READ THE ENTIRE DOCUMENT
   - Don't stop after first section
   - Check headers, footers, sidebars
   - Look for information everywhere

2. IDENTIFY THE PROFESSION
   - Determine field/industry from job titles and experience
   - Could be ANY profession: software, teaching, culinary, legal, healthcare, etc.
   - Don't limit to predefined categories

3. EXTRACT EVERYTHING RELEVANT TO THEIR DOMAIN
   - Skills = expertise that matters in THEIR field
   - Tools/technologies = whatever they use in THEIR work
   - Achievements = metrics/results that matter in THEIR industry

4. BE THOROUGH
   - Capture ALL work experience entries
   - Extract ALL skills mentioned anywhere
   - Get ALL education, certifications, projects
   - If you see a bullet point, extract it

5. HANDLE MISSING DATA
   - Use empty string "" or empty array [] if not present
   - Don't make up information

6. DATE FORMATS
   - Extract as written: "2020-01", "2020", "Jan 2020"
   - Use "Present" for current positions

=== JSON STRUCTURE ===

{
  "personalInfo": {
    "name": "Full name",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State/Country",
    "summary": "Professional summary (2-3 sentences)",
    "aboutMe": "Detailed paragraph (3-4 sentences)"
  },
  "experience": [{
    "title": "Job title",
    "company": "Company name",
    "location": "City, State",
    "startDate": "YYYY-MM or YYYY",
    "endDate": "YYYY-MM or Present",
    "description": "Role responsibilities",
    "achievements": ["Achievement 1", "Achievement 2"]
  }],
  "skills": {
    "technical": ["Domain-specific professional skills for THEIR field"],
    "soft": ["Leadership", "Communication", "Problem solving"],
    "languages": ["English (Native)", "Spanish (Fluent)"]
  },
  "education": [{
    "degree": "Degree with field (e.g., 'BS in Computer Science')",
    "institution": "School name",
    "location": "City, State",
    "graduationDate": "YYYY",
    "gpa": "GPA if mentioned",
    "achievements": ["Dean's List", "Honors"]
  }],
  "projects": [{
    "name": "Project name",
    "description": "Description",
    "technologies": ["Tools/methods used in THEIR domain"],
    "url": "Link if available"
  }],
  "certifications": [{
    "name": "Certification name",
    "issuer": "Issuing organization",
    "date": "YYYY or YYYY-MM",
    "url": "Credential URL if available"
  }]
}

=== PROFESSION-SPECIFIC EXAMPLES ===

Software Developer:
- technical: ["JavaScript", "React", "AWS"]
- technologies: ["Docker", "PostgreSQL"]

Chef:
- technical: ["French cuisine", "Knife skills", "Menu development"]
- technologies: ["Sous vide", "Molecular gastronomy"]

Teacher:
- technical: ["Curriculum design", "Differentiated instruction"]
- technologies: ["Google Classroom", "Project-based learning"]

Lawyer:
- technical: ["Contract law", "Legal research", "Litigation"]
- technologies: ["Westlaw", "Case management software"]

=== CV TEXT ===

${cvText}

=== REMINDERS ===
- Extract EVERYTHING
- Read FULL document
- Return ONLY valid JSON
- Include all sections and bullet points

Return complete JSON now:
`;
}
```

#### 3. Data Normalization

```javascript
normalizeExtractedData(data) {
  return {
    personalInfo: {
      name: this.cleanValue(data.personalInfo?.name) || '',
      email: this.cleanValue(data.personalInfo?.email) || '',
      phone: this.cleanValue(data.personalInfo?.phone) || '',
      location: this.cleanValue(data.personalInfo?.location) || '',
      summary: this.cleanValue(data.personalInfo?.summary) || '',
      aboutMe: this.cleanValue(data.personalInfo?.aboutMe) || ''
    },
    experience: Array.isArray(data.experience) ? data.experience : [],
    education: Array.isArray(data.education) ? data.education : [],
    skills: {
      technical: Array.isArray(data.skills?.technical) ? data.skills.technical : [],
      soft: Array.isArray(data.skills?.soft) ? data.skills.soft : [],
      languages: Array.isArray(data.skills?.languages) ? data.skills.languages : []
    },
    projects: Array.isArray(data.projects) ? data.projects : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : []
  };
}
```

#### 4. Simplified Main Processing

```javascript
async processCV(cvText, userId) {
  console.log('Starting single-pass CV processing with Gemini...');
  console.log(`Processing ${cvText.length} characters for user: ${userId}`);

  // Check API limits
  const limitCheck = await checkApiLimits(userId, 'gemini');
  if (!limitCheck.allowed) {
    throw new Error(`API limit exceeded: ${limitCheck.reason}`);
  }

  // Clean text
  const cleanedText = TextCleaner.prepareForAI(cvText);
  console.log(`Text cleaned: ${cleanedText.length} characters`);

  // Optional: Create simple session for tracking
  const sessionId = await this.sessionService.createSession(userId,
    cleanedText.substring(0, 500),
    {
      cv_length: cleanedText.length,
      processor_version: `3.0_single_pass_${this.currentModelName}`,
      processing_start: new Date().toISOString()
    }
  );

  try {
    // Single-pass extraction
    const result = await this.extractAllData(cleanedText);

    // Track API usage (1 call instead of 3)
    await trackApiUsage(userId, 'gemini', 1, cleanedText.length);
    console.log('API usage tracked: 1 call');

    // Add metadata
    result.processingMetadata = {
      intelligentProcessor: true,
      llmProvider: 'gemini',
      modelUsed: this.currentModelName,
      processingVersion: '3.0-single-pass',
      processingTime: new Date().toISOString(),
      sessionId: sessionId
    };

    console.log(`CV processing completed: ${result.personalInfo?.name}`);
    return result;

  } catch (error) {
    console.error('CV processing failed:', error);
    throw error;

  } finally {
    // Cleanup session
    setTimeout(async () => {
      await this.sessionService.cleanupSession(sessionId);
    }, 5000);
  }
}
```

#### 5. Optional: Enable JSON Mode

```javascript
initializeModel(modelName) {
  console.log(`Configuring Gemini model: ${modelName}`);
  this.model = this.genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json" // Force JSON output (if supported)
    }
  });
  this.currentModelName = modelName;
}
```

## Benefits Summary

| Metric | Before (3-step) | After (single-pass) | Improvement |
|--------|----------------|---------------------|-------------|
| API Calls per CV | 3 | 1 | **66% reduction** |
| Tokens Used | 9k-12k | 3.5k-5k | **60-70% reduction** |
| Processing Time | 15-20s | 5-8s | **60-70% faster** |
| Code Complexity | High (session state) | Low | **Simpler** |
| Data Completeness | Variable | Improved | **Better context** |
| Profession Support | Tech-biased | Universal | **All fields** |
| Cost per 1000 CVs | ~$X | ~$0.3X | **70% cheaper** |

## Risk Mitigation

### Risk 1: Single prompt too complex
**Mitigation:** Gemini 2.5 Flash is designed for complex extraction tasks. Prompt is well-structured with clear sections.

### Risk 2: Missed data in single pass
**Mitigation:**
- Explicit "read entire document" instructions
- Validation reminders at end of prompt
- Better than 3-step where data can be lost between steps
- Can add post-processing validation if needed

### Risk 3: JSON parsing failures
**Mitigation:**
- Keep existing multi-strategy JSON parser
- Use `responseMimeType: "application/json"` if available
- Fallback error handling already in place

### Risk 4: Profession misidentification
**Mitigation:**
- Open-ended approach (no closed list)
- Examples show variety without constraining
- Fields are flexible (technical = domain expertise, whatever that means)

## Testing Strategy

1. **Regression testing** - Test with existing tech CVs to ensure no degradation
2. **Cross-domain testing** - Test with CVs from different professions:
   - Teacher CV
   - Chef CV
   - Lawyer CV
   - Healthcare professional CV
   - Sales/marketing CV
3. **Edge cases:**
   - Very short CVs (1 page)
   - Very long CVs (5+ pages)
   - Non-standard formats (creative, academic, federal)
4. **Completeness validation** - Manually verify all sections extracted

## Rollout Plan

1. **Phase 1:** Implement changes in `intelligent-cv-processor-gemini.js`
2. **Phase 2:** Test with diverse CV samples
3. **Phase 3:** Deploy to production with monitoring
4. **Phase 4:** Monitor token usage and extraction quality
5. **Phase 5:** Apply same pattern to Ollama processor if successful

## Success Metrics

- **Token reduction:** Target 60%+ reduction (< 5k tokens per CV)
- **Processing time:** Target < 10s per CV
- **Data completeness:** No missing sections in manual review of 20 test CVs
- **Profession support:** Successfully extract from 5+ different profession types
- **Cost savings:** 60%+ reduction in API costs

## Open Questions

None - design approved for implementation.

## Next Steps

1. Create git worktree for isolated development
2. Implement changes to `intelligent-cv-processor-gemini.js`
3. Write tests for new extraction method
4. Test with diverse CV samples
5. Deploy and monitor

---

**Design Status:** ✅ Approved
**Ready for Implementation:** Yes
