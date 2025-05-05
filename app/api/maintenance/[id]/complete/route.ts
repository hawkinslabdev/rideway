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

    // Get the request body
    const body = await request.json().catch(() => ({}));

    // Validate mileage - cannot be less than current motorcycle mileage
    if (body.mileage !== null && motorcycle.currentMileage !== null && body.mileage < motorcycle.currentMileage) {
      return NextResponse.json(
        { error: "Maintenance mileage cannot be less than current motorcycle mileage" },
        { status: 400 }
      );
    }
    
    // Get maintenance mileage (default to current motorcycle mileage if not provided)
    const maintenanceMileage = body.mileage || motorcycle.currentMileage;
    const maintenanceDate = new Date();
    
    // Determine the interval reset approach
    const resetSchedule = body.resetSchedule === undefined ? true : body.resetSchedule;
    
    // Calculate next due values based on the approach selected
    let nextDueOdometer = null;
    let nextDueDate = null;
    
    if (resetSchedule) {
      // Reset approach: calculate from current values
      if (task.intervalMiles) {
        nextDueOdometer = maintenanceMileage + task.intervalMiles;
      }
      
      if (task.intervalDays) {
        nextDueDate = new Date(maintenanceDate);
        nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
      }
    } else {
      // Maintain original schedule approach
      if (task.nextDueOdometer && task.intervalMiles) {
        // If maintenance is done early, keep the original due odometer
        // If maintenance is done late, add the interval to the current odometer
        nextDueOdometer = (maintenanceMileage < task.nextDueOdometer) 
          ? task.nextDueOdometer 
          : maintenanceMileage + task.intervalMiles;
      }
      
      if (task.nextDueDate && task.intervalDays) {
        // If maintenance is done early, keep the original due date
        // If maintenance is done late, add the interval to the current date
        nextDueDate = (maintenanceDate < task.nextDueDate)
          ? task.nextDueDate
          : new Date(maintenanceDate.setDate(maintenanceDate.getDate() + task.intervalDays));
      }
    }
    
    // Create a maintenance record
    const newRecord = await db.insert(maintenanceRecords).values({
      id: randomUUID(),
      motorcycleId: task.motorcycleId,
      taskId: task.id,
      date: maintenanceDate,
      mileage: maintenanceMileage, 
      cost: body.cost || null,
      notes: body.notes || `Completed ${task.name}`,
      receiptUrl: body.receiptUrl || null,
      
      // Enhanced fields for interval tracking
      isScheduled: true,
      resetsInterval: resetSchedule,
      nextDueOdometer: nextDueOdometer,
      nextDueDate: nextDueDate,
      
      createdAt: new Date(),
    }).returning();

    // Update the task with new base and next due values
    await db.update(maintenanceTasks)
      .set({
        baseOdometer: maintenanceMileage,
        baseDate: maintenanceDate,
        nextDueOdometer: nextDueOdometer,
        nextDueDate: nextDueDate
      })
      .where(eq(maintenanceTasks.id, task.id));

    // If the mileage is provided and greater than the current motorcycle mileage,
    // update the motorcycle's current mileage
    if (maintenanceMileage && (motorcycle.currentMileage === null || maintenanceMileage > motorcycle.currentMileage)) {
      await db.update(motorcycles)
        .set({
          currentMileage: maintenanceMileage,
          updatedAt: new Date()
        })
        .where(eq(motorcycles.id, task.motorcycleId));
    }

    return NextResponse.json({
      message: "Maintenance task completed successfully",
      record: newRecord[0],
      nextDueOdometer: nextDueOdometer,
      nextDueDate: nextDueDate
    });
  } catch (error) {
    console.error("Error completing maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to complete maintenance task" },
      { status: 500 }
    );
  }
}