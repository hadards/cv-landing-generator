// Encryption utility for sensitive data (GitHub tokens, etc.)
const crypto = require('crypto');

class EncryptionService {
    constructor() {
        // Get encryption key from environment
        this.encryptionKey = process.env.ENCRYPTION_KEY;

        if (!this.encryptionKey) {
            console.warn('ENCRYPTION_KEY not set - sensitive data will not be encrypted');
        } else if (this.encryptionKey.length !== 64) {
            // Key should be 32 bytes (64 hex characters)
            throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
        }

        this.algorithm = 'aes-256-gcm';
        this.ivLength = 16; // For GCM mode
        this.saltLength = 64;
        this.tagLength = 16;
        this.tagPosition = this.saltLength + this.ivLength;
        this.encryptedPosition = this.tagPosition + this.tagLength;
    }

    /**
     * Encrypt sensitive data
     */
    encrypt(text) {
        if (!text) {
            return null;
        }

        if (!this.encryptionKey) {
            console.warn('Encryption key not available - storing data in plain text');
            return text;
        }

        try {
            // Generate random salt and IV
            const salt = crypto.randomBytes(this.saltLength);
            const iv = crypto.randomBytes(this.ivLength);

            // Derive key from encryption key + salt
            const key = crypto.pbkdf2Sync(
                Buffer.from(this.encryptionKey, 'hex'),
                salt,
                100000,
                32,
                'sha512'
            );

            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);

            // Encrypt the text
            const encrypted = Buffer.concat([
                cipher.update(text, 'utf8'),
                cipher.final()
            ]);

            // Get auth tag
            const tag = cipher.getAuthTag();

            // Combine salt + iv + tag + encrypted data
            const result = Buffer.concat([salt, iv, tag, encrypted]);

            // Return as base64
            return result.toString('base64');

        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedText) {
        if (!encryptedText) {
            return null;
        }

        if (!this.encryptionKey) {
            console.warn('Encryption key not available - returning data as-is');
            return encryptedText;
        }

        try {
            // Convert from base64
            const buffer = Buffer.from(encryptedText, 'base64');

            // Extract components
            const salt = buffer.subarray(0, this.saltLength);
            const iv = buffer.subarray(this.saltLength, this.tagPosition);
            const tag = buffer.subarray(this.tagPosition, this.encryptedPosition);
            const encrypted = buffer.subarray(this.encryptedPosition);

            // Derive key
            const key = crypto.pbkdf2Sync(
                Buffer.from(this.encryptionKey, 'hex'),
                salt,
                100000,
                32,
                'sha512'
            );

            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            decipher.setAuthTag(tag);

            // Decrypt
            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);

            return decrypted.toString('utf8');

        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

}

// Singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;
