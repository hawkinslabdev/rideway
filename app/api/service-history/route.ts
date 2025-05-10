// app/api/service-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { desc, eq } from "drizzle-orm";
import { motorcycles, serviceRecords } from "@/app/lib/db/schema";
import { customAlphabet } from "nanoid";

export async function GET(req: NextRequest) {
  try {
    // Get service records with motorcycle information
    interface ServiceRecordWithMotorcycle {
      id: string;
      motorcycleId: string;
      motorcycle?: { 
        id: string;
        name: string; 
      } | null;
      date: Date;
      mileage: number | null;
      task: string;
      cost: number | null;
      location: string | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }

    const records = await db.query.serviceRecords.findMany({
      with: {
        motorcycle: true,
      },
      orderBy: [desc(serviceRecords.date)],
    });

    // Format the records for the frontend
    const formattedRecords = records.map(record => ({
      id: record.id,
      motorcycleId: record.motorcycleId,
      motorcycle: record.motorcycle?.name || "Unknown",
      date: record.date.toISOString(),
      mileage: record.mileage,
      task: record.task,
      cost: record.cost,
      location: record.location || "",
      notes: record.notes,
    }));

    return NextResponse.json({ records: formattedRecords });
  } catch (error) {
    console.error("Error fetching service history:", error);
    return NextResponse.json(
      { error: "Failed to fetch service history" },
      { status: 500 }
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate the request
    if (!data.motorcycleId || !data.date || !data.task) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Create the record
    await db.insert(serviceRecords).values({
      id: data.id || nanoid(),
      motorcycleId: data.motorcycleId,
      date: new Date(data.date),
      mileage: data.mileage,
      task: data.task,
      cost: data.cost,
      location: data.location,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Check if we need to update the motorcycle's current mileage
    if (data.mileage) {
      const motorcycle = await db.query.motorcycles.findFirst({
        where: eq(motorcycles.id, data.motorcycleId),
      });
      
      if (motorcycle && (motorcycle.currentMileage === null || data.mileage > motorcycle.currentMileage)) {
        // Update the motorcycle's mileage
        await db
          .update(motorcycles)
          .set({
            currentMileage: data.mileage,
            updatedAt: new Date(),
          })
          .where(eq(motorcycles.id, data.motorcycleId));
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating service record:", error);
    return NextResponse.json(
      { error: "Failed to create service record" },
      { status: 500 }
    );
  }
}
function nanoid(): string {
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const nanoidGenerator = customAlphabet(alphabet, 21); // Generate a 21-character ID
    return nanoidGenerator();
}

