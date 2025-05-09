// app/api/motorcycles/mileage-log/route.ts

import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, mileageLogs, maintenanceTasks } from "@/app/lib/db/schema";
import { triggerEvent } from "@/app/lib/services/integrationService";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { randomUUID } from "crypto";
import { canNotifyForTask } from "@/app/lib/utils/notificationTracker";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { motorcycleId, previousMileage, newMileage, notes } = await request.json();
    
    if (!motorcycleId || newMileage === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found" },
        { status: 404 }
      );
    }
    
    // Check if the mileage is actually different from current mileage
    // This prevents duplicate entries when this endpoint is called unnecessarily
    if (motorcycle.currentMileage === newMileage) {
      return NextResponse.json(
        { message: "Mileage unchanged, no log entry created" },
        { status: 200 }
      );
    }

    // Create a mileage log entry
    const logEntry = await db.insert(mileageLogs).values({
      id: randomUUID(),
      motorcycleId: motorcycleId,
      previousMileage: previousMileage !== undefined ? previousMileage : motorcycle.currentMileage,
      newMileage: newMileage,
      date: new Date(),
      notes: notes || `Updated mileage to ${newMileage}`,
      createdAt: new Date(),
    }).returning();

    // Also update the motorcycle's current mileage
    await db.update(motorcycles)
      .set({ 
        currentMileage: newMileage,
        updatedAt: new Date()
      })
      .where(eq(motorcycles.id, motorcycleId));

    // Add debug logging 
    console.log(`Mileage updated for motorcycle ${motorcycleId}: ${motorcycle.currentMileage || 'None'} -> ${newMileage}`);
    console.log(`Triggering mileage_updated event for user ${session.user.id}`);

    // Trigger an event for the mileage update
    // DEBUG: Add more detailed logging for trigger event
    try {
      const eventResult = await triggerEvent(session.user.id, "mileage_updated", {
        motorcycle: {
          id: motorcycle.id,
          name: motorcycle.name,
          make: motorcycle.make,
          model: motorcycle.model,
          year: motorcycle.year
        },
        previousMileage: previousMileage !== undefined ? previousMileage : motorcycle.currentMileage,
        newMileage: newMileage,
        units: "miles" // Add units for clarity in notifications
      });
      
      console.log("Mileage update event result:", eventResult);
    } catch (err) {
      console.error("Failed to trigger mileage_updated event:", err);
    }
    
    // Get all tasks for this motorcycle
    const tasks = await db.query.maintenanceTasks.findMany({
      where: and(
        eq(maintenanceTasks.motorcycleId, motorcycleId),
        eq(maintenanceTasks.archived, false)
      ),
    });
    
    // Find tasks that became due with this mileage update
    const newlyDueTasks = tasks.filter(task => {
      // Check if the task has a mileage threshold and it's now due
      const isDue = task.nextDueOdometer !== null && 
             task.nextDueOdometer <= newMileage &&
             (previousMileage === null || previousMileage < task.nextDueOdometer);
             
      if (isDue) {
        console.log(`Task ${task.id} (${task.name}) is newly due: ${task.nextDueOdometer} <= ${newMileage}`);
      }
      
      return isDue;
    });
    
    // Debug logging
    console.log(`Found ${newlyDueTasks.length} newly due tasks for motorcycle ${motorcycleId}`);
    
    // Trigger maintenance_due event for each task that just became due
    let notificationsTriggered = 0;
    for (const task of newlyDueTasks) {
      // Check if we've recently notified for this task
      if (!canNotifyForTask(task.id)) {
        console.log(`Skipping duplicate notification for task ${task.id} (${task.name})`);
        continue;
      }
      
      // Make sure we're triggering the event with the correct parameters
      console.log(`Triggering maintenance_due event for task: ${task.name}`);
      
      try {
        const eventResult = await triggerEvent(session.user.id, "maintenance_due", {
          motorcycle: {
            id: motorcycle.id,
            name: motorcycle.name,
            make: motorcycle.make,
            model: motorcycle.model,
            year: motorcycle.year
          },
          task: {
            id: task.id,
            name: task.name
          }
        });
        
        console.log(`Maintenance due event result for task ${task.id}:`, eventResult);
        
        notificationsTriggered++;
      } catch (err) {
        console.error(`Failed to trigger maintenance_due event for task ${task.id}:`, err);
      }
    }

    if (notificationsTriggered > 0) {
      console.log(`Triggered ${notificationsTriggered} maintenance notifications for motorcycle ${motorcycleId}`);
    }

    return NextResponse.json({
      ...logEntry[0],
      notificationsTriggered,
      eventTriggered: true
    }, { status: 201 });
  } catch (error) {
    console.error("Error logging mileage update:", error);
    return NextResponse.json(
      { error: "Failed to log mileage update" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const motorcycleId = url.searchParams.get('motorcycleId');
    
    if (!motorcycleId) {
      return NextResponse.json(
        { error: "Motorcycle ID is required" },
        { status: 400 }
      );
    }

    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found" },
        { status: 404 }
      );
    }

    // Get mileage logs for the motorcycle
    const logs = await db.query.mileageLogs.findMany({
      where: eq(mileageLogs.motorcycleId, motorcycleId),
      orderBy: (logs, { desc }) => [desc(logs.date)],
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching mileage logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch mileage logs" },
      { status: 500 }
    );
  }
}