import { Request, Response, NextFunction } from 'express';
import { generatePresignedUploadUrl, generateFileKey, getPublicUrl } from '../../services/storage.service';
import { sendSuccess } from '../../utils/response';
import crypto from 'crypto';

export async function getPresignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filename, contentType, context } = req.body;
    
    // Generate a unique ID for the file
    const uniqueId = crypto.randomUUID();
    
    // Generate the file key
    const fileKey = generateFileKey(context, filename, uniqueId);
    
    // Generate the presigned upload URL
    const uploadUrl = await generatePresignedUploadUrl(fileKey, contentType);
    
    // Generate the final public URL
    const publicUrl = getPublicUrl(fileKey);
    
    sendSuccess(res, {
      uploadUrl,
      publicUrl,
      fileKey,
    });
  } catch (error) {
    next(error);
  }
}
