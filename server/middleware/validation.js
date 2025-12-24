// File: middleware/validation.js
// Shared validation error handling middleware

const { validationResult } = require('express-validator');

/**
 * Middleware to handle express-validator validation errors
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

module.exports = {
    handleValidationErrors
};
