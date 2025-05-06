// app/api/maintenance/task/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { maintenanceRecords, maintenanceTasks, motorcycles } from "@/app/lib/db/schema";
import { eq, and, inArray, SQL, desc } from "drizzle-orm";
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
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.motorcycleId || !body.name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, body.motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });
    
    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found or not owned by user" },
        { status: 404 }
      );
    }
    
    // Validate at least one interval is provided
    if (body.intervalMiles === null && body.intervalDays === null) {
      return NextResponse.json(
        { error: "Either mileage interval or time interval must be provided" },
        { status: 400 }
      );
    }
    
    // Calculate the next due values based on current motorcycle data
    const intervalBase = body.intervalBase === 'zero' ? 'zero' : 'current';
    const currentDate = new Date();
    const currentOdometer = motorcycle.currentMileage || 0;
    
    // Determine next due mileage
    let nextDueOdometer = null;
    
    // If explicit nextDueMileage is provided, use that
    if (body.nextDueMileage) {
      nextDueOdometer = body.nextDueMileage;
      
      // Validate that the next due mileage is greater than current mileage
      if (nextDueOdometer <= currentOdometer) {
        return NextResponse.json(
          { error: "Next due mileage must be greater than current motorcycle mileage" },
          { status: 400 }
        );
      }
    } 
    // Otherwise calculate from interval
    else if (body.intervalMiles) {
      // Calculate differently based on interval base
      if (intervalBase === 'zero') {
        // For zero-based intervals, we calculate how many full intervals 
        // have passed and add one more full interval
        const intervalsPassed = Math.floor(currentOdometer / body.intervalMiles);
        nextDueOdometer = (intervalsPassed + 1) * body.intervalMiles;
      } else {
        // For current-based intervals, just add the interval to current mileage
        nextDueOdometer = currentOdometer + body.intervalMiles;
      }
    }
    
    // Calculate next due date
    let nextDueDate = null;
    if (body.intervalDays) {
      nextDueDate = new Date(currentDate);
      nextDueDate.setDate(nextDueDate.getDate() + body.intervalDays);
    }
    
    // Create maintenance task with enhanced tracking
    const newTask = await db.insert(maintenanceTasks).values({
      id: randomUUID(),
      motorcycleId: body.motorcycleId,
      name: body.name,
      description: body.description || null,
      intervalMiles: body.intervalMiles || null,
      intervalDays: body.intervalDays || null,
      intervalBase: intervalBase, // Add the new field
      
      // New fields for our hybrid approach
      baseOdometer: currentOdometer,
      nextDueOdometer: nextDueOdometer,
      baseDate: currentDate,
      nextDueDate: nextDueDate,
      
      priority: body.priority || "medium",
      isRecurring: body.isRecurring !== undefined ? body.isRecurring : true,
      createdAt: new Date(),
    }).returning();
    
    return NextResponse.json(newTask[0], { status: 201 });
  } catch (error) {
    console.error("Error creating maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance task" },
      { status: 500 }
    );
  }
}

// Get a specific maintenance task
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get URL parameters
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get('includeArchived') === 'true';

    // Get all user's motorcycles
    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, session.user.id),
    });

    // If no motorcycles, return empty tasks
    if (userMotorcycles.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    // Get all motorcycle IDs
    const motorcycleIds = userMotorcycles.map(m => m.id);
    
    // Create the base query condition
    let tasksWhere = inArray(maintenanceTasks.motorcycleId, motorcycleIds);

    // In case motorcycleIds is empty, provide a fallback condition
    if (motorcycleIds.length === 0) {
      // This will intentionally match no records, but provide a valid SQL condition
      tasksWhere = eq(maintenanceTasks.id, 'no-match-condition');
    }
    // Get all maintenance tasks for all user's motorcycles
    const tasks = await db.query.maintenanceTasks.findMany({
      where: tasksWhere,
    });

    // Get all maintenance records for these motorcycles
    const records = await db.query.maintenanceRecords.findMany({
      where: inArray(maintenanceRecords.motorcycleId, motorcycleIds),
      orderBy: [desc(maintenanceRecords.date), desc(maintenanceRecords.createdAt)],
    });

    // Current date for due date calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process maintenance tasks to include relevant information
    const maintenanceTasksList = tasks.map(task => {
      // Find the motorcycle this task belongs to
      const motorcycle = userMotorcycles.find(m => m.id === task.motorcycleId);
      
      if (!motorcycle) {
        return null; // Skip if motorcycle not found
      }

      // Get all maintenance records for this task, sorted by most recent first
      const taskRecords = records.filter(r => r.taskId === task.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Get the most recent maintenance record
      const lastRecord = taskRecords.length > 0 ? taskRecords[0] : null;
      
      // Determine if the task is due based on the next due values
      const isDueByDate = task.nextDueDate && task.nextDueDate <= today;
      const isDueByMileage = task.nextDueOdometer && motorcycle.currentMileage && 
                              task.nextDueOdometer <= motorcycle.currentMileage;
      const isDue = isDueByDate || isDueByMileage;

      // Calculate remaining values
      let remainingMiles = null;
      if (task.nextDueOdometer && motorcycle.currentMileage) {
        remainingMiles = task.nextDueOdometer - motorcycle.currentMileage;
        // If negative, the maintenance is overdue
        if (remainingMiles < 0) {
          remainingMiles = 0;
        }
      }
      
      // Calculate completion percentage based on mileage
      let completionPercentage = null;
      if (task.intervalMiles && remainingMiles !== null) {
        completionPercentage = 100 - (remainingMiles / task.intervalMiles * 100);
        // Cap at 100%
        if (completionPercentage > 100) {
          completionPercentage = 100;
        }
      }

      // Determine priority based on due status and completion percentage
      let priority = task.priority || "medium";
      if (isDue) {
        priority = "high";
      } else if (completionPercentage !== null) {
        if (completionPercentage >= 90) {
          priority = "high";
        } else if (completionPercentage >= 75) {
          priority = "medium";
        }
      }

      return {
        id: task.id,
        motorcycle: motorcycle.name,
        motorcycleId: motorcycle.id,
        task: task.name,
        description: task.description,
        
        // Interval information
        intervalMiles: task.intervalMiles,
        intervalDays: task.intervalDays,
        
        // Last maintenance information
        lastCompletedDate: lastRecord?.date || null,
        lastCompletedMileage: lastRecord?.mileage || null,
        
        // Next due information
        baseOdometer: task.baseOdometer,
        baseDate: task.baseDate,
        dueDate: task.nextDueDate?.toISOString() || null,
        dueMileage: task.nextDueOdometer,
        
        // Current status
        currentMileage: motorcycle.currentMileage,
        remainingMiles: remainingMiles,
        completionPercentage: completionPercentage,
        
        // Task metadata
        priority,
        isDue,
        isRecurring: task.isRecurring,
        archived: task.archived
      };
    });

    // Filter out any null tasks
    const validTasks = maintenanceTasksList.filter(t => t !== null);

    // Sort tasks by priority, then by remaining miles/days
    validTasks.sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - 
                            priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // If same priority, sort by remaining miles (if both have dueMileage)
      if (a.remainingMiles !== null && b.remainingMiles !== null) {
        return a.remainingMiles - b.remainingMiles;
      }
      
      // If either doesn't have remainingMiles, sort by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      // Fallback to sort by task name
      return a.task.localeCompare(b.task);
    });

    return NextResponse.json({ 
      tasks: validTasks,
      // Also include count of overdue tasks for quick dashboard indicators
      overdueCount: validTasks.filter(t => t.isDue).length,
      // Include count of archived tasks
      archivedCount: tasks.filter(t => t.archived).length
    });
  } catch (error) {
    console.error("Maintenance API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance tasks" },
      { status: 500 }
    );
  }
}