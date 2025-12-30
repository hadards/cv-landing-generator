// File: lib/utils/text-parser-utils.js
// Reusable text parsing utilities - DRY principle

const CONSTANTS = require('../../constants/template-processor-constants');

class TextParserUtils {
    /**
     * Split text into trimmed, non-empty lines
     * @param {string} text
     * @returns {string[]}
     */
    static splitLines(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line);
    }

    /**
     * Extract achievements from lines (bullet points)
     * @param {string[]} lines
     * @returns {string[]}
     */
    static extractAchievements(lines) {
        return lines
            .filter(line => this.isBulletPoint(line))
            .map(line => line.replace(CONSTANTS.PATTERNS.BULLET_PREFIX, ''));
    }

    /**
     * Check if line is a bullet point
     * @param {string} line
     * @returns {boolean}
     */
    static isBulletPoint(line) {
        return CONSTANTS.BULLET_CHARS.some(char => line.startsWith(char));
    }

    /**
     * Check if line is a job header (has date pattern)
     * @param {string} line
     * @returns {boolean}
     */
    static isJobBoundary(line) {
        const hasDatePattern = CONSTANTS.PATTERNS.DATE.test(line);
        const notBullet = !this.isBulletPoint(line);
        const notHeader = !line.toLowerCase().includes(CONSTANTS.SECTION_KEYWORDS.KEY_ACHIEVEMENTS);
        const isLongEnough = line.length > CONSTANTS.MIN_JOB_LINE_LENGTH;

        return hasDatePattern && notBullet && notHeader && isLongEnough;
    }

    /**
     * Find all job boundary indices in lines array
     * @param {string[]} lines
     * @returns {number[]}
     */
    static findJobBoundaries(lines) {
        const boundaries = [];
        for (let i = 0; i < lines.length; i++) {
            if (this.isJobBoundary(lines[i])) {
                boundaries.push(i);
            }
        }
        return boundaries;
    }

    /**
     * Split array into sections based on boundary indices
     * @param {any[]} array
     * @param {number[]} boundaries
     * @returns {any[][]}
     */
    static splitBySections(array, boundaries) {
        const sections = [];
        for (let i = 0; i < boundaries.length; i++) {
            const startIdx = boundaries[i];
            const endIdx = i < boundaries.length - 1 ? boundaries[i + 1] : array.length;
            sections.push(array.slice(startIdx, endIdx));
        }
        return sections;
    }
}

module.exports = TextParserUtils;
