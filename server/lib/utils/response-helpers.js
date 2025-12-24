// File: lib/utils/response-helpers.js
// Shared response helper utilities to reduce code duplication

/**
 * Send a standardized 500 Internal Server Error response
 * @param {object} res - Express response object
 * @param {string} context - Context for logging (e.g., 'Login', 'CV processing')
 * @param {Error} error - The error object
 * @param {string} errorType - Error type for the response (default: 'Internal server error')
 */
function sendServerError(res, context, error, errorType = 'Internal server error') {
    console.error(`${context} error:`, error);
    res.status(500).json({
        error: errorType,
        message: error.message
    });
}

/**
 * Send a standardized 400 Bad Request response
 * @param {object} res - Express response object
 * @param {string} errorMessage - Error message to send
 */
function sendBadRequest(res, errorMessage) {
    res.status(400).json({ error: errorMessage });
}

module.exports = {
    sendServerError,
    sendBadRequest
};
