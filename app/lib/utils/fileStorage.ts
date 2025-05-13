// app/lib/utils/fileStorage.ts
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { uploadsConfig } from '../config/uploads';

export class FileStorage {
  static uploadsDir = uploadsConfig.baseDir;

  static initialize() {
    // Ensure uploads directory exists with detailed logging
    if (!existsSync(this.uploadsDir)) {
      try {
        console.log(`Creating uploads directory at: ${this.uploadsDir}`);
        mkdirSync(this.uploadsDir, { recursive: true });
        console.log(`Successfully created uploads directory`);
        
        // Test write permissions
        const testFile = join(this.uploadsDir, '.test');
        try {
          writeFileSync(testFile, 'test');
          console.log('Directory is writable');
          
          // Clean up test file
          const fs = require('fs');
          fs.unlinkSync(testFile);
        } catch (writeError) {
          console.error(`Cannot write to uploads directory: ${writeError}`);
          console.error(`This might cause image upload failures.`);
          console.error(`Check container permissions and volume mounts.`);
        }
      } catch (error) {
        console.error(`Failed to create uploads directory: ${error}`);
        console.error(`Current working directory: ${process.cwd()}`);
        
        // Try to create directory with different permissions as fallback
        try {
          console.log("Attempting fallback directory creation with chmod 777...");
          const { execSync } = require('child_process');
          execSync(`mkdir -p ${this.uploadsDir} && chmod -R 777 ${this.uploadsDir}`);
          console.log("Fallback directory creation successful");
        } catch (fallbackError) {
          console.error(`Fallback directory creation also failed: ${fallbackError}`);
        }
      }
    } else {
      console.log(`Uploads directory already exists at: ${this.uploadsDir}`);
      
      // Verify directory permissions
      try {
        const { statSync } = require('fs');
        const stats = statSync(this.uploadsDir);
        const permissionString = (stats.mode & 0o777).toString(8);
        console.log(`Directory permissions: ${permissionString}`);
        
        // Check if it's writable
        const testFile = join(this.uploadsDir, '.test');
        writeFileSync(testFile, 'test');
        require('fs').unlinkSync(testFile);
        console.log('Directory is writable');
      } catch (error) {
        console.error(`Directory exists but might not be writable: ${error}`);
        // Try to fix permissions
        try {
          console.log("Attempting to fix directory permissions...");
          const { execSync } = require('child_process');
          execSync(`chmod -R 777 ${this.uploadsDir}`);
          console.log("Permission fix attempt completed");
        } catch (fixError) {
          console.error(`Failed to fix permissions: ${fixError}`);
        }
      }
    }
  }

  static getDirectoryPermissions() {
    try {
      const { execSync } = require('child_process');
      return execSync(`ls -la ${this.uploadsDir}`).toString();
    } catch (error) {
      return `Could not get permissions: ${error}`;
    }
  }

  static getUploadPath(filename: string): string {
    return uploadsConfig.getFilePath(filename);
  }

  static getPublicUrl(filename: string): string {
    return uploadsConfig.getPublicUrl(filename);
  }

  static async saveImage(file: File): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      // Check if file exists
      if (!file) {
        return {
          success: false,
          error: 'No file provided'
        };
      }
      
      // Check if file has content
      if (file.size === 0) {
        return {
          success: false,
          error: 'File is empty'
        };
      }
      
      // Get file extension and validate it's an image
      const originalName = file.name || '';
      const extension = originalName.split('.').pop()?.toLowerCase() || '';
      
      // Validate file extension
      if (!uploadsConfig.images.validExtensions.includes(extension)) {
        return { 
          success: false, 
          error: `Invalid file type. Supported formats are: ${uploadsConfig.images.validExtensions.join(', ')}` 
        };
      }
      
      // Validate file size
      if (file.size > uploadsConfig.images.maxSize) {
        return { 
          success: false, 
          error: `File too large. Maximum size is ${Math.floor(uploadsConfig.images.maxSize / (1024 * 1024))}MB.` 
        };
      }
      
      // Validate MIME type
      if (!uploadsConfig.images.validTypes.includes(file.type)) {
        return {
          success: false,
          error: `Invalid file type. File reports MIME type: ${file.type}`
        };
      }
      
      // Create a unique filename (sanitized)
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}-${randomString}.${extension}`;
      const filePath = this.getUploadPath(filename);
      
      // Ensure the directory exists
      if (!existsSync(this.uploadsDir)) {
        mkdirSync(this.uploadsDir, { recursive: true });
      }
      
      // Additional debug logging
      console.log(`Saving file: ${originalName} (${file.size} bytes, ${file.type}) to ${filePath}`);
      
      // Convert file to buffer and save it
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Check if buffer contains valid image data
      if (buffer.length < 8) {
        return {
          success: false,
          error: 'File appears to be invalid or corrupted'
        };
      }
      
      try {
        writeFileSync(filePath, buffer);
        console.log(`Successfully wrote file to ${filePath}`);
      } catch (writeError) {
        console.error(`Error writing file: ${writeError}`);
        
        // Try command line approach as fallback
        try {
          console.log("Attempting fallback file write method...");
          const tempPath = `/tmp/${filename}`;
          writeFileSync(tempPath, buffer);
          
          const { execSync } = require('child_process');
          execSync(`cp ${tempPath} ${filePath} && chmod 644 ${filePath}`);
          
          console.log("Fallback file write successful");
        } catch (fallbackError) {
          console.error(`Fallback file write also failed: ${fallbackError}`);
          return {
            success: false,
            error: 'Failed to save image file. Check server permissions.'
          };
        }
      }
      
      // Return the public URL path
      const publicPath = this.getPublicUrl(filename);
      console.log(`File saved. Public URL: ${publicPath}`);
      return { success: true, path: publicPath };
    } catch (error) {
      console.error('Error saving image:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error saving image' 
      };
    }
  }
}

// Initialize on module load
FileStorage.initialize();