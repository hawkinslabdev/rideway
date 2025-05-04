// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
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

    // Get upcoming maintenance tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingTasks = await db
      .select({
        id: maintenanceTasks.id,
        motorcycle: motorcycles.name,
        task: maintenanceTasks.name,
        description: maintenanceTasks.description,
        priority: maintenanceTasks.priority,
        intervalMiles: maintenanceTasks.intervalMiles,
        intervalDays: maintenanceTasks.intervalDays,
        motorcycleId: motorcycles.id,
        currentMileage: motorcycles.currentMileage,
      })
      .from(maintenanceTasks)
      .innerJoin(motorcycles, eq(maintenanceTasks.motorcycleId, motorcycles.id))
      .where(eq(motorcycles.userId, session.user.id));

    // Calculate due dates for maintenance tasks
    const tasksWithDueDates = await Promise.all(
      upcomingTasks.map(async (task) => {
        // Get the last maintenance record for this task
        const lastRecord = await db.query.maintenanceRecords.findFirst({
          where: and(
            eq(maintenanceRecords.taskId, task.id),
            eq(maintenanceRecords.motorcycleId, task.motorcycleId)
          ),
          orderBy: (records, { desc }) => [desc(records.date)],
        });

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
          if (task.intervalMiles && task.currentMileage) {
            dueMileage = task.currentMileage + task.intervalMiles;
          }
        }

        // Determine if the task is due
        const isDue = (dueDate && dueDate <= today) || 
                     (dueMileage && task.currentMileage && dueMileage <= task.currentMileage);

        return {
          ...task,
          dueDate,
          dueMileage,
          isDue,
        };
      })
    );

    // Filter and sort tasks
    const upcomingMaintenanceTasks = tasksWithDueDates
      .filter(task => task.dueDate || task.dueMileage)
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      })
      .slice(0, 5); // Get top 5 upcoming tasks

    const overdueCount = tasksWithDueDates.filter(task => task.isDue).length;

    return NextResponse.json({
      motorcycles: userMotorcycles,
      upcomingMaintenance: upcomingMaintenanceTasks,
      overdueCount,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}