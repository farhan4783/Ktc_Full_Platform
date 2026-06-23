import {
  s3Client,
  BUCKET_NAME,
  PUBLIC_URL,
  PutObjectCommand,
  DeleteObjectCommand,
  getSignedUrl,
} from '../config/storage';
import { logger } from '../utils/logger';

// ============================================================
// Storage Service
// Per TRD v2: Cloudflare R2 (S3-compatible, 10GB free)
// Handles: presigned upload URLs, file deletion, CDN URL gen
// ============================================================

/**
 * Generate a presigned URL for direct upload to R2
 * Client uploads directly — server never touches the file
 */
export async function generatePresignedUploadUrl(
  fileKey: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: expiresInSeconds,
  });

  return url;
}

/**
 * Delete a file from R2
 */
export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    logger.error('Failed to delete file from R2:', error);
    return false;
  }
}

/**
 * Build the public CDN URL for a stored file
 */
export function getPublicUrl(fileKey: string): string {
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${fileKey}`;
  }
  return fileKey;
}

/**
 * Generate a unique file key for upload
 * Pattern: {context}/{year}/{month}/{uuid}-{filename}
 */
export function generateFileKey(
  context: string,
  originalFilename: string,
  uniqueId: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return `${context}/${year}/${month}/${uniqueId}-${safeFilename}`;
}

/**
 * Upload a raw buffer directly to R2 from the server
 */
export async function uploadFileBuffer(
  fileKey: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return getPublicUrl(fileKey);
}
