// File: app/lib/utils/encryption.ts
import crypto from 'crypto';

// Get encryption key from environment variable or use a default for development
// The key needs to be exactly 32 bytes (256 bits) for AES-256-CBC
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-that-is-32-bytes!!!';

// Encrypt data (convert to string if needed)
export function encrypt(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY).slice(0, 32), // Ensure exactly 32 bytes
    iv
  );
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data (IV is needed for decryption)
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt data
export function decrypt(data: string): string {
  const parts = data.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY).slice(0, 32), // Ensure exactly 32 bytes
    iv
  );
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}