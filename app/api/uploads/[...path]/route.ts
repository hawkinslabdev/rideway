// app/api/uploads/[...path]/route.ts

import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await the params before using them
    const { path } = await params;
    
    console.log("Request for image path:", path);
    
    // Get the file path from the params
    const filePath = join(process.cwd(), 'public', 'uploads', ...path);
    console.log("Full file path:", filePath);
    
    // Safety check - make sure the path is within the uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    console.log("Uploads dir:", uploadsDir);
    
    if (!filePath.startsWith(uploadsDir)) {
      console.error("Access denied: Path not within uploads directory");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }
    
    // Check if the file exists
    const fileExists = existsSync(filePath);
    console.log("File exists:", fileExists);
    
    if (!fileExists) {
      console.error("File not found:", filePath);
      
      // Try to list files in the directory to help debugging
      try {
        const { readdir } = require('fs/promises');
        const dir = join(process.cwd(), 'public', 'uploads');
        if (existsSync(dir)) {
          const files = await readdir(dir);
          console.log("Files in uploads directory:", files);
        } else {
          console.log("Uploads directory does not exist");
        }
      } catch (err) {
        console.error("Error listing directory:", err);
      }
      
      return Response.json({ 
        error: "File not found", 
        path: path,
        requested: filePath 
      }, { status: 404 });
    }
    
    // Read the file
    const file = await readFile(filePath);
    console.log("File read successfully, size:", file.length);
    
    // Determine content type based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
    }
    
    console.log("Serving file with content type:", contentType);
    
    // Return the file with appropriate caching headers
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      }
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return Response.json({ 
      error: "Failed to serve image",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}