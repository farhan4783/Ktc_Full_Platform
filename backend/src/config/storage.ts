import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 is S3-compatible — same SDK, different endpoint
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CF_ACCOUNT_ID
    ? `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kodetocareer-dev';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export { s3Client, BUCKET_NAME, PUBLIC_URL, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, getSignedUrl };
