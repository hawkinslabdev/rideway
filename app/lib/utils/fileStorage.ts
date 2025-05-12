// app/lib/utils/fileStorage.ts

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class FileStorage {
  static uploadsDir = join(process.cwd(), 'public', 'uploads');

  /**
   * Initialize the file storage system, ensuring directories exist
   */
  static initialize() {
    // Ensure uploads directory exists
    if (!existsSync(this.uploadsDir)) {
      try {
        mkdirSync(this.uploadsDir, { recursive: true });
        console.log(`Uploads directory created at ${this.uploadsDir}`);
      } catch (error) {
        console.error(`Failed to create uploads directory: ${error}`);
      }
    }
  }

  /**
   * Get the absolute path to save an uploaded file
   */
  static getUploadPath(filename: string): string {
    return join(this.uploadsDir, filename);
  }

  /**
   * Get the public URL for an uploaded file
   */
  static getPublicUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}

// Initialize on module load
FileStorage.initialize();