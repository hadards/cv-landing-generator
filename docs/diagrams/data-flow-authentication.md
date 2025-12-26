# Authentication Data Flow

**Navigation**: [Documentation Home](../README.md) > [Diagrams](architecture-overview.md) > Authentication Flow

**Last Updated**: December 26, 2025

---

## Overview

This document explains how user authentication works from clicking "Sign in with Google" to making authenticated API requests. The system uses **Google OAuth 2.0** for passwordless authentication and **JWT (JSON Web Tokens)** for session management.

---

## Visual Data Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Angular Frontend
    participant B as Express Backend
    participant G as Google OAuth
    participant D as PostgreSQL DB
    participant S as Session Store

    Note over U,S: Step 1: Initiate Google Login
    U->>F: Clicks "Sign in with Google"
    F->>B: GET /api/auth/google
    B->>B: Generates OAuth state token
    B->>D: Stores CSRF state token
    D-->>B: State saved
    B-->>F: Redirect URL to Google OAuth
    F-->>U: Browser redirects to Google login

    Note over U,S: Step 2: Google Authentication
    U->>G: User enters Google credentials
    G->>G: Validates credentials
    G->>G: User authorizes app access
    G-->>U: Redirects to callback with auth code
    U->>F: Browser follows redirect
    F->>B: GET /api/auth/google/callback?code=xxx&state=yyy

    Note over U,S: Step 3: Exchange Auth Code for Tokens
    B->>B: Validates CSRF state token
    B->>D: Retrieves stored state
    D-->>B: State matches
    B->>G: POST /oauth2/token with auth code
    G->>G: Validates auth code
    G-->>B: Access token + ID token
    B->>G: GET /oauth2/userinfo with access token
    G-->>B: User profile (email, name, picture, google_id)

    Note over U,S: Step 4: Create or Update User
    B->>D: SELECT user WHERE google_id = $1
    alt User exists
        D-->>B: Existing user record
        B->>D: UPDATE users SET last_login = NOW()
    else New user
        D-->>B: No user found
        B->>D: INSERT INTO users (email, name, google_id, ...)
        D-->>B: New user created
    end

    Note over U,S: Step 5: Create JWT Session
    B->>B: Generates unique session_id
    B->>B: Generates unique token_id
    B->>B: Creates JWT payload {userId, sessionId, tokenId}
    B->>B: Signs JWT with JWT_SECRET
    B->>S: INSERT INTO user_sessions
    S-->>B: Session stored
    B->>D: Records login in api_usage table
    D-->>B: Usage logged

    Note over U,S: Step 6: Return Tokens to Frontend
    B-->>F: {accessToken, refreshToken, user}
    F->>F: Stores tokens in localStorage
    F->>F: Sets user in auth state
    F-->>U: Redirects to dashboard

    Note over U,S: Step 7: Authenticated API Request
    U->>F: User navigates to dashboard
    F->>B: GET /api/cv/list (with Authorization header)
    B->>B: Extracts JWT from Authorization header
    B->>B: Verifies JWT signature with JWT_SECRET
    B->>B: Extracts sessionId from JWT payload
    B->>S: SELECT session WHERE session_id = $1
    S-->>B: Active session found
    B->>D: SELECT blacklisted WHERE token_id = $1
    D-->>B: Token not blacklisted
    B->>S: UPDATE last_activity = NOW()
    S-->>B: Activity updated
    B->>B: Proceeds with request handler
    B->>D: SELECT cv_uploads WHERE user_id = $1
    D-->>B: User's CV uploads
    B-->>F: {cvList}
    F-->>U: Displays user's CVs

    Note over U,S: Step 8: Logout
    U->>F: Clicks "Logout"
    F->>B: POST /api/auth/logout
    B->>B: Extracts JWT from Authorization header
    B->>B: Gets sessionId and tokenId from JWT
    B->>D: INSERT INTO token_blacklist (token_id)
    D-->>B: Token blacklisted
    B->>S: DELETE FROM user_sessions WHERE session_id = $1
    S-->>B: Session deleted
    B-->>F: {message: "Logged out successfully"}
    F->>F: Removes tokens from localStorage
    F->>F: Clears auth state
    F-->>U: Redirects to home page
```

---

## Step-by-Step Breakdown

### Step 1: Initiate Google Login

**User Action**: User clicks "Sign in with Google" button on the homepage

**Frontend Processing**:
- Location: [`frontend/src/app/pages/home/home.component.ts:30-40`](../../frontend/src/app/pages/home/home.component.ts)
- Calls `authService.initiateGoogleLogin()`
- Service redirects to backend OAuth initiation endpoint

**Code**:
```typescript
initiateGoogleLogin() {
  window.location.href = `${environment.apiUrl}/api/auth/google`;
}
```

**Backend Processing**:
- **Route**: [`server/routes/auth.js:20-50`](../../server/routes/auth.js)
- **CSRF Protection**: Generates random state token to prevent CSRF attacks
- **State storage**: Stores state in database with 10-minute expiration
- **OAuth URL construction**: Builds Google OAuth authorization URL with:
  - Client ID (from `GOOGLE_CLIENT_ID` env var)
  - Redirect URI (callback URL)
  - Scope (email, profile)
  - State token (CSRF protection)

**Database Changes**:
```sql
-- Temporary CSRF state storage (can be in-memory or database)
-- This implementation uses database for multi-instance support
INSERT INTO oauth_states (state_token, created_at, expires_at)
VALUES ($1, NOW(), NOW() + INTERVAL '10 minutes');
```

**Redirect URL Format**:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
  &redirect_uri=http://localhost:3000/api/auth/google/callback
  &response_type=code
  &scope=email%20profile
  &state=random-csrf-token-here
```

**What happens**:
- Browser redirects to Google's login page
- User sees "Sign in with Google" interface

---

### Step 2: Google Authentication

**User Action**: User enters Google credentials and clicks "Allow"

**Google Processing**:
- Validates user's email and password
- Shows consent screen (app permissions: email, profile)
- User clicks "Allow" to grant access
- Google generates authorization code
- Redirects back to application callback URL

**Callback URL**:
```
http://localhost:3000/api/auth/google/callback?
  code=4/0AeanS0aXXX...authorization_code_here
  &state=random-csrf-token-here
```

**What happens**:
- Browser automatically follows redirect to backend callback
- Backend receives `code` and `state` query parameters

---

### Step 3: Exchange Auth Code for Tokens

**Backend Processing**:
- **Route**: [`server/routes/auth.js:60-150`](../../server/routes/auth.js)
- **CSRF validation**: Compares state parameter with stored state token
- **Auth code exchange**: Sends POST request to Google's token endpoint

**Token Exchange Request**:
```javascript
const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
  code: authCode,
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  redirect_uri: callbackUrl,
  grant_type: 'authorization_code'
});

const { access_token, id_token } = tokenResponse.data;
```

**User Info Retrieval**:
```javascript
const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
  headers: {
    Authorization: `Bearer ${access_token}`
  }
});

const { email, name, picture, id: google_id, verified_email } = userInfoResponse.data;
```

**Database Cleanup**:
```sql
-- Remove used CSRF state token
DELETE FROM oauth_states WHERE state_token = $1;
```

**What we get from Google**:
```json
{
  "email": "user@gmail.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/a/...",
  "id": "123456789012345678901",
  "verified_email": true
}
```

---

### Step 4: Create or Update User

**Backend Processing**:
- **User lookup**: Query database for existing user with `google_id`
- **User creation**: If new user, insert into `users` table
- **User update**: If existing user, update `last_login` timestamp

**New User Flow**:
```sql
INSERT INTO users (
  email,
  name,
  profile_picture,
  google_id,
  email_verified,
  created_at,
  last_login
) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
RETURNING id, email, name, profile_picture, created_at;
```

**Existing User Flow**:
```sql
UPDATE users
SET last_login = NOW(),
    name = $1,
    profile_picture = $2
WHERE google_id = $3
RETURNING id, email, name, profile_picture, created_at;
```

**User object returned**:
```javascript
{
  id: "uuid-v4-string",
  email: "user@gmail.com",
  name: "John Doe",
  profilePicture: "https://lh3.googleusercontent.com/a/...",
  createdAt: "2025-12-26T10:30:00Z"
}
```

---

### Step 5: Create JWT Session

**Backend Processing**:
- **Session ID generation**: Random UUID for session tracking
- **Token ID generation**: Random UUID for token blacklisting
- **JWT payload creation**: Includes user ID, session ID, token ID, expiration
- **JWT signing**: Signed with `JWT_SECRET` from environment variables

**Session Storage**:
```sql
INSERT INTO user_sessions (
  session_id,
  user_id,
  token_id,
  created_at,
  last_activity,
  expires_at
) VALUES (
  $1,  -- session_id (UUID)
  $2,  -- user_id
  $3,  -- token_id (UUID)
  NOW(),
  NOW(),
  NOW() + INTERVAL '24 hours'
);
```

**Session Limit Enforcement**:
```sql
-- Check active sessions count
SELECT COUNT(*) FROM user_sessions WHERE user_id = $1 AND expires_at > NOW();

-- If >= 5 sessions, delete oldest
DELETE FROM user_sessions
WHERE session_id IN (
  SELECT session_id FROM user_sessions
  WHERE user_id = $1
  ORDER BY created_at ASC
  LIMIT 1
);
```

**JWT Payload**:
```javascript
const payload = {
  userId: user.id,
  sessionId: sessionId,
  tokenId: tokenId,
  email: user.email,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)  // 24 hours
};
```

**JWT Creation**:
```javascript
const jwt = require('jsonwebtoken');

const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h'
});

const refreshToken = jwt.sign(
  { ...payload, type: 'refresh' },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
);
```

**Code Location**: [`server/routes/auth.js:200-250`](../../server/routes/auth.js)

---

### Step 6: Return Tokens to Frontend

**Backend Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-v4-string",
    "email": "user@gmail.com",
    "name": "John Doe",
    "profilePicture": "https://..."
  },
  "message": "Login successful"
}
```

**Frontend Processing**:
- Location: [`frontend/src/app/services/auth.service.ts:50-80`](../../frontend/src/app/services/auth.service.ts)
- **Token storage**: Saves tokens to browser's `localStorage`
- **User state**: Updates authentication state in service
- **Navigation**: Redirects to dashboard page

**LocalStorage Structure**:
```javascript
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);
localStorage.setItem('user', JSON.stringify(response.user));
```

**What's stored where**:
- **Browser localStorage**: Access token, refresh token, user object
- **Database**: User record in `users` table, session in `user_sessions` table
- **Backend**: Nothing (stateless JWT authentication)

---

### Step 7: Authenticated API Request

**User Action**: User navigates to dashboard or performs any authenticated action

**Frontend Processing**:
- Location: [`frontend/src/app/interceptors/auth.interceptor.ts:20-40`](../../frontend/src/app/interceptors/auth.interceptor.ts)
- **Intercepts all HTTP requests**
- **Adds Authorization header** with JWT token

**Request Headers**:
```
GET /api/cv/list HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Host: localhost:3000
```

**Backend Processing**:
- **Middleware**: [`server/middleware/verify-token-enhanced.js`](../../server/middleware/verify-token-enhanced.js)
- **Executed before every protected route**

**Token Verification Steps**:

1. **Extract token from header**:
```javascript
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'No token provided' });
}
const token = authHeader.split(' ')[1];
```

2. **Verify JWT signature**:
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// Throws error if signature invalid or token expired
```

3. **Check session exists and is active**:
```sql
SELECT * FROM user_sessions
WHERE session_id = $1
  AND user_id = $2
  AND expires_at > NOW();
```

4. **Check token not blacklisted**:
```sql
SELECT * FROM token_blacklist
WHERE token_id = $1 AND expires_at > NOW();
```

5. **Update last activity**:
```sql
UPDATE user_sessions
SET last_activity = NOW()
WHERE session_id = $1;
```

6. **Attach user to request**:
```javascript
req.user = {
  id: decoded.userId,
  email: decoded.email,
  sessionId: decoded.sessionId,
  tokenId: decoded.tokenId
};
next(); // Continue to route handler
```

**Authorization Errors**:
- **401 Unauthorized**: No token, invalid token, expired token
- **403 Forbidden**: Token blacklisted, session not found, session expired

**Code Location**: [`server/middleware/verify-token-enhanced.js:10-100`](../../server/middleware/verify-token-enhanced.js)

---

### Step 8: Logout

**User Action**: User clicks "Logout" button

**Frontend Processing**:
- Location: [`frontend/src/app/services/auth.service.ts:100-120`](../../frontend/src/app/services/auth.service.ts)
- Sends POST request to `/api/auth/logout` with current token
- Removes tokens from localStorage
- Clears user state
- Navigates to home page

**Backend Processing**:
- **Route**: [`server/routes/auth.js:300-350`](../../server/routes/auth.js)
- **Token extraction**: Gets JWT from Authorization header
- **Blacklist token**: Adds token to blacklist (prevents reuse)
- **Delete session**: Removes session from database

**Token Blacklisting**:
```sql
INSERT INTO token_blacklist (
  token_id,
  user_id,
  blacklisted_at,
  expires_at
) VALUES (
  $1,  -- token_id from JWT
  $2,  -- user_id from JWT
  NOW(),
  NOW() + INTERVAL '7 days'  -- Keep blacklist record for 7 days
);
```

**Session Deletion**:
```sql
DELETE FROM user_sessions
WHERE session_id = $1 AND user_id = $2;
```

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

**Frontend Cleanup**:
```javascript
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');
this.currentUserSubject.next(null);
this.router.navigate(['/']);
```

**What happens**:
- Token is now permanently blacklisted (cannot be used even if not expired)
- Session deleted from database
- User must re-authenticate to access protected routes
- Old token remains in localStorage but is invalid

**Code Location**: [`server/routes/auth.js:300-350`](../../server/routes/auth.js)

---

## Security Features

### 1. CSRF Protection
- **State token**: Random token generated during OAuth initiation
- **Validation**: State token verified during callback
- **Storage**: Stored in database with 10-minute expiration
- **Purpose**: Prevents CSRF attacks on OAuth flow

### 2. JWT Token Security
- **Signature**: Tokens signed with `JWT_SECRET` (256-bit key)
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiration**: 24 hours for access tokens, 7 days for refresh tokens
- **Payload validation**: Token structure and required fields verified

### 3. Session Tracking
- **Session ID**: Unique identifier for each login session
- **Token ID**: Unique identifier for each JWT token
- **Multi-device support**: Up to 5 concurrent sessions per user
- **Activity tracking**: Last activity timestamp updated on each request
- **Expiration**: Sessions expire after 24 hours of inactivity

### 4. Token Blacklisting
- **Revocation**: Logout immediately blacklists token
- **Database-backed**: Blacklist persists across server restarts
- **Expiration cleanup**: Blacklist entries removed after 7 days
- **Verification**: Every request checks blacklist before authorization

### 5. Session Limits
- **Max sessions**: 5 active sessions per user (prevents session flooding)
- **Automatic cleanup**: Oldest session deleted when creating 6th session
- **Enforcement**: Checked during login, not during regular requests

### 6. Input Validation
- **Email validation**: Email format verified
- **Google ID validation**: Must be valid Google account ID
- **Token format**: JWT structure validated before verification

---

## Token Refresh Flow (Future Enhancement)

**Current Status**: Not yet implemented (access tokens last 24 hours)

**Planned Implementation**:
```javascript
// When access token expires (returns 401)
POST /api/auth/refresh
Headers: { "X-Refresh-Token": "refresh_token_here" }

// Backend validates refresh token
// Issues new access token with same session
// Returns { accessToken: "new_token" }

// Frontend updates localStorage with new token
```

---

## Session Management

### Active Sessions

**What is stored**:
- `session_id`: Unique session identifier
- `user_id`: User who created the session
- `token_id`: Current token for this session
- `created_at`: When session was created
- `last_activity`: Last API request timestamp
- `expires_at`: Session expiration time (24 hours from creation)

**Session Limits**:
- **Maximum**: 5 active sessions per user
- **Enforcement**: During login, if 5 sessions exist, oldest is deleted
- **Cleanup**: Expired sessions deleted daily by scheduled job

**View Active Sessions**:
```sql
SELECT
  session_id,
  created_at,
  last_activity,
  expires_at
FROM user_sessions
WHERE user_id = $1 AND expires_at > NOW()
ORDER BY last_activity DESC;
```

**Code Location**: [`server/database/session-store.js`](../../server/database/session-store.js)

### Session Termination

**User-initiated logout**: Immediate blacklist and session deletion

**Automatic expiration**: Sessions expire after 24 hours, cleaned up daily

**Manual termination**: Admin can delete sessions from database directly

**Security revocation**: If token compromise detected, admin can blacklist all tokens for a user

---

## Database Schema

### users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  profile_picture TEXT,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);
```

### user_sessions Table
```sql
CREATE TABLE user_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL,
  token_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

### token_blacklist Table
```sql
CREATE TABLE token_blacklist (
  token_id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL,
  blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);
```

**Full Schema**: [`database/DATABASE_COMPLETE.sql`](../../database/DATABASE_COMPLETE.sql)

---

## Error Scenarios

### OAuth Errors
- **User denies consent**: Redirect to home with error message
- **Invalid state token**: 403 Forbidden "CSRF validation failed"
- **Auth code expired**: 400 Bad Request "Authorization code expired"
- **Google API error**: 500 Internal Server Error "OAuth provider error"

### JWT Errors
- **No token provided**: 401 Unauthorized "No token provided"
- **Invalid token signature**: 401 Unauthorized "Invalid token"
- **Expired token**: 401 Unauthorized "Token expired"
- **Malformed token**: 401 Unauthorized "Invalid token format"

### Session Errors
- **Session not found**: 401 Unauthorized "Session not found"
- **Session expired**: 401 Unauthorized "Session expired"
- **Session limit exceeded**: 200 OK (oldest session automatically deleted)

### Blacklist Errors
- **Token blacklisted**: 403 Forbidden "Token has been revoked"
- **Already logged out**: 400 Bad Request "Already logged out"

---

## Configuration

### Environment Variables

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration
MAX_SESSIONS_PER_USER=5
SESSION_TIMEOUT_MS=86400000  # 24 hours in milliseconds

# Frontend/Backend URLs
FRONTEND_URL=http://localhost:4200
API_URL=http://localhost:3000
```

**File**: [`.env`](../../.env)

---

## Code References

### Backend
- **Auth routes**: [`server/routes/auth.js`](../../server/routes/auth.js)
- **Token verification middleware**: [`server/middleware/verify-token-enhanced.js`](../../server/middleware/verify-token-enhanced.js)
- **Session store**: [`server/database/session-store.js`](../../server/database/session-store.js)

### Frontend
- **Auth service**: [`frontend/src/app/services/auth.service.ts`](../../frontend/src/app/services/auth.service.ts)
- **Auth interceptor**: [`frontend/src/app/interceptors/auth.interceptor.ts`](../../frontend/src/app/interceptors/auth.interceptor.ts)
- **Auth guard**: [`frontend/src/app/guards/auth.guard.ts`](../../frontend/src/app/guards/auth.guard.ts)

### Database
- **Schema**: [`database/DATABASE_COMPLETE.sql`](../../database/DATABASE_COMPLETE.sql)
- **Session management**: Tables `users`, `user_sessions`, `token_blacklist`

---

## Related Documentation

- [Authentication Feature](../features/authentication.md) - Feature-level documentation
- [Session Management](../features/session-management.md) - Multi-device sessions
- [Security: Authentication](../security/authentication.md) - Security considerations
- [API: Auth Endpoints](../api/auth-endpoints.md) - Complete API reference
- [Database Schema](../database/schema.md) - Table structures

---

**Summary**: User clicks login → Google OAuth → Backend exchanges code for tokens → User created/updated → JWT session created → Tokens returned to frontend → Stored in localStorage → Included in all API requests → Token verified and session checked → Logout blacklists token and deletes session.
