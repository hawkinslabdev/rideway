// app/api/user/import/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
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

    const data = await request.json();

    // Validate the import data structure
    if (!data.motorcycles || !Array.isArray(data.motorcycles)) {
      return NextResponse.json(
        { error: "Invalid import data format" },
        { status: 400 }
      );
    }

    // Keep track of old ID to new ID mappings
    const motorcycleIdMap = new Map<string, string>();
    const taskIdMap = new Map<string, string>();

    // Import motorcycles
    for (const motorcycle of data.motorcycles) {
      const newMotorcycleId = randomUUID();
      motorcycleIdMap.set(motorcycle.id, newMotorcycleId);

      await db.insert(motorcycles).values({
        id: newMotorcycleId,
        userId: session.user.id,
        name: motorcycle.name,
        make: motorcycle.make,
        model: motorcycle.model,
        year: motorcycle.year,
        vin: motorcycle.vin,
        color: motorcycle.color,
        purchaseDate: motorcycle.purchaseDate ? new Date(motorcycle.purchaseDate) : null,
        currentMileage: motorcycle.currentMileage,
        imageUrl: motorcycle.imageUrl,
        notes: motorcycle.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Import maintenance tasks for this motorcycle
      if (motorcycle.maintenanceTasks && Array.isArray(motorcycle.maintenanceTasks)) {
        for (const task of motorcycle.maintenanceTasks) {
          const newTaskId = randomUUID();
          taskIdMap.set(task.id, newTaskId);

          await db.insert(maintenanceTasks).values({
            id: newTaskId,
            motorcycleId: newMotorcycleId,
            name: task.name,
            description: task.description,
            intervalMiles: task.intervalMiles,
            intervalDays: task.intervalDays,
            priority: task.priority,
            isRecurring: task.isRecurring,
            createdAt: new Date(),
          });
        }
      }

      // Import maintenance records for this motorcycle
      if (motorcycle.maintenanceRecords && Array.isArray(motorcycle.maintenanceRecords)) {
        for (const record of motorcycle.maintenanceRecords) {
          // Map the old task ID to the new task ID if it exists
          const newTaskId = record.taskId ? taskIdMap.get(record.taskId) : null;

          await db.insert(maintenanceRecords).values({
            id: randomUUID(),
            motorcycleId: newMotorcycleId,
            taskId: newTaskId,
            date: new Date(record.date),
            mileage: record.mileage,
            cost: record.cost,
            notes: record.notes,
            receiptUrl: record.receiptUrl,
            createdAt: new Date(),
          });
        }
      }
    }

    return NextResponse.json({ 
      message: "Data imported successfully",
      importedMotorcycles: data.motorcycles.length
    });
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    );
  }
}