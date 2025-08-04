// File: middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Please provide a valid Bearer token' 
        });
    }

    const token = authHeader.substring(7);
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (jwtError) {
        console.error('JWT verification failed:', jwtError.message);
        return res.status(401).json({ 
            error: 'Invalid token',
            message: 'Token is expired or invalid'
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (jwtError) {
            // Ignore invalid tokens in optional auth
            console.warn('Optional auth: Invalid token provided');
        }
    }
    
    next();
};

// Middleware to check if user is admin (example for future use)
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'Admin access requires authentication' 
        });
    }
    
    // Add admin check logic here when user roles are implemented
    // For now, all authenticated users are considered admins
    next();
};

module.exports = {
    verifyToken,
    optionalAuth,
    requireAdmin
};