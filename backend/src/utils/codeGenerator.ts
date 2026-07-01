import crypto from 'crypto';

// ============================================================
// Code Generators
// Per Doc 04: Student code = KTC-YYYY-XXXXX
// Per Doc 09: Certificate code = KTC-CERT-YYYY-XXXXX
// ============================================================

/**
 * Generate student code: KTC-YYYY-XXXXX (5-digit random)
 */
export function generateStudentCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000); // 10000–99999
  return `KTC-${year}-${random}`;
}

/**
 * Generate certificate code: KTC-CERT-YYYY-XXXXX
 */
export function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `KTC-CERT-${year}-${random}`;
}

/**
 * Generate college code from name (uppercase, no spaces, 3-6 chars)
 */
export function generateCollegeCode(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  // Take first letter of each word, up to 4 words
  let code = parts
    .slice(0, 4)
    .map((w) => w[0].toUpperCase())
    .join('');

  // Minimum 2 chars, pad with random digits if needed
  if (code.length < 2) {
    code = code.padEnd(2, 'X');
  }

  // Add 2-digit random suffix for uniqueness
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${code}${suffix}`;
}

/**
 * Generate batch code: BATCH-{CollegeCode}-{YYYY}-{NN}
 */
export function generateBatchCode(collegeCode: string): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10 + Math.random() * 90);
  return `BATCH-${collegeCode}-${year}-${random}`;
}

/**
 * Generate 6-digit OTP
 */
export function generateOtp(): string {
  if (process.env.NODE_ENV === 'development') {
    return '123456';
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate random hex token (for refresh tokens)
 */
export function generateRandomToken(bytes: number = 64): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token with SHA256 (for storing refresh tokens)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a temporary password (for admin-created accounts)
 */
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
