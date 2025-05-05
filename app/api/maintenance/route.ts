// app/api/maintenance/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
    
    // Get all maintenance tasks for all user's motorcycles
    const tasks = await db.query.maintenanceTasks.findMany({
      where: inArray(maintenanceTasks.motorcycleId, motorcycleIds),
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
        
        priority,
        isDue,
        isRecurring: task.isRecurring
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
      overdueCount: validTasks.filter(t => t.isDue).length
    });
  } catch (error) {
    console.error("Maintenance API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance tasks" },
      { status: 500 }
    );
  }
}