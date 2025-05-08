// app/api/maintenance/[id]/complete/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { maintenanceTasks, maintenanceRecords, motorcycles } from "@/app/lib/db/schema";
import { triggerEvent } from "@/app/lib/services/integrationService";
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
      // Reset approach: calculate from current values based on intervalBase
      if (task.intervalMiles) {
        if (task.intervalBase === 'zero') {
          // For zero-based intervals, calculate how many intervals have passed
          const intervalsPassed = Math.floor(maintenanceMileage / task.intervalMiles);
          nextDueOdometer = (intervalsPassed + 1) * task.intervalMiles;
        } else {
          // For current-based intervals, just add to current
          nextDueOdometer = maintenanceMileage + task.intervalMiles;
        }
      }
      
      if (task.intervalDays) {
        nextDueDate = new Date(maintenanceDate);
        nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
      }
    } else {
      // Maintain original schedule approach
      if (task.nextDueOdometer && task.intervalMiles) {
        // If maintenance is done early, keep the original due odometer
        // If maintenance is done late, calculate the next interval
        if (maintenanceMileage < task.nextDueOdometer) {
          nextDueOdometer = task.nextDueOdometer;
        } else {
          // For late maintenance, recalculate based on interval base
          if (task.intervalBase === 'zero') {
            const intervalsPassed = Math.floor(maintenanceMileage / task.intervalMiles);
            nextDueOdometer = (intervalsPassed + 1) * task.intervalMiles;
          } else {
            nextDueOdometer = maintenanceMileage + task.intervalMiles;
          }
        }
      }
      
      // For date intervals, similar logic can be applied
      if (task.nextDueDate && task.intervalDays) {
        const now = new Date();
        if (now < task.nextDueDate) {
          // If early, keep original date
          nextDueDate = task.nextDueDate;
        } else {
          // If late, add interval to current date
          nextDueDate = new Date();
          nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
        }
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

    // If the mileage is provided and greater than the current motorcycle mileage, update the motorcycle's current mileage
    if (maintenanceMileage && (motorcycle.currentMileage === null || maintenanceMileage > motorcycle.currentMileage)) {
      await db.update(motorcycles)
        .set({
          currentMileage: maintenanceMileage,
          updatedAt: new Date()
        })
        .where(eq(motorcycles.id, task.motorcycleId));
    }

    // Trigger an event for the integration
    await triggerEvent(session.user.id, "maintenance_completed", {
      task: {
        id: task.id,
        name: task.name
      },
      motorcycle: {
        id: motorcycle.id,
        name: motorcycle.name,
        make: motorcycle.make,
        model: motorcycle.model,
        year: motorcycle.year
      },
      record: {
        id: newRecord[0].id,
        date: maintenanceDate,
        mileage: maintenanceMileage,
        cost: body.cost || null,
        notes: body.notes || null
      }
    });

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