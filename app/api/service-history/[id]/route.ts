// app/api/service-history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { eq } from "drizzle-orm";
import { serviceRecords, motorcycles } from "@/app/lib/db/schema";

// Get a specific service record
export async function GET(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  try {
    const record = await db.query.serviceRecords.findFirst({
      where: eq(serviceRecords.id, id),
      with: {
        motorcycle: true,
      },
    });
    
    if (!record) {
      return NextResponse.json(
        { error: "Service record not found" },
        { status: 404 }
      );
    }
    
    // Format the record for the frontend
    const formattedRecord = {
      id: record.id,
      motorcycleId: record.motorcycleId,
      motorcycle: record.motorcycle?.name || "Unknown",
      date: record.date.toISOString(),
      mileage: record.mileage,
      task: record.task,
      cost: record.cost,
      location: record.location,
      notes: record.notes,
    };
    
    return NextResponse.json({ record: formattedRecord });
  } catch (error) {
    console.error("Error fetching service record:", error);
    return NextResponse.json(
      { error: "Failed to fetch service record" },
      { status: 500 }
    );
  }
}

// Update a service record
export async function PATCH(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  try {
    const data = await request.json();
    
    // Validate the request
    if (!data.motorcycleId || !data.date || !data.task) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Check if record exists
    const existingRecord = await db.query.serviceRecords.findFirst({
      where: eq(serviceRecords.id, id),
    });
    
    if (!existingRecord) {
      return NextResponse.json(
        { error: "Service record not found" },
        { status: 404 }
      );
    }
    
    // Update the record
    await db
      .update(serviceRecords)
      .set({
        motorcycleId: data.motorcycleId,
        date: new Date(data.date),
        mileage: data.mileage,
        task: data.task,
        cost: data.cost,
        location: data.location,
        notes: data.notes,
        updatedAt: new Date(),
      })
      .where(eq(serviceRecords.id, id));
    
    // Fetch the updated record
    const updatedRecord = await db.query.serviceRecords.findFirst({
      where: eq(serviceRecords.id, id),
      with: {
        motorcycle: true,
      },
    });
    
    // Format the record for the frontend
    const formattedRecord = {
      id: updatedRecord!.id,
      motorcycleId: updatedRecord!.motorcycleId,
      motorcycle: updatedRecord!.motorcycle?.name || "Unknown",
      date: updatedRecord!.date.toISOString(),
      mileage: updatedRecord!.mileage,
      task: updatedRecord!.task,
      cost: updatedRecord!.cost,
      location: updatedRecord!.location,
      notes: updatedRecord!.notes,
    };
    
    return NextResponse.json({ record: formattedRecord });
  } catch (error) {
    console.error("Error updating service record:", error);
    return NextResponse.json(
      { error: "Failed to update service record" },
      { status: 500 }
    );
  }
}

// Delete a service record
export async function DELETE(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  try {
    // Check if record exists
    const existingRecord = await db.query.serviceRecords.findFirst({
      where: eq(serviceRecords.id, id),
    });
    
    if (!existingRecord) {
      return NextResponse.json(
        { error: "Service record not found" },
        { status: 404 }
      );
    }
    
    // Delete the record
    await db
      .delete(serviceRecords)
      .where(eq(serviceRecords.id, id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service record:", error);
    return NextResponse.json(
      { error: "Failed to delete service record" },
      { status: 500 }
    );
  }
}