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

    // Calculate upcoming maintenance based on tasks and records
    const maintenanceTasksList = tasks.map(task => {
      // Find the motorcycle this task belongs to
      const motorcycle = userMotorcycles.find(m => m.id === task.motorcycleId);
      
      if (!motorcycle) {
        return null; // Skip if motorcycle not found (shouldn't happen)
      }

      // Get all maintenance records for this task, sorted by most recent first
      const taskRecords = records.filter(r => r.taskId === task.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Get the most recent maintenance record
      const lastRecord = taskRecords.length > 0 ? taskRecords[0] : null;
      
      let dueDate: Date | null = null;
      let dueMileage: number | null = null;

      // Calculate next due date/mileage based on intervals and last record
      if (lastRecord) {
        // If task has a day interval, calculate the next due date
        if (task.intervalDays) {
          dueDate = new Date(lastRecord.date);
          dueDate.setDate(dueDate.getDate() + task.intervalDays);
        }
        
        // If task has a mileage interval and last record has mileage, calculate next due mileage
        if (task.intervalMiles && lastRecord.mileage) {
          dueMileage = lastRecord.mileage + task.intervalMiles;
        }
      } else {
        // First time maintenance - calculate from current values
        if (task.intervalDays) {
          // For first maintenance with day interval, use motorcycle purchase date if available, otherwise use today
          const startDate = motorcycle.purchaseDate || new Date();
          dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + task.intervalDays);
        }
        
        // For first maintenance with mileage interval, use current mileage as baseline
        if (task.intervalMiles && motorcycle.currentMileage) {
          dueMileage = motorcycle.currentMileage + task.intervalMiles;
        }
      }

      // Determine if the task is due based on either date or mileage
      const isDueByDate = dueDate && dueDate <= today;
      const isDueByMileage = dueMileage && motorcycle.currentMileage && dueMileage <= motorcycle.currentMileage;
      const isDue = isDueByDate || isDueByMileage;

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
        intervalMiles: task.intervalMiles,
        intervalDays: task.intervalDays,
        isRecurring: task.isRecurring,
        lastCompletedDate: lastRecord?.date || null,
        lastCompletedMileage: lastRecord?.mileage || null
      };
    });

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