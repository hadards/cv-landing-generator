# Privacy Policy

**Last Updated**: December 26, 2025

## 1. Introduction

This Privacy Policy explains how the CV Landing Generator ("Service", "we", "us") collects, uses, stores, and protects your information. This is an **experimental service in development** running entirely on free tier infrastructure.

**IMPORTANT**: This Service is provided as an experimental educational project with significant technical limitations regarding data retention and security. Please read this policy carefully before using the Service.

## 2. Information We Collect

### 2.1 Account Information (via Google OAuth)
When you sign in with Google OAuth, we collect and store:
- **Email address** (unique identifier, required)
- **Full name** (display purposes)
- **Profile picture URL** (optional display)
- **Google account ID** (google_id, for authentication)
- **Email verification status** (from Google)

**Storage**: Persistent in Supabase PostgreSQL database until account deletion.

### 2.2 CV Files and Content
- **Uploaded CV files** (PDF, DOC, DOCX formats only, maximum 10MB)
- **Extracted text** from CV files (temporary processing)
- **AI-processed structured data** (JSON format from Gemini AI)
- **Generated website content** (HTML, CSS, JavaScript files)
- **File metadata**: Original filename, file size, MIME type, file hash

**Storage**: Ephemeral file system (./uploads and ./generated directories).
**Retention**: 24 hours for CV files, 30 days for generated websites, lost on platform restarts.

### 2.3 Processing and Session Data
- **CV processing sessions**: Text preview, step results, session metadata
- **Processing logs**: Operation type, status, error messages, processing time
- **User sessions**: JWT session tracking, token IDs, activity timestamps
- **Processing jobs**: Queue position, status, estimated wait times

**Retention**:
- CV processing sessions: 24 hours maximum
- User authentication sessions: 24 hours (max 5 per user)
- Blacklisted tokens: 7 days

### 2.4 Usage and Analytics Data
- **API usage metrics**: Request counts, token usage (for free tier compliance)
- **Rate limit tracking**: Per-user and per-endpoint request counts
- **System performance data**: Memory usage, processing times, error rates
- **IP addresses**: For rate limiting only (not permanently stored with user profile)
- **Timestamps**: Request times, session creation, last activity

**Storage**: Persistent in database (anonymized/aggregated).

### 2.5 Optional GitHub Integration Data
If you connect GitHub:
- **GitHub username** (public profile)
- **GitHub access token** (encrypted with AES-256 using ENCRYPTION_KEY)
- **Repository URLs**: Created repositories and Pages URLs
- **Publishing metadata**: Deployment status, view counts

**Storage**: Persistent until disconnected or account deleted.
**Encryption**: GitHub tokens encrypted at rest.

### 2.6 User Preferences and Settings
- **Template preferences**: Selected template style
- **Theme preferences**: Light/dark mode
- **Email notification settings**: On/off status
- **Privacy settings**: Profile visibility, site discoverability (JSONB)
- **API integration settings**: GitHub/Vercel connection status (JSONB)

**Storage**: Persistent in user_preferences table.

## 3. How We Use Your Information

### 3.1 Core Service Functions
- **Authentication**: Verify identity via Google OAuth, manage JWT sessions
- **CV Processing**: Extract text, send to Gemini AI, structure data, generate landing pages
- **File Management**: Store uploads temporarily, validate files, manage cleanup
- **Website Generation**: Create HTML/CSS/JavaScript from CV data
- **GitHub Publishing**: Create repositories, deploy to GitHub Pages (optional)

### 3.2 System Operations & Security
- **Rate Limiting**: Enforce per-user and IP-based rate limits
  - General API: 100 requests/15min per user
  - CV Operations: 50 requests/15min per user
  - GitHub Operations: 20 requests/15min per user
- **Queue Management**: Track processing jobs, estimate wait times
- **Usage Monitoring**: Track API calls to comply with Gemini AI free tier limits (50 CV/day)
- **Session Management**: Track active sessions (max 5 per user), cleanup expired sessions
- **Security Validation**: File signature checking, malicious pattern detection
- **Error Tracking**: Log errors for debugging (anonymized)

### 3.3 Data Cleanup & Maintenance
- **Automated File Deletion**:
  - CV files: Every 1-4 hours (2-hour retention)
  - Generated sites: Every 4-24 hours (12-hour retention)
  - CV processing sessions: Every 6 hours (24-hour retention)
  - Auth sessions: Daily cleanup (24-hour expiration)
- **Memory Pressure Management**: Emergency cleanup when memory exceeds 400MB
- **Orphaned File Cleanup**: Remove files without database references every 24 hours

## 4. Data Retention and Deletion

### 4.1 Automatic Deletion Schedule

**File Storage (Ephemeral):**
- **CV Files**: Maximum 24 hours after upload
- **Generated Websites**: Maximum 30 days after creation
- **Temporary Processing Files**: 24 hours maximum
- **All Files on Platform Restart**: Immediately lost (ephemeral storage)

**Database Storage (Persistent Until Deletion):**
- **User Account Data**: Until account deletion
- **API Usage Statistics**: Indefinite (anonymized/aggregated)
- **User Preferences**: Until account deletion
- **GitHub Integration**: Until disconnected or account deleted

**Session and Security Data:**
- **Authentication Sessions**: 24 hours expiration, daily cleanup
- **JWT Access Tokens**: 24 hours expiration
- **JWT Refresh Tokens**: 7 days expiration
- **Blacklisted Tokens**: 7 days retention
- **CV Processing Sessions**: 24 hours, cleanup every 6 hours
- **Rate Limit Records**: Rolling 15-minute windows

### 4.2 Immediate Cleanup Triggers

Your data may be deleted sooner than scheduled due to:
- **Memory Pressure**: Cleanup when memory usage exceeds 400MB threshold
- **Platform Restarts**: All ephemeral file storage lost immediately
- **Emergency Cleanup**: During system overload or high usage
- **Post-Download Timer**: 5-minute grace period after you download files
- **Account Deletion**: All user data removed immediately
- **Session Limit Enforcement**: Oldest session deleted when creating 6th session

### 4.3 Data Never Permanently Stored

We do NOT permanently store:
- CV file contents (deleted within 24 hours)
- Generated website files (deleted within 30 days)
- Extracted CV text beyond processing window
- Processing session details beyond 24 hours
- Temporary authentication tokens beyond expiration
- Files lost on platform restarts (ephemeral storage)

### 4.4 Persistent Data Retained

We only retain until account deletion:
- User account information (email, name, Google ID, profile picture)
- GitHub connection data (username, encrypted tokens)
- User preferences and settings
- API usage statistics (anonymized/aggregated)
- System performance logs (anonymized)

## 5. Data Sharing and Third-Party Services

### 5.1 Required Third-Party Services

**Google OAuth** (Authentication)
- **Data Shared**: Email, name, profile picture, Google account ID
- **Purpose**: User authentication and account creation
- **Privacy Policy**: https://policies.google.com/privacy
- **Data Storage**: Google's servers during OAuth flow

**Google Gemini AI** (CV Processing)
- **Data Shared**: Extracted CV text content (temporarily)
- **Purpose**: AI-powered CV data extraction and structuring
- **Processing**: CV text sent to Gemini API, structured data returned
- **Retention**: Per Google's Gemini API terms (may be logged by Google)
- **Privacy Policy**: https://policies.google.com/privacy
- **Free Tier Limits**: 50 CV generations/day per user, 100,000 tokens/month

**Supabase** (PostgreSQL Database)
- **Data Shared**: All user account data, system data, metadata
- **Purpose**: Database storage for user accounts, sessions, usage tracking
- **Infrastructure**: Supabase free tier (100 max connections, limited storage)
- **Privacy Policy**: https://supabase.com/privacy
- **Row Level Security**: Enabled on all tables (backend-only access)

### 5.2 Optional Third-Party Services

**GitHub** (Optional Publishing)
- **Data Shared**: Generated website files, GitHub username, access tokens (encrypted)
- **Purpose**: Create repositories, publish landing pages to GitHub Pages
- **When Activated**: Only when user connects GitHub account
- **Data Control**: User retains GitHub account ownership
- **Privacy Policy**: https://docs.github.com/en/site-policy/privacy-policies
- **Token Storage**: Encrypted with AES-256, stored in database

### 5.3 No Commercial Data Sharing

We do NOT:
- Sell your data to third parties
- Share data for marketing or advertising purposes
- Provide data to data brokers or advertisers
- Use data for commercial purposes beyond the Service
- Share personally identifiable information except as required by law

**This is a non-commercial experimental educational project.**

## 6. Data Security

### 6.1 Security Measures Implemented

**Authentication & Authorization:**
- **JWT Tokens**: Signed tokens with session IDs and token IDs
- **Token Blacklisting**: Revoked tokens tracked in database
- **Session Management**: Max 5 sessions per user, 24-hour expiration
- **Google OAuth**: Industry-standard authentication flow
- **Password-less**: No password storage vulnerabilities

**File Upload Security:**
- **MIME Type Validation**: PDF, DOC, DOCX only
- **File Signature Checking**: Magic bytes verification
- **Malicious Pattern Detection**:
  - Script tags (< script>, onclick, onerror handlers)
  - Executable references (.exe, .bat, .sh, .ps1, .cmd)
  - Base64 eval patterns and obfuscated code
  - PDF JavaScript and embedded files
  - High entropy content (potential encryption/obfuscation warning)
- **Path Traversal Prevention**: Filename sanitization, secure path validation
- **File Size Limits**: 10MB per upload enforced

**Data Protection:**
- **HTTPS/TLS Encryption**: All data in transit encrypted
- **GitHub Token Encryption**: AES-256 encryption at rest
- **Database SSL**: Encrypted connection to Supabase (though cert validation disabled for compatibility)
- **Input Sanitization**: Email, filename, text validation
- **Secure Headers**: Helmet.js with CSP, CORS configured

**Application Security:**
- **CSRF Protection**: Token-based validation
- **Rate Limiting**: Per-user and IP-based (15-minute windows)
- **Session Validation**: Active session checking on every request
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Prevention**: Input sanitization, CSP headers

### 6.2 Security Limitations (Free Tier Constraints)

**Due to experimental nature and free tier infrastructure:**
- **Limited Monitoring**: Basic free tier monitoring tools only
- **No SOC Team**: No dedicated security operations center
- **No Penetration Testing**: No regular professional security audits
- **Experimental Codebase**: May contain undiscovered vulnerabilities
- **SSL Certificate Validation**: Disabled for Supabase compatibility (connection still encrypted)
- **CSRF Tokens**: Stored in-memory (won't work across multiple instances)
- **No WAF**: No web application firewall
- **Limited DDoS Protection**: Basic free tier protections only

### 6.3 Data Breach Response

In case of a security incident:
1. **Investigation**: Identify scope and affected data
2. **Notification**: Users will be notified if possible (via email or application)
3. **Mitigation**: Implement additional cleanup and security measures
4. **Service Suspension**: Service may be temporarily offline during investigation
5. **Transparency**: Incident details shared when appropriate

**Note**: As a free experimental service, incident response capabilities are limited.

## 7. Your Rights and Control

### 7.1 Access and Portability
- **View Your Data**: Through application interface (dashboard, active sessions)
- **Download Generated Content**: Before automatic deletion (12-hour window)
- **Export Website ZIP**: Download landing page as ZIP archive
- **Session Management**: View and terminate active sessions
- **GitHub Repository**: Access published sites via GitHub account

### 7.2 Deletion Rights
- **Delete Generated Content**: Automatic deletion within 30 days
- **Delete CV Files**: Automatic deletion within 24 hours
- **Terminate Sessions**: Logout (blacklists tokens, removes session)
- **Disconnect GitHub**: Remove GitHub integration and encrypted tokens
- **Delete Account**: Request account deletion (all data removed per retention policies)

### 7.3 Control and Opt-Out
- **Optional Features**: GitHub integration is entirely optional
- **Download Before Deletion**: Download files before automatic cleanup
- **Session Limits**: Manage up to 5 active sessions
- **Stop Using Service**: Data automatically deleted per retention schedule

### 7.4 Limitations Due to Free Tier Nature
- **No Guaranteed Data Recovery**: Deleted data is permanent
- **Limited Customer Support**: No dedicated support team
- **No SLA**: No service level agreements for data access requests
- **Automatic Cleanup**: May delete data before user-initiated action
- **Platform Restarts**: Immediate data loss (ephemeral storage)
- **No Data Backups**: Files not backed up or recoverable

## 8. Children's Privacy (COPPA Compliance)

- **Age Requirement**: Must be at least 13 years old to use the Service
- **No Collection from Children**: We do not knowingly collect personal information from children under 13
- **Parental Consent**: Users under 18 should have parental/guardian consent
- **Deletion Protocol**: If we become aware of collection from children under 13, we will delete the information immediately

## 9. International Data Transfers

### 9.1 Data Processing Locations
Your data may be processed in various countries where our free tier service providers operate:
- **United States**: Google services (OAuth, Gemini AI), potential hosting
- **European Union**: Potential hosting locations, Supabase infrastructure
- **Other Regions**: Where free tier cloud services are available

### 9.2 Cross-Border Transfers
- By using the Service, you consent to international data transfer and processing
- Data protection standards may vary by jurisdiction
- No guarantees regarding compliance with country-specific regulations (e.g., GDPR, CCPA)

### 9.3 EU Users (GDPR Considerations)
- **Legal Basis for Processing**:
  - **Consent**: For optional features (GitHub integration)
  - **Legitimate Interests**: For system operations, security, cleanup
  - **Contract Performance**: For core CV processing service
- **Data Subject Rights**: Access, rectification, deletion, portability, objection
- **Limitations**: Free tier infrastructure may limit full GDPR compliance

## 10. Cookies and Local Storage

### 10.1 What We Store Locally
- **JWT Access Tokens**: Stored in browser localStorage
- **JWT Refresh Tokens**: Stored in browser localStorage
- **Session IDs**: For authentication state management
- **Google OAuth Cookies**: Set by Google during authentication

### 10.2 No Third-Party Tracking
We do NOT use:
- Analytics cookies (beyond basic system metrics)
- Advertising cookies or tracking pixels
- Social media tracking or sharing buttons
- Third-party marketing or behavioral tracking tools
- Cross-site tracking mechanisms

### 10.3 Cookie Control
- Clear browser localStorage to remove tokens
- Google OAuth cookies managed by Google
- No persistent tracking cookies used

## 11. Changes to This Privacy Policy

- We may update this Privacy Policy as the experimental project evolves
- Changes will be posted with an updated "Last Updated" date
- Material changes may be highlighted in the application
- Continued use after changes constitutes acceptance
- Review periodically for updates

## 12. Legal Basis for Processing (GDPR)

For users in the European Union, our legal basis for processing personal data includes:

- **Consent**:
  - Google OAuth login
  - GitHub integration
  - Optional features
- **Legitimate Interests**:
  - System operations and security
  - Fraud prevention
  - Service improvement
- **Contract Performance**:
  - Core CV processing functionality
  - Website generation
  - Account management
- **Legal Obligation**:
  - Compliance with applicable laws
  - Response to legal requests

## 13. Data Protection Officer

As an experimental, non-commercial educational project running on free tier infrastructure, we do not have a dedicated Data Protection Officer (DPO).

Privacy concerns can be reported through:
- Application interface feedback
- Service contact mechanisms
- GitHub repository issues (if applicable)

## 14. Compliance Limitations

**Important Disclaimer**: This experimental service may not fully comply with all data protection regulations due to:

- **Free Tier Infrastructure**: Limited resources and capabilities
- **Experimental Nature**: Educational/demonstration project, not commercial service
- **Limited Resources**: No legal team or compliance department
- **Rapid Development**: Iteration cycles may introduce temporary compliance gaps
- **Third-Party Dependencies**: Reliance on free tier service providers
- **No Commercial Standards**: Not subject to commercial data protection requirements

## 15. Data Security Best Practices (User Responsibility)

### What You Should Do:
- ✅ Download generated content before automatic deletion
- ✅ Use strong Google account password and 2FA
- ✅ Review generated content for accuracy before use
- ✅ Disconnect GitHub when not needed
- ✅ Terminate unused sessions
- ✅ Do not upload highly sensitive documents

### What You Should NOT Do:
- ❌ Upload confidential, classified, or highly sensitive documents
- ❌ Rely on the Service for long-term data storage
- ❌ Share authentication tokens or session credentials
- ❌ Use for business-critical or production data
- ❌ Upload documents containing trade secrets
- ❌ Store personally identifiable information of others without consent

## 16. Contact Information

For privacy-related questions or concerns regarding this experimental service:

- **Technical Issues**: Report through the application interface
- **Privacy Concerns**: Use feedback mechanisms in the Service
- **Account Deletion**: Request via application or contact methods
- **Data Access Requests**: Submit through Service interface
- **General Questions**: This is an experimental project with limited support

**Note**: As a free experimental service, response times are not guaranteed. There is no dedicated support team or customer service department.

---

## Summary of Key Privacy Points:

📊 **Data Collected**: Google account info, CV files (temp), usage metrics, sessions
🕒 **Retention**: CV files 2h, websites 12h, sessions 24h, account data persistent
🗑️ **Auto-Deletion**: Aggressive cleanup (2-24 hours), lost on platform restarts
🔐 **Security**: HTTPS, JWT auth, file validation, encryption (with limitations)
🌐 **Third-Parties**: Google (OAuth + Gemini AI), GitHub (optional), Supabase
🚫 **No Selling**: Data never sold or shared for commercial purposes
⚠️ **Limitations**: Free tier, experimental, limited compliance capabilities
✅ **Your Rights**: Access, download, delete, disconnect integrations
👶 **Age**: 13+ required, parental consent recommended for under 18
🌍 **International**: Data processed globally, limited GDPR compliance

---

**IMPORTANT REMINDER**:

This is an experimental service in development running entirely on free tier infrastructure. Your CV files and generated content are automatically deleted within hours (24 hours to 30 days maximum). All file storage is ephemeral and lost on platform restarts.

**Do not upload:**
- Confidential or classified documents
- Sensitive personal information
- Trade secrets or proprietary business information
- Documents requiring long-term retention
- Data subject to strict regulatory compliance (HIPAA, financial data, etc.)

**By using this Service, you acknowledge that you have read, understood, and agree to this Privacy Policy.**
