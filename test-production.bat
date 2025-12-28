@echo off
echo ========================================
echo CV Landing Generator - Production Mode
echo ========================================
echo.
echo Setting NODE_ENV=production...
set NODE_ENV=production
echo.
echo Starting server on port 3000...
echo Press Ctrl+C to stop the server
echo.
node server/server.js
