// app/api/motorcycles/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ motorcycles: [] });
    }

    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, session.user.id),
      orderBy: (motorcycles, { desc }) => [desc(motorcycles.createdAt)],
    });

    return NextResponse.json({ motorcycles: userMotorcycles });
  } catch (error) {
    console.error("Motorcycles API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch motorcycles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check content type to determine how to process the request
    const contentType = request.headers.get('content-type');
    let body: any = {};
    let imageUrl: string | null = null;

    if (contentType?.includes('multipart/form-data')) {
      // Handle form data with file upload
      const formData = await request.formData();
      
      // Extract form fields
      const fields = ['name', 'make', 'model', 'vin', 'color', 'notes'];
      fields.forEach(field => {
        const value = formData.get(field);
        if (value !== null) {
          body[field] = value.toString();
        }
      });

      // Handle numeric fields
      const year = formData.get('year');
      if (year) {
        body.year = parseInt(year.toString());
      }

      const currentMileage = formData.get('currentMileage');
      if (currentMileage) {
        body.currentMileage = parseInt(currentMileage.toString());
      }

      // Handle date fields
      const purchaseDate = formData.get('purchaseDate');
      if (purchaseDate && purchaseDate.toString().trim() !== '') {
        body.purchaseDate = new Date(purchaseDate.toString());
      }
      
      // Handle image upload
      const imageFile = formData.get('image') as File | null;
      if (imageFile && imageFile.size > 0) {
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Create a unique filename
        const extension = imageFile.name.split('.').pop();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `${Date.now()}-${randomString}.${extension}`;
        const publicPath = join(process.cwd(), 'public', 'uploads');
        const filePath = join(publicPath, filename);
        
        // Ensure the uploads directory exists
        try {
          await mkdir(publicPath, { recursive: true });
        } catch (error) {
          // Directory might already exist
        }
        
        // Save the file
        await writeFile(filePath, buffer);
        imageUrl = `/uploads/${filename}`;
      }
    } else {
      // Handle regular JSON data
      try {
        body = await request.json();
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }
    }

    // Ensure mileage is stored as a number
    const currentMileage = body.currentMileage 
      ? parseInt(body.currentMileage) 
      : null;
      
    const existingMotorcycles = await db.query.motorcycles.findMany({
     where: eq(motorcycles.userId, session.user.id),
    });
    const isDefault = existingMotorcycles.length === 0;

    const newMotorcycle = await db.insert(motorcycles).values({
      id: randomUUID(),
      userId: session.user.id,
      name: body.name,
      make: body.make,
      model: body.model,
      year: body.year,
      vin: body.vin || null,
      color: body.color || null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      currentMileage: currentMileage,
      imageUrl: imageUrl || body.imageUrl || null,
      notes: body.notes || null,
      isDefault: isDefault,
      isOwned: true, 
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newMotorcycle[0], { status: 201 });
  } catch (error) {
    console.error("Create motorcycle error:", error);
    return NextResponse.json(
      { error: "Failed to create motorcycle" },
      { status: 500 }
    );
  }
}