// app/lib/config/uploads.ts
import { join } from 'path';

/**
 * Configuration for file uploads
 * This centralizes the upload paths and URLs for consistency across environments
 */
export const uploadsConfig = {
  // Base directory for uploads - use environment variable if set
  baseDir: process.env.UPLOADS_DIR || join(process.cwd(), 'public', 'uploads'),
  
  // URL path for accessing uploaded files
  urlPath: '/uploads',
  
  // Get the full path for a file in the uploads directory
  getFilePath: (filename: string): string => {
    return join(uploadsConfig.baseDir, filename);
  },
  
  // Get the public URL for accessing an uploaded file
  getPublicUrl: (filename: string): string => {
    // If NEXT_PUBLIC_BASE_URL is defined, use it for absolute URLs
    // This is particularly important in Docker/containerized environments
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    return `${baseUrl}${uploadsConfig.urlPath}/${filename}`;
  },
  
  // Image specific configurations
  images: {
    // Maximum file size for uploaded images (5MB)
    maxSize: 5 * 1024 * 1024,
    
    // Valid image types that can be uploaded
    validTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // Valid file extensions
    validExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  }
};