# ⚠️ EXPERIMENTAL SERVICE DISCLAIMER

**Last Updated**: December 26, 2025

## 🧪 This is an Experimental Educational Project

**CV Landing Generator** is an **experimental service in active development** provided as a learning/demonstration project with **no warranties, no service level agreements, and significant limitations**.

**This is NOT a commercial service.** It is an educational project running entirely on free tier infrastructure with inherent technical constraints.

---

## 🆓 Free Tier Infrastructure

This service runs **100% on FREE TIER** services with significant limitations:

### Platform Infrastructure:
- **Hosting**: Free tier platforms (Render, Heroku, Vercel, or similar)
  - Service may **sleep during inactivity**
  - **Cold starts** possible (5-30 second delays)
  - **Automatic restarts** without warning
  - **Ephemeral storage** (all files lost on restart)

- **Database**: Supabase free tier PostgreSQL
  - **100 maximum connections** globally
  - **20 concurrent connections** enforced per application
  - **60-second idle timeout**
  - **Limited storage capacity**
  - **No automatic backups** on free tier

- **AI Processing**: Google Gemini AI free tier
  - **50 CV generations per user per day**
  - **100,000 tokens per month** limit
  - **Subject to Google's API availability**
  - **No guaranteed processing times**

- **File Storage**: Ephemeral/temporary storage only
  - **Lost on platform restarts**
  - **No persistent storage**
  - **Automatic aggressive cleanup**
  - **./uploads and ./generated directories** (temporary)

- **Monitoring**: Basic free tier monitoring tools
  - **No 24/7 monitoring**
  - **No dedicated ops team**
  - **Limited error tracking**
  - **No performance guarantees**

---

## ⏰ Aggressive Automatic Data Deletion

**YOUR DATA IS AUTOMATICALLY DELETED - THIS IS BY DESIGN:**

### File Deletion Schedule:
- ✅ **CV Files**: 24 hours after upload
- ✅ **Generated Websites**: 30 days after creation
- ✅ **Processing Data**: 24 hours maximum
- ✅ **All Files on Restart**: Immediately lost (ephemeral storage)
- ✅ **Post-Download**: 5-minute timer after download

### Cleanup Triggers (Data Deleted Even Faster):
- 🔴 **Memory Pressure**: Immediate cleanup when memory exceeds 400MB
- 🔴 **Platform Restarts**: All files lost instantly
- 🔴 **Emergency Cleanup**: During high system load
- 🔴 **Scheduled Cleanup**:
  - CV files: Every 1-4 hours
  - Generated sites: Every 4-24 hours
  - Processing sessions: Every 6 hours
  - Auth sessions: Daily

### Session and Token Retention:
- **User Sessions**: 24 hours maximum (max 5 per user)
- **JWT Access Tokens**: 24 hours expiration
- **JWT Refresh Tokens**: 7 days expiration
- **Blacklisted Tokens**: 7 days retention
- **CV Processing Sessions**: 24 hours maximum

---

## 🚫 What This Service Is NOT

### Not Suitable For:
- ❌ **Not a commercial service** or business-grade solution
- ❌ **Not for business-critical operations** or production use
- ❌ **Not suitable for sensitive documents** (confidential, classified, trade secrets)
- ❌ **Not a replacement for professional CV services** or career counseling
- ❌ **Not for long-term data storage** (all data auto-deleted)
- ❌ **Not HIPAA/SOC2/ISO27001 compliant**
- ❌ **Not suitable for regulated industries** (healthcare, finance, legal)

### No Guarantees Provided:
- ❌ **No uptime guarantees or SLAs**
- ❌ **No customer support team** or help desk
- ❌ **No data backup or recovery** services
- ❌ **No guaranteed accuracy** of AI-generated content
- ❌ **No security certifications** or audits
- ❌ **No performance guarantees** or speed commitments
- ❌ **No warranty of any kind** (express or implied)

---

## ⚡ Service Limitations

### Resource and Processing Limits:
- **Concurrent Processing**: 1 CV at a time **globally** (single queue)
- **Daily Limit**: 50 CV generations per user per day
- **API Rate Limits**:
  - General API: 100 requests per 15 minutes per user
  - CV Operations: 50 requests per 15 minutes per user
  - GitHub Operations: 20 requests per 15 minutes per user
  - IP-based: 20 requests per 15 minutes per IP address
- **File Size Limits**:
  - CV Upload: 10MB maximum
  - ZIP Download: 50MB maximum
  - Images: 5MB maximum (base64)
  - README: 1MB maximum
- **Memory Limit**: 400MB threshold (service throttles/cleans up)
- **Database Connections**: 20 maximum concurrent

### Platform and Infrastructure Limitations:
- **Service Sleep**: May sleep during inactivity (free hosting)
- **Cold Starts**: 5-30 second delays after sleep
- **Platform Restarts**: Unscheduled, data lost instantly
- **Memory Pressure**: Automatic cleanup triggered, requests rejected
- **Single Global Queue**: One CV processing at a time for all users
- **No Horizontal Scaling**: Single instance only (free tier)

### Functional Limitations:
- **File Formats**: PDF, DOC, DOCX only (no plain text, images, other formats)
- **Language Support**: English optimized (AI may struggle with other languages)
- **Template Options**: Single professional template only
- **No Editing**: Generated sites cannot be edited after creation
- **No History**: Previous generations not stored or recoverable
- **No Versioning**: Cannot compare or revert to previous versions

---

## 🎯 Intended Use

This experimental service is designed for:

### Appropriate Uses:
- ✅ **Learning** about AI and web development technologies
- ✅ **Demonstrating** CV processing capabilities
- ✅ **Experimenting** with automated resume parsing
- ✅ **Educational** purposes and skill development
- ✅ **Portfolio** demonstrations (non-sensitive projects)
- ✅ **Testing** AI content generation
- ✅ **Understanding** free tier infrastructure constraints

### Inappropriate Uses:
- ❌ **Job Applications**: Not reliable enough for actual job searches
- ❌ **Client Work**: Not suitable for professional services
- ❌ **Sensitive Data**: Confidential, classified, or proprietary information
- ❌ **Production Websites**: No uptime guarantees or persistence
- ❌ **Business Operations**: No SLA or support for critical needs
- ❌ **Compliance Requirements**: No certifications or audit trails

---

## ⚠️ Use at Your Own Risk

By using this service, you acknowledge and accept:

### Technical Risks:
1. **No Warranties**: Service provided "as-is" without any guarantees or warranties
2. **Data Loss**: Your data WILL be automatically deleted (24 hours to 30 days)
3. **Service Interruptions**: Expect frequent downtime and unavailability
4. **No Recovery**: Deleted data cannot be recovered under any circumstances
5. **Experimental Code**: May contain bugs, errors, or unexpected behavior
6. **Free Tier Limits**: Subject to third-party service restrictions and changes
7. **Platform Dependencies**: Reliant on external free tier services

### Content Risks:
8. **AI Inaccuracy**: Generated content may contain errors, hallucinations, or misinterpretations
9. **No Verification**: Content not reviewed or verified for accuracy
10. **Formatting Issues**: Generated websites may have display or compatibility issues
11. **Incomplete Data**: AI may miss or incorrectly extract CV information
12. **No Human Review**: Fully automated process with no quality control

### Security Risks:
13. **Limited Security**: Not enterprise-grade security standards
14. **File Validation**: Security scans implemented but not 100% foolproof
15. **No Penetration Testing**: Codebase not professionally audited
16. **Experimental Security**: Security measures still in development

---

## 🔒 Security and Privacy Notice

### Security Measures Implemented:
- ✅ **HTTPS/TLS encryption** for data in transit
- ✅ **JWT authentication** with session tracking
- ✅ **File signature validation** (magic bytes)
- ✅ **Malicious pattern detection** (scripts, executables, eval patterns)
- ✅ **MIME type validation** (PDF, DOC, DOCX only)
- ✅ **Path traversal prevention**
- ✅ **Rate limiting** (per-user and IP-based)
- ✅ **CSRF protection** (token-based)
- ✅ **Input sanitization** (email, filenames, text)
- ✅ **GitHub token encryption** (AES-256)

### Security Limitations:
- ⚠️ **Not enterprise-grade security** (free tier constraints)
- ⚠️ **Limited security monitoring** (no 24/7 SOC)
- ⚠️ **Experimental codebase** may have undiscovered vulnerabilities
- ⚠️ **No dedicated security team** or incident response
- ⚠️ **No regular security audits** or penetration testing
- ⚠️ **SSL validation disabled** for Supabase (connection still encrypted)
- ⚠️ **CSRF tokens in-memory** (won't work across multiple instances)
- ⚠️ **No WAF** (Web Application Firewall)

### Privacy Considerations:
- Your CV content is sent to **Google Gemini AI** for processing
- Data may be logged by Google per their privacy policies
- Files stored temporarily on server (deleted within 24 hours to 30 days)
- Account data stored in Supabase PostgreSQL
- IP addresses tracked for rate limiting
- No data sold or shared commercially

---

## 📊 Data Processing and AI Notice

### How Your Data Is Processed:
1. **Upload**: CV file uploaded to temporary storage (./uploads)
2. **Extraction**: Text extracted from PDF/DOC/DOCX file
3. **AI Processing**: CV text sent to **Google Gemini AI** API
4. **Structuring**: AI returns structured JSON data (name, skills, experience, etc.)
5. **Generation**: HTML/CSS/JavaScript landing page generated from structured data
6. **Storage**: Files stored temporarily (deleted within 30 days)
7. **Download**: User downloads ZIP archive
8. **Cleanup**: Files deleted (immediate or scheduled)

### AI Processing Risks:
- ⚠️ **AI Hallucinations**: May generate content not present in original CV
- ⚠️ **Misinterpretation**: May incorrectly understand CV sections or context
- ⚠️ **Missing Data**: May fail to extract all information from CV
- ⚠️ **Formatting Errors**: Generated HTML may have display issues
- ⚠️ **Language Limitations**: Optimized for English, may struggle with others
- ⚠️ **Bias**: AI models may have inherent biases affecting content generation
- ⚠️ **No Human Review**: Fully automated with no quality control

### Third-Party AI Services:
- **Google Gemini AI**: CV text processing and structuring
  - Subject to Google's free tier limits (50 CV/day, 100k tokens/month)
  - Data may be logged by Google for service improvement
  - Privacy Policy: https://policies.google.com/privacy
- **No Control**: We cannot control how Google processes your data
- **No Guarantees**: Google API may change or be unavailable

---

## 🌍 Geographic and Infrastructure Availability

### Service Availability Depends On:
- **Free Tier Geographic Restrictions**: Some regions may be unavailable
- **Third-Party Service Availability**: Google, GitHub, Supabase uptime
- **Platform Maintenance Schedules**: Scheduled and emergency maintenance
- **Resource Allocation Limits**: Free tier quotas and limits
- **Network Connectivity**: Internet connection quality and reliability

### No Guarantees For:
- ❌ 24/7 availability
- ❌ Regional performance
- ❌ Consistent response times
- ❌ Service during peak usage
- ❌ International compliance (GDPR, CCPA, etc.)

---

## 🔧 Development and Maintenance Status

This project is:
- **Actively Developed**: As a personal learning exercise
- **Subject to Frequent Changes**: Features may be added, modified, or removed without notice
- **May Be Discontinued**: At any time without warning or migration support
- **Not Feature-Complete**: Missing enterprise features and polish
- **Optimized for Free Tier Only**: Not designed for commercial use
- **No Roadmap**: Development priorities change based on learning goals
- **No Versioning**: No semantic versioning or release schedule

---

## 📞 Support and Contact Limitations

### No Formal Support Provided:
- ❌ No help desk or support ticket system
- ❌ No guaranteed response times
- ❌ No SLA for issue resolution
- ❌ No phone or chat support
- ❌ No dedicated support team

### Limited Community Support:
- Report issues through application interface (if functional)
- Feedback mechanisms (if available)
- No guarantee of response or resolution
- Issues may remain unresolved indefinitely

### Documentation:
- Limited documentation updates
- May become outdated quickly
- No comprehensive user guide
- Self-service only

---

## 📋 Legal and Liability Summary

### Disclaimer of Warranties:
- **AS-IS BASIS**: Service provided without any warranties, express or implied
- **NO MERCHANTABILITY**: Not warranted for any particular purpose
- **NO FITNESS**: Not warranted to meet your requirements
- **NO RELIABILITY**: Not warranted to be uninterrupted or error-free

### Limitation of Liability:
- **$0.00 LIABILITY CAP**: Total liability limited to amount paid (which is $0)
- **No Liability For**:
  - Data loss or corruption
  - Service interruptions or downtime
  - AI-generated content errors or inaccuracies
  - Security breaches or unauthorized access
  - Third-party service failures
  - Business losses or damages
  - Consequential or incidental damages

### User Responsibility:
- **Backup Important Data**: Do not rely on this service for data storage
- **Verify Generated Content**: Review AI output for accuracy before use
- **Download Promptly**: Files auto-deleted within hours
- **Understand Limitations**: Read all documentation and disclaimers
- **No Sensitive Data**: Do not upload confidential information

### Legal Jurisdiction:
- Governed by local laws where service operator resides
- No formal dispute resolution process
- Informal negotiation preferred
- No class action lawsuits permitted

---

## 🔄 Service Changes and Discontinuation

### We Reserve the Right To:
- Modify or discontinue the Service at any time without notice
- Change features, functionality, or limitations
- Update Terms, Privacy Policy, or Disclaimer without warning
- Implement additional restrictions or rate limits
- Terminate user accounts for violations
- Migrate to different infrastructure providers
- Delete all user data during shutdown

### No Migration Support:
- If service is discontinued, no data migration or export support
- Users responsible for downloading data before shutdown
- No advance notice guaranteed for discontinuation

---

## 🎉 Despite All These Limitations...

We hope you find this experimental service useful for:
- **Learning** about AI-powered resume processing and content generation
- **Understanding** automated data extraction and structuring
- **Exploring** modern web development and full-stack architecture
- **Experimenting** with CV presentation formats and design
- **Discovering** free tier infrastructure capabilities and constraints
- **Developing** skills in AI integration and API usage

**Remember**: This is a **learning project**, not a commercial service. Use it for **experimentation and education**, not for critical applications, sensitive data, or business operations!

---

## ⚖️ By Using This Service, You Acknowledge:

✅ You have read and understood this entire disclaimer
✅ You accept all risks associated with using an experimental service
✅ You understand data will be automatically deleted (24 hours to 30 days)
✅ You will not upload sensitive, confidential, or classified information
✅ You will not rely on this service for business-critical operations
✅ You understand there are no warranties, guarantees, or support
✅ You accept the liability cap of $0.00 for any damages
✅ You understand the service may be discontinued at any time
✅ You will download generated content before automatic deletion
✅ You will verify AI-generated content for accuracy before use

---

**FINAL REMINDER**: This is an **experimental educational project** running on **100% free tier infrastructure**. Expect frequent downtime, data loss, and service limitations. Do not use for anything important, sensitive, or business-critical.

**Use for learning and experimentation only.**

---

*This disclaimer was last updated on December 26, 2025 and reflects the current state of the experimental service. Check regularly for updates.*
