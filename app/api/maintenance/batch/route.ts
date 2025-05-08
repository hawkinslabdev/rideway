// app/api/maintenance/batch/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { maintenanceTasks, motorcycles } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get request body which should be an array of tasks
    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request format. Expected an array of tasks." },
        { status: 400 }
      );
    }
    
    // Validate at least one task is provided
    if (body.length === 0) {
      return NextResponse.json(
        { error: "No tasks provided for import" },
        { status: 400 }
      );
    }
    
    // Validate and process all tasks
    const processedTasks = [];
    const errors = [];
    
    for (const task of body) {
      // Validate required fields
      if (!task.motorcycleId || !task.name) {
        errors.push(`Task "${task.name || "unnamed"}" is missing required fields`);
        continue;
      }
      
      // Verify motorcycle ownership and get its data
      const motorcycle = await db.query.motorcycles.findFirst({
        where: and(
          eq(motorcycles.id, task.motorcycleId),
          eq(motorcycles.userId, session.user.id)
        ),
      });
      
      if (!motorcycle) {
        errors.push(`Motorcycle not found or not owned by user for task "${task.name}"`);
        continue;
      }
      
      // Calculate the next due values based on current motorcycle data
      const currentDate = new Date();
      const currentOdometer = motorcycle.currentMileage || 0;
      
      // Determine next due mileage
      let nextDueOdometer = null;
      if (task.intervalMiles) {
        nextDueOdometer = currentOdometer + task.intervalMiles;
      }
      
      // Calculate next due date
      let nextDueDate = null;
      if (task.intervalDays) {
        nextDueDate = new Date(currentDate);
        nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
      }
      
      // Prepare task data for insertion
      processedTasks.push({
        id: randomUUID(),
        motorcycleId: task.motorcycleId,
        name: task.name,
        description: task.description || null,
        intervalMiles: task.intervalMiles || null,
        intervalDays: task.intervalDays || null,
        baseOdometer: currentOdometer,
        nextDueOdometer: nextDueOdometer,
        baseDate: currentDate,
        nextDueDate: nextDueDate,
        priority: task.priority || "medium",
        isRecurring: task.isRecurring !== undefined ? task.isRecurring : true,
        createdAt: new Date(),
      });
    }
    
    // If we don't have any valid tasks, return an error
    if (processedTasks.length === 0) {
      return NextResponse.json(
        { error: "No valid tasks to import", details: errors },
        { status: 400 }
      );
    }
    
    // Insert all valid tasks in a batch
    const insertedTasks = await db.insert(maintenanceTasks).values(processedTasks).returning();
    
    return NextResponse.json({
      message: `Successfully imported ${insertedTasks.length} maintenance tasks`,
      tasks: insertedTasks,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 201 });
  } catch (error) {
    console.error("Error importing maintenance tasks:", error);
    return NextResponse.json(
      { error: "Failed to import maintenance tasks" },
      { status: 500 }
    );
  }
}