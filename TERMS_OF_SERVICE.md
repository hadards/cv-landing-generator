# Terms of Service

**Last Updated**: December 26, 2025

## 1. Acceptance of Terms

By accessing or using the CV Landing Generator ("Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the Service.

## 2. Experimental Nature of Service

**IMPORTANT**: This Service is provided as an **EXPERIMENTAL SERVICE** currently in development with limited guarantees.

- This is currently a **FREE EXPERIMENTAL SERVICE**
- The Service is provided "as-is" without warranties
- Features may be added, modified, or removed without notice
- The Service may be discontinued at any time
- This is an educational/demonstration project, not a commercial service

## 3. Free Tier Limitations

This Service operates entirely on **FREE TIER** infrastructure with the following limitations:

### Processing Limits:
- **Concurrent Processing**: Maximum 1 CV processing globally at a time
- **Daily Limits**: Up to 50 CV generations per user per day
- **API Rate Limits**:
  - General API: 100 requests per 15 minutes per user
  - CV Operations: 50 requests per 15 minutes per user
  - GitHub Operations: 20 requests per 15 minutes per user
  - IP-based: 20 requests per 15 minutes per IP address
- **Gemini AI**: Subject to Gemini free tier monthly token limits (100,000 tokens)

### File Size Limits:
- **CV Upload**: Maximum 10MB per file (PDF, DOC, DOCX formats only)
- **ZIP Download**: Maximum 50MB per archive
- **Images**: Maximum 5MB per base64-encoded image
- **README Files**: Maximum 1MB per file

### File Storage & Retention:
- **CV Files**: Automatically deleted within 24 hours after upload
- **Generated Websites**: Automatically deleted within 30 days
- **Processing Data**: Maximum 24 hours retention
- **All Files**: Lost immediately on platform restarts (ephemeral storage)
- **Download Grace Period**: 5-minute timer after download before cleanup

### Session & Authentication:
- **Maximum Sessions**: 5 active sessions per user
- **Session Duration**: 24 hours before automatic expiration
- **JWT Tokens**: 24 hours access token, 7 days refresh token
- **Token Blacklist**: Revoked tokens tracked for 7 days

### Memory & Resource Limits:
- **Memory Threshold**: Service may throttle at 400MB memory usage
- **Emergency Cleanup**: Automatic file deletion during memory pressure
- **Database Connections**: Limited to 20 concurrent connections
- **Processing Queue**: Single global queue, position tracking provided

### Service Availability:
- **No Uptime Guarantees**: Service may go offline without notice
- **Platform Limitations**: Subject to free tier hosting restrictions
- **Automatic Shutdowns**: Service may sleep during inactivity
- **Cold Starts**: First request after sleep may take longer

## 4. Data Handling and Privacy

### What We Collect:
- **Google OAuth Data**: Email, name, profile picture, Google account ID
- **CV Files**: Temporarily processed and automatically deleted
- **GitHub Data** (Optional): Username, encrypted access tokens
- **Generated Content**: Landing page HTML, CSS, JavaScript
- **Usage Analytics**: API request counts, processing timestamps, error logs
- **System Data**: User sessions, rate limit tracking, IP addresses (for rate limiting only)

### Data Retention Periods:
- **CV Files**: 24 hours maximum
- **Generated Websites**: 30 days maximum
- **Processing Sessions**: 24 hours maximum (CV processing pipeline data)
- **User Account Info**: Persistent until account deletion
- **Authentication Sessions**: 24 hours, max 5 per user
- **Blacklisted Tokens**: 7 days
- **API Usage Statistics**: Persistent (anonymized)

### Automatic Data Deletion Triggers:
- **Scheduled Cleanup**:
  - CV files: Every 1-4 hours
  - Generated sites: Every 4-24 hours
  - User sessions: Daily cleanup
  - Processing sessions: Every 6 hours
- **Memory Pressure**: Immediate cleanup when memory exceeds 400MB
- **Platform Restarts**: All ephemeral file storage lost
- **Post-Download**: 5-minute timer after user downloads files
- **Account Deletion**: All user data removed

### Third-Party Services:
This Service integrates with and shares data with:

- **Google OAuth** (authentication): Email, name, profile picture
  - Privacy Policy: https://policies.google.com/privacy
- **Google Gemini AI** (CV processing): CV text content sent for extraction/structuring
  - Privacy Policy: https://policies.google.com/privacy
- **GitHub** (optional publishing): Username, tokens (encrypted), generated landing pages
  - Privacy Policy: https://docs.github.com/en/site-policy/privacy-policies
- **Supabase** (database - free tier): All user and system data
  - Privacy Policy: https://supabase.com/privacy

Your data may be processed by these services according to their respective privacy policies.

## 5. User Responsibilities

### You Agree To:
- Use the Service for legitimate CV/resume purposes only
- Provide accurate information during registration
- Not upload malicious, inappropriate, or copyrighted content without permission
- Not attempt to overload, abuse, or bypass security measures of the Service
- Understand this is an experimental platform with inherent limitations
- Download your generated content before automatic deletion
- Not rely on the Service for data backup or long-term storage

### You Acknowledge:
- **No Data Backup**: Your data may be permanently lost without recovery
- **No Commercial Use**: This Service is not suitable for business-critical operations
- **No SLA**: No service level agreements or uptime guarantees provided
- **Educational Purpose**: This is a learning/demonstration project
- **File Validation**: Uploaded files are scanned but not guaranteed to be 100% safe
- **AI Limitations**: Generated content may contain errors, inaccuracies, or omissions
- **Ephemeral Storage**: All files lost during platform restarts

## 6. Prohibited Uses

You may NOT use this Service to:
- Process confidential, classified, or highly sensitive documents
- Upload copyrighted material without proper permission
- Attempt to bypass rate limits, security measures, or system restrictions
- Use automated tools or scripts to overwhelm the Service
- Store or process illegal, harmful, or inappropriate content
- Rely on the Service for critical business operations or production use
- Upload malicious files (executables, scripts with eval, obfuscated code)
- Share access credentials or authentication tokens
- Attempt to access other users' data or accounts
- Reverse engineer or copy the Service

## 7. Intellectual Property

### Your Content:
- You retain full ownership of your original CV content
- You grant us a temporary, non-exclusive license to process your content for Service functionality
- Your content is automatically deleted according to our cleanup policies (24 hours to 30 days)
- No permanent rights are transferred to the Service

### Generated Content:
- Generated landing pages are provided for your personal use
- You may download and use generated content for lawful purposes
- No warranties provided regarding the accuracy, quality, or completeness of generated content
- AI-generated content may contain errors, inaccuracies, or require manual review
- Content is based on AI interpretation and should be verified before use

### Service Intellectual Property:
- The Service code, design, and functionality remain our property
- Templates and generated code structures are provided "as-is"
- You may not copy, redistribute, or commercialize the Service itself

## 8. File Upload Security & Validation

We implement security measures for uploaded files, including:
- **MIME Type Validation**: PDF, DOC, DOCX only
- **File Signature Checking**: Magic bytes verification
- **Malicious Pattern Detection**:
  - Script tags and JavaScript event handlers
  - Executable file references (.exe, .bat, .sh, .ps1)
  - Base64 eval patterns and obfuscated code
  - PDF JavaScript and embedded files
  - High entropy content (potential encryption/obfuscation)
- **Path Traversal Prevention**: Filename sanitization
- **File Size Limits**: 10MB maximum per upload

**Important**: While we implement security measures, no validation is 100% perfect. Use caution with sensitive documents.

## 9. Disclaimers and Limitations

### NO WARRANTIES:
THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, INCLUDING BUT NOT LIMITED TO:
- **Availability**: No guarantee the Service will be accessible at any given time
- **Accuracy**: AI-generated content may contain errors, omissions, or inaccuracies
- **Security**: No guarantee against data breaches, loss, or unauthorized access
- **Performance**: No guarantees regarding processing speed, quality, or completeness
- **Compatibility**: Generated content may not work in all environments
- **Data Integrity**: Files may be corrupted or lost without warning
- **Third-Party Services**: No control over Google, GitHub, Gemini, or Supabase availability

### LIMITATION OF LIABILITY:
TO THE MAXIMUM EXTENT PERMITTED BY LAW:
- We are not liable for any direct, indirect, incidental, special, or consequential damages
- We are not liable for data loss, corruption, or unauthorized access
- We are not liable for third-party service failures, data handling, or privacy breaches
- Our total liability is limited to the amount you paid for the Service (**$0.00**)
- We are not responsible for any business losses, lost profits, or damages
- We are not liable for platform restarts, service interruptions, or data deletion

## 10. Service Modifications and Termination

### We Reserve the Right To:
- Modify, suspend, or permanently discontinue the Service at any time without notice
- Update these Terms without prior notification (continued use constitutes acceptance)
- Implement additional usage restrictions or rate limits as needed
- Delete user data according to our automated cleanup policies
- Terminate user accounts for violations of these Terms
- Change features, functionality, or third-party integrations
- Migrate to different infrastructure or service providers

### User Termination:
- You may stop using the Service at any time
- Account deletion available through database services
- Your data will be automatically deleted according to retention policies (2-24 hours)
- No data recovery available after deletion

## 11. Free Tier Infrastructure Acknowledgment

You understand and accept that this Service runs entirely on FREE TIER infrastructure:

### Hosting & Platform:
- **Hosting**: Free tier hosting (Render/Heroku/similar platforms)
- **Automatic Sleep**: Service may sleep during inactivity
- **Cold Starts**: First request after sleep may have delays
- **Platform Restarts**: Ephemeral storage lost completely on restarts
- **No Dedicated Resources**: Shared free tier resources

### Database:
- **Supabase Free Tier**: 100 maximum connections, limited storage
- **Connection Limits**: 20 concurrent connections enforced
- **Idle Timeout**: 60 seconds for idle connections
- **No Backups**: Limited backup capabilities on free tier

### AI Processing:
- **Gemini AI Free Tier**: Subject to daily and monthly token limits
- **Rate Limiting**: 50 CV generations per user per day
- **Queue System**: Single concurrent job globally
- **No Priority**: First-come, first-served processing

### File Storage:
- **Ephemeral Storage**: Files stored temporarily in ./uploads and ./generated
- **Lost on Restart**: All files deleted when platform restarts
- **No Persistence**: No permanent file storage available
- **Automatic Cleanup**: Aggressive cleanup policies (24 hours to 30 days)

### Monitoring & Support:
- **Limited Monitoring**: Basic free tier monitoring tools only
- **No 24/7 Support**: No dedicated support team
- **No SLA**: No service level agreements or response time guarantees
- **Community Support**: Limited to application interface feedback

## 12. Age and Eligibility

- You must be at least 13 years old to use this Service
- By using the Service, you represent that you meet this age requirement
- Users under 18 should have parental/guardian consent
- The Service is not intended for children under 13

## 13. International Users

- This Service is hosted and operated from various global locations
- By using the Service, you consent to international data transfer and processing
- Data may be processed in countries where service providers operate (USA, Europe, etc.)
- You are responsible for compliance with local laws regarding data transmission
- No guarantees regarding compliance with specific country regulations (e.g., GDPR)

## 14. Contact Information

This is an experimental educational project. For questions or concerns:
- **Technical Issues**: Report via the application interface
- **Data Concerns**: Contact through Service feedback mechanisms
- **Account Deletion**: Available through application or request
- **General Inquiries**: This is a non-commercial experimental project with no formal support

**Note**: As a free experimental service, response times are not guaranteed.

## 15. Governing Law and Dispute Resolution

- These Terms are governed by applicable local laws
- Any disputes shall be resolved through good-faith negotiation
- Users agree to informal dispute resolution before formal legal action
- Jurisdiction determined by Service operator location
- No class action lawsuits permitted

## 16. Severability

If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions will continue in full force and effect.

## 17. Entire Agreement

These Terms, together with the Privacy Policy and Disclaimer, constitute the entire agreement between you and the Service regarding use of the platform.

## 18. No Waiver

Failure to enforce any provision of these Terms does not constitute a waiver of that provision or any other provision.

## 19. Changes to Terms

- We may update these Terms at any time without prior notice
- Changes will be posted with updated "Last Updated" date
- Continued use of the Service after changes constitutes acceptance
- Review Terms periodically for updates
- Material changes may be highlighted in the application

---

## Summary of Key Points:

✅ **Free Tier Service**: Experimental, educational project on free infrastructure
⚠️ **No Guarantees**: "As-is" service with no SLA, warranties, or uptime promises
🕒 **Temporary Storage**: Files auto-deleted in 24 hours to 30 days, lost on restarts
⚡ **Rate Limits**: 50 CV/day, 100 API requests/15min, single global queue
📦 **File Limits**: 10MB upload, 50MB download, specific format restrictions
🔒 **Security**: File validation, JWT auth, but no guarantees against breaches
🌐 **Third-Party**: Data shared with Google, GitHub (optional), Gemini AI, Supabase
💰 **Liability**: Capped at $0 (amount paid for free service)
🚫 **Not For**: Business use, sensitive docs, critical operations, commercial purposes

---

**IMPORTANT REMINDER**: This is an experimental service in active development running entirely on free tier infrastructure.

**Do not use for:**
- Business-critical operations
- Confidential or sensitive documents
- Long-term data storage
- Production environments
- Commercial purposes

**By using this Service, you acknowledge that you have read, understood, and agree to these Terms of Service.**
