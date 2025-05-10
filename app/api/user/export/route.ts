// app/api/user/export/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

// Define the types to match the database relations
type MaintenanceTask = {
  id: string;
  name: string;
  description: string | null;
  intervalMiles: number | null;
  intervalDays: number | null;
  priority: string;
  isRecurring: boolean;
  archived: boolean;
  baseOdometer: number | null;
  baseDate: Date | null;
  nextDueOdometer: number | null;
  nextDueDate: Date | null;
  createdAt: Date;
}

type MaintenanceRecord = {
  id: string;
  taskId: string | null;
  date: Date;
  mileage: number | null;
  cost: number | null;
  notes: string | null;
  receiptUrl: string | null;
  isScheduled: boolean;
  resetsInterval: boolean;
  nextDueOdometer: number | null;
  nextDueDate: Date | null;
  createdAt: Date;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all user's motorcycles
    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, session.user.id),
    });

    // Fetch maintenance tasks and records for each motorcycle
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      user: {
        name: session.user.name,
        email: session.user.email,
      },
      motorcycles: await Promise.all(userMotorcycles.map(async motorcycle => {
        // Fetch tasks for this motorcycle
        const tasks = await db.query.maintenanceTasks.findMany({
          where: eq(maintenanceTasks.motorcycleId, motorcycle.id)
        });

        // Fetch records for this motorcycle
        const records = await db.query.maintenanceRecords.findMany({
          where: eq(maintenanceRecords.motorcycleId, motorcycle.id)
        });

        return {
          id: motorcycle.id,
          name: motorcycle.name,
          make: motorcycle.make,
          model: motorcycle.model,
          year: motorcycle.year,
          vin: motorcycle.vin,
          color: motorcycle.color,
          purchaseDate: motorcycle.purchaseDate,
          currentMileage: motorcycle.currentMileage,
          imageUrl: motorcycle.imageUrl,
          notes: motorcycle.notes,
          isOwned: motorcycle.isOwned !== undefined ? motorcycle.isOwned : true,
          isDefault: motorcycle.isDefault !== undefined ? motorcycle.isDefault : false,
          createdAt: motorcycle.createdAt,
          updatedAt: motorcycle.updatedAt,
          maintenanceTasks: tasks.map(task => ({
            id: task.id,
            name: task.name,
            description: task.description,
            intervalMiles: task.intervalMiles,
            intervalDays: task.intervalDays,
            intervalBase: task.intervalBase,
            priority: task.priority,
            isRecurring: task.isRecurring,
            archived: task.archived !== undefined ? task.archived : false,
            baseOdometer: task.baseOdometer,
            baseDate: task.baseDate,
            nextDueOdometer: task.nextDueOdometer,
            nextDueDate: task.nextDueDate,
            createdAt: task.createdAt,
          })),
          maintenanceRecords: records.map(record => ({
            id: record.id,
            taskId: record.taskId,
            date: record.date,
            mileage: record.mileage,
            cost: record.cost,
            notes: record.notes,
            receiptUrl: record.receiptUrl,
            isScheduled: record.isScheduled !== undefined ? record.isScheduled : true,
            resetsInterval: record.resetsInterval !== undefined ? record.resetsInterval : true,
            nextDueOdometer: record.nextDueOdometer,
            nextDueDate: record.nextDueDate,
            createdAt: record.createdAt,
          })),
        };
      })),
    };

    // Create the JSON file
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Return as downloadable file
    return new NextResponse(jsonData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="rideway-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}