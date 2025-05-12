// app/lib/utils/fileStorage.ts
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class FileStorage {
  static uploadsDir = join(process.cwd(), 'public', 'uploads');

  static initialize() {
    // Ensure uploads directory exists with detailed logging
    if (!existsSync(this.uploadsDir)) {
      try {
        console.log(`Creating uploads directory at: ${this.uploadsDir}`);
        mkdirSync(this.uploadsDir, { recursive: true });
        console.log(`Successfully created uploads directory`);
        
        // Test write permissions
        const testFile = join(this.uploadsDir, '.test');
        const fs = require('fs');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('Directory is writable');
      } catch (error) {
        console.error(`Failed to create or write to uploads directory: ${error}`);
        console.error(`Current permissions: ${this.getDirectoryPermissions()}`);
      }
    } else {
      console.log(`Uploads directory already exists at: ${this.uploadsDir}`);
      // Check if it's writable
      try {
        const testFile = join(this.uploadsDir, '.test');
        const fs = require('fs');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('Directory is writable');
      } catch (error) {
        console.error(`Directory exists but is not writable: ${error}`);
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
    return join(this.uploadsDir, filename);
  }

  static getPublicUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}

// Initialize on module load
FileStorage.initialize();