// File: lib/utils/date-parser-utils.js
// Date parsing utilities - handles multiple formats consistently

const CONSTANTS = require('../../constants/template-processor-constants');

class DateParserUtils {
    /**
     * Parse date string in multiple formats: MM/YYYY, YYYY-MM, YYYY
     * @param {string} dateStr
     * @returns {Date}
     * @throws {Error} if format is invalid
     */
    static parseDate(dateStr) {
        if (!dateStr) {
            throw new Error('Date string is required');
        }

        // Handle "Present" case
        if (dateStr.toLowerCase() === CONSTANTS.DEFAULTS.END_DATE.toLowerCase()) {
            return new Date();
        }

        // MM/YYYY or M/YYYY format
        if (dateStr.includes('/')) {
            const [month, year] = dateStr.split('/');
            return new Date(`${year}-${month.padStart(2, '0')}-01`);
        }

        // YYYY-MM format
        if (dateStr.includes('-')) {
            return new Date(dateStr + '-01');
        }

        // YYYY format
        if (dateStr.length === 4) {
            return new Date(dateStr + '-01-01');
        }

        throw new Error(`Invalid date format: ${dateStr}`);
    }

    /**
     * Extract date range from text line
     * @param {string} line
     * @returns {{startDate: string, endDate: string} | null}
     */
    static extractDateRange(line) {
        const match = line.match(CONSTANTS.PATTERNS.DATE_RANGE);
        if (!match) {
            return null;
        }

        return {
            startDate: match[1],
            endDate: match[2]
        };
    }

    /**
     * Calculate months difference between two dates
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {number}
     */
    static calculateMonthsDifference(startDate, endDate) {
        return (endDate.getFullYear() - startDate.getFullYear()) * 12 +
            (endDate.getMonth() - startDate.getMonth());
    }

    /**
     * Validate date is not NaN
     * @param {Date} date
     * @returns {boolean}
     */
    static isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }
}

module.exports = DateParserUtils;
