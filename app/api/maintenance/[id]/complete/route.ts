// app/api/maintenance/[id]/complete/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { maintenanceTasks, maintenanceRecords, motorcycles } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { randomUUID } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await the params before using them
    const { id } = await params;

    // Get the task 
    const task = await db.query.maintenanceTasks.findFirst({
      where: eq(maintenanceTasks.id, id),
    });

    if (!task) {
      return NextResponse.json(
        { error: "Maintenance task not found" },
        { status: 404 }
      );
    }

    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, task.motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Unauthorized - motorcycle not found" },
        { status: 401 }
      );
    }

    // Get the request body (optional)
    const body = await request.json().catch(() => ({}));
    
    // Create a maintenance record
    const newRecord = await db.insert(maintenanceRecords).values({
      id: randomUUID(),
      motorcycleId: task.motorcycleId,
      taskId: task.id,
      date: new Date(),
      mileage: body.mileage || motorcycle.currentMileage || null,
      cost: body.cost || null,
      notes: body.notes || `Completed ${task.name}`,
      receiptUrl: body.receiptUrl || null,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({
      message: "Maintenance task completed successfully",
      record: newRecord[0]
    });
  } catch (error) {
    console.error("Error completing maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to complete maintenance task" },
      { status: 500 }
    );
  }
}