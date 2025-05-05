// app/api/maintenance/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
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

    // Get all maintenance tasks for all user's motorcycles
    const motorcycleIds = userMotorcycles.map(m => m.id);
    
    // Use inArray instead of sql template literal to avoid the reference error
    const tasks = await db.query.maintenanceTasks.findMany({
      where: inArray(maintenanceTasks.motorcycleId, motorcycleIds),
    });

    // Get all maintenance records to determine when tasks were last completed
    const records = await db.query.maintenanceRecords.findMany({
      where: inArray(maintenanceRecords.motorcycleId, motorcycleIds),
    });

    // Calculate upcoming maintenance based on tasks and records
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maintenanceTasksList = await Promise.all(
      tasks.map(async (task) => {
        // Find the motorcycle this task belongs to
        const motorcycle = userMotorcycles.find(m => m.id === task.motorcycleId);
        
        if (!motorcycle) {
          return null; // Skip if motorcycle not found (shouldn't happen)
        }

        // Get the most recent maintenance record for this task
        const lastRecord = records
          .filter(r => r.taskId === task.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        let dueDate: Date | null = null;
        let dueMileage: number | null = null;

        if (lastRecord) {
          // Calculate next due date based on interval
          if (task.intervalDays) {
            dueDate = new Date(lastRecord.date);
            dueDate.setDate(dueDate.getDate() + task.intervalDays);
          }
          if (task.intervalMiles && lastRecord.mileage) {
            dueMileage = lastRecord.mileage + task.intervalMiles;
          }
        } else {
          // If no previous record, calculate from purchase date or current date
          if (task.intervalDays) {
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + task.intervalDays);
          }
          if (task.intervalMiles && motorcycle.currentMileage) {
            dueMileage = motorcycle.currentMileage + task.intervalMiles;
          }
        }

        // Determine if the task is due
        const isDue = (dueDate && dueDate <= today) || 
                     (dueMileage && motorcycle.currentMileage && dueMileage <= motorcycle.currentMileage);

        // Determine priority based on due status
        let priority = task.priority || "medium";
        if (isDue) {
          priority = "high";
        }

        return {
          id: task.id,
          motorcycle: motorcycle.name,
          motorcycleId: motorcycle.id,
          task: task.name,
          description: task.description,
          dueDate: dueDate?.toISOString() || null,
          dueMileage,
          priority,
          isDue,
          currentMileage: motorcycle.currentMileage,
        };
      })
    );

    // Filter out any null tasks
    const validTasks = maintenanceTasksList.filter(t => t !== null);

    return NextResponse.json({ tasks: validTasks });
  } catch (error) {
    console.error("Maintenance API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance tasks" },
      { status: 500 }
    );
  }
}