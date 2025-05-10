// app/api/user/import/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: "Only JSON files are supported" },
        { status: 400 }
      );
    }

    // Read the file content
    const fileContent = await file.text();
    let importData;
    
    try {
      importData = JSON.parse(fileContent);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON file" },
        { status: 400 }
      );
    }

    // Validate import data structure
    if (!importData.motorcycles || !Array.isArray(importData.motorcycles)) {
      return NextResponse.json(
        { error: "Invalid import data format" },
        { status: 400 }
      );
    }

    // Begin import process
    const importResults = {
      motorcyclesImported: 0,
      tasksImported: 0,
      recordsImported: 0,
      errors: [] as string[],
    };

    // Start a transaction
    await db.transaction(async (tx) => {
      // Import motorcycles
      for (const motorcycleData of importData.motorcycles) {
        // Generate a new ID for the motorcycle
        const newMotorcycleId = crypto.randomUUID();
        
        // Insert the motorcycle
        await tx.insert(motorcycles).values({
          id: newMotorcycleId,
          userId: session.user.id,
          name: motorcycleData.name,
          make: motorcycleData.make,
          model: motorcycleData.model,
          year: motorcycleData.year,
          vin: motorcycleData.vin,
          color: motorcycleData.color,
          purchaseDate: motorcycleData.purchaseDate ? new Date(motorcycleData.purchaseDate) : null,
          currentMileage: motorcycleData.currentMileage,
          imageUrl: null, // Don't import images directly
          notes: motorcycleData.notes,
          isOwned: motorcycleData.isOwned !== undefined ? motorcycleData.isOwned : true,
          isDefault: false, // Don't set as default when importing
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        importResults.motorcyclesImported++;
        
        // Create a map to track old task IDs to new ones
        const taskIdMap = new Map<string, string>();
        
        // Import tasks for this motorcycle
        if (motorcycleData.maintenanceTasks && Array.isArray(motorcycleData.maintenanceTasks)) {
          for (const taskData of motorcycleData.maintenanceTasks) {
            // Generate a new ID for the task
            const newTaskId = crypto.randomUUID();
            taskIdMap.set(taskData.id, newTaskId);
            
            // Insert the task
            await tx.insert(maintenanceTasks).values({
              id: newTaskId,
              motorcycleId: newMotorcycleId,
              name: taskData.name,
              description: taskData.description,
              intervalMiles: taskData.intervalMiles,
              intervalDays: taskData.intervalDays,
              intervalBase: taskData.intervalBase || "current",
              priority: taskData.priority || 'medium',
              isRecurring: taskData.isRecurring !== undefined ? taskData.isRecurring : true,
              archived: taskData.archived !== undefined ? taskData.archived : false,
              baseOdometer: taskData.baseOdometer,
              baseDate: taskData.baseDate ? new Date(taskData.baseDate) : null,
              nextDueOdometer: taskData.nextDueOdometer,
              nextDueDate: taskData.nextDueDate ? new Date(taskData.nextDueDate) : null,
              createdAt: new Date(),
            });
            
            importResults.tasksImported++;
          }
        }
        
        // Import records for this motorcycle
        if (motorcycleData.maintenanceRecords && Array.isArray(motorcycleData.maintenanceRecords)) {
          for (const recordData of motorcycleData.maintenanceRecords) {
            // Get the new task ID if it exists
            const newTaskId = recordData.taskId ? taskIdMap.get(recordData.taskId) : null;
            
            // Insert the record
            await tx.insert(maintenanceRecords).values({
              id: crypto.randomUUID(),
              motorcycleId: newMotorcycleId,
              taskId: newTaskId || null,
              date: recordData.date ? new Date(recordData.date) : new Date(),
              mileage: recordData.mileage,
              cost: recordData.cost,
              notes: recordData.notes,
              receiptUrl: null, // Don't import receipt images directly
              isScheduled: recordData.isScheduled !== undefined ? recordData.isScheduled : true,
              resetsInterval: recordData.resetsInterval !== undefined ? recordData.resetsInterval : true,
              nextDueOdometer: recordData.nextDueOdometer,
              nextDueDate: recordData.nextDueDate ? new Date(recordData.nextDueDate) : null,
              createdAt: new Date(),
            });
            
            importResults.recordsImported++;
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Data imported successfully",
      results: importResults,
    });
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json(
      { error: "Failed to import data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}