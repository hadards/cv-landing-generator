# Server

This directory contains the Node.js backend server for the CV Landing Generator.

## Structure

- `server.js` - Main server entry point
- `controllers/` - Route controllers
- `routes/` - API route definitions
- `middleware/` - Express middleware
- `lib/` - Core business logic and utilities
- `database/` - Database configuration and schemas
- `templates/` - Landing page templates
- `test/` - Server-side tests

## Running the Server

From the root directory:
```bash
npm run dev:api
```

Or directly:
```bash
node server/server.js
```

## Dependencies

The server uses dependencies from the root `package.json` file. No separate package.json is maintained in this directory.