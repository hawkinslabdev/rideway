// app/api/uploads/image/route.ts
import { NextResponse } from "next/server";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { existsSync } from "fs";

/**
 * API endpoint for handling image uploads
 * This separates the image handling from the motorcycle PATCH endpoint
 * and provides better error handling for Docker environments
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Process the form data
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }
    
    // Validate file type
    const originalName = file.name;
    const extension = originalName.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!extension || !validExtensions.includes(extension)) {
      return NextResponse.json(
        { error: `Invalid file type. Supported formats: ${validExtensions.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: 5MB` },
        { status: 400 }
      );
    }
    
    // Create a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomString}.${extension}`;
    
    // Define the uploads directory and create if it doesn't exist
    const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'public', 'uploads');
    
    if (!existsSync(uploadsDir)) {
      try {
        await mkdir(uploadsDir, { recursive: true });
        console.log(`Created uploads directory: ${uploadsDir}`);
      } catch (mkdirError) {
        console.error(`Error creating uploads directory: ${mkdirError}`);
        return NextResponse.json(
          { error: "Failed to create uploads directory" },
          { status: 500 }
        );
      }
    }
    
    // Define the file path
    const filePath = join(uploadsDir, filename);
    
    try {
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Write the file
      await writeFile(filePath, buffer);
      console.log(`Successfully saved image to ${filePath}`);
      
      // Construct the URL path for the saved file
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const imagePath = `/uploads/${filename}`;
      const imageUrl = baseUrl ? `${baseUrl}${imagePath}` : imagePath;
      
      // Return the image URL
      return NextResponse.json({
        success: true,
        imageUrl: imageUrl,
        message: "Image uploaded successfully"
      });
    } catch (writeError) {
      console.error(`Error writing file: ${writeError}`);
      
      // Try to get more info about the error
      try {
        const { execSync } = require('child_process');
        const dirInfo = execSync(`ls -la ${uploadsDir}`);
        console.error(`Uploads directory contents and permissions: ${dirInfo}`);
      } catch (lsError) {
        console.error(`Could not check directory: ${lsError}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to save the image file",
          details: writeError instanceof Error ? writeError.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Failed to process image upload" },
      { status: 500 }
    );
  }
}