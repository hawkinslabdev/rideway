// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // If no session and no user, return empty data
    if (!session?.user?.id) {
      return NextResponse.json({
        motorcycles: [],
        upcomingMaintenance: [],
        overdueCount: 0
      });
    }

    // Get user's motorcycles
    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, session.user.id),
      orderBy: (motorcycles, { desc }) => [desc(motorcycles.createdAt)],
    });

    if (userMotorcycles.length === 0) {
      return NextResponse.json({
        motorcycles: [],
        upcomingMaintenance: [],
        overdueCount: 0
      });
    }

    // Get motorcycle IDs for querying related data
    const motorcycleIds = userMotorcycles.map(m => m.id);

    // Get all maintenance tasks for these motorcycles
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
    const upcomingTasks = [];
    let overdueCount = 0;

    for (const task of tasks) {
      // Skip archived tasks
      if (task.archived) continue;
      
      // Find the motorcycle this task belongs to
      const motorcycle = userMotorcycles.find(m => m.id === task.motorcycleId);
      
      if (!motorcycle) continue; // Skip if motorcycle not found

      // FIXED: Use the task's stored nextDueDate and nextDueOdometer directly
      // This ensures consistency with the maintenance API
      const isDueByDate = task.nextDueDate && task.nextDueDate <= today;
      const isDueByMileage = task.nextDueOdometer && motorcycle.currentMileage && 
                            task.nextDueOdometer <= motorcycle.currentMileage;
      const isDue = isDueByDate || isDueByMileage;

      // Increment overdue count if task is due
      if (isDue) {
        overdueCount++;
      }

      // Only include tasks that have a due date or mileage
      if (task.nextDueDate || task.nextDueOdometer) {
        // Set priority based on due status
        let priority = task.priority || "medium";
        if (isDue) {
          priority = "high";
        }

        upcomingTasks.push({
          id: task.id,
          motorcycle: motorcycle.name,
          motorcycleId: motorcycle.id,
          task: task.name,
          description: task.description,
          dueDate: task.nextDueDate?.toISOString() || null,
          dueMileage: task.nextDueOdometer,
          priority,
          isDue,
          currentMileage: motorcycle.currentMileage
        });
      }
    }

    // Sort upcoming tasks by due date (null values last)
    const sortedTasks = upcomingTasks.sort((a, b) => {
      // First, sort by due status
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      
      // If both have due dates, sort by date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      // If only one has a due date, prioritize the one with a date
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      // If neither has a due date but both have due mileage, sort by distance from current mileage
      if (a.dueMileage && b.dueMileage && a.currentMileage && b.currentMileage) {
        const aDiff = a.dueMileage - a.currentMileage;
        const bDiff = b.dueMileage - b.currentMileage;
        return aDiff - bDiff;
      }
      
      // Default sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    return NextResponse.json({
      motorcycles: userMotorcycles,
      upcomingMaintenance: sortedTasks.slice(0, 5), // Get top 5 upcoming tasks
      overdueCount
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}