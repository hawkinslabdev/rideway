// app/api/uploads/[..path]/route.ts
import { NextResponse } from 'next/server';
import { join } from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  context: { params: Promise<{ file: string[] }> }
) {
  // No need to await params since they're already resolved in this signature
  const { file } = await context.params;
  
  const filePath = join(
    process.cwd(),
    'public',
    'uploads',
    ...(Array.isArray(file) ? file : [file])
  );

  try {
    if (!filePath) {
      throw new Error('File path is undefined');
    }

    // Check if file exists before trying to read it
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Set content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };

    // Ensure we're using a valid content type
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';
    console.log(`Serving file: ${filePath} with content type: ${contentType}`);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error(`Error serving file: ${filePath}`, err);
    return NextResponse.json(
      { error: 'File not found or could not be processed' },
      { status: 404 }
    );
  }
}