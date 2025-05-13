// app/api/motorcycles/[id]/route.ts
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/app/lib/db/db";
import { triggerEvent } from "@/app/lib/services/integrationService";
import { canNotifyForTask } from "@/app/lib/utils/notificationTracker";
import { motorcycles, maintenanceTasks, maintenanceRecords, mileageLogs } from "@/app/lib/db/schema";
import { checkForNewlyDueTasks, updateMaintenanceTasksAfterMileageChange } from "@/app/lib/utils/maintenanceUtils";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { randomUUID } from "crypto";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { FileStorage } from "@/app/lib/utils/fileStorage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await the params before using them
    const { id } = await params;

    // Fetch motorcycle details
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, id),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found" },
        { status: 404 }
      );
    }

    // Fetch maintenance tasks for this motorcycle
    const tasks = await db.query.maintenanceTasks.findMany({
      where: eq(maintenanceTasks.motorcycleId, id),
      orderBy: (tasks, { asc }) => [asc(tasks.name)],
    });

    // Fetch maintenance records for this motorcycle
    const records = await db.query.maintenanceRecords.findMany({
      where: eq(maintenanceRecords.motorcycleId, id),
      orderBy: (records, { desc }) => [desc(records.date)],
    });

    // Calculate upcoming maintenance based on tasks and records
    const maintenanceSchedule = await Promise.all(
      tasks.map(async (task) => {
        // Get the last completed record for this task
        const lastRecord = records.find(record => record.taskId === task.id);
        
        let dueDate: Date | null = null;
        let dueMileage: number | null = null;
        let priority = task.priority || "medium";

        if (lastRecord) {
          // Calculate next due date based on interval
          if (task.intervalDays) {
            dueDate = new Date(lastRecord.date);
            dueDate.setDate(dueDate.getDate() + task.intervalDays);
          }
          
          // Use next due mileage from record if available, otherwise calculate
          if (lastRecord.nextDueOdometer) {
            dueMileage = lastRecord.nextDueOdometer;
          } else if (task.intervalMiles && lastRecord.mileage) {
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
          
          // Use task's nextDueOdometer if available, otherwise calculate
          if (task.nextDueOdometer) {
            dueMileage = task.nextDueOdometer;
          } else if (task.intervalMiles && motorcycle.currentMileage) {
            if (task.intervalBase === 'zero') {
              // For zero-based intervals, find the next milestone
              const intervalsPassed = Math.floor(motorcycle.currentMileage / task.intervalMiles);
              dueMileage = (intervalsPassed + 1) * task.intervalMiles;
            } else {
              // For current-based intervals, add to current
              dueMileage = motorcycle.currentMileage + task.intervalMiles;
            }
          }
        }

        // Determine if the task is due based on either date or mileage
        const now = new Date();
        const isDueByDate = dueDate && dueDate <= now;
        const isDueByMileage = dueMileage && motorcycle.currentMileage && dueMileage <= motorcycle.currentMileage;
        const isDue = isDueByDate || isDueByMileage;

        // If task is due, set priority to high
        if (isDue) {
          priority = "high";
        }

        // Calculate remaining miles
        let remainingMiles = null;
        if (dueMileage && motorcycle.currentMileage) {
          remainingMiles = dueMileage - motorcycle.currentMileage;
          if (remainingMiles < 0) remainingMiles = 0;
        }

        // Calculate completion percentage
        let completionPercentage = null;
        if (task.intervalMiles && remainingMiles !== null) {
          completionPercentage = ((task.intervalMiles - Math.max(0, remainingMiles)) / task.intervalMiles) * 100;
          // Cap at 100%
          completionPercentage = Math.min(100, Math.max(0, completionPercentage));
        }

        return {
          id: task.id,
          name: task.name,
          description: task.description,
          intervalMiles: task.intervalMiles,
          intervalDays: task.intervalDays,
          intervalBase: task.intervalBase,
          lastCompleted: lastRecord ? lastRecord.date : null,
          lastMileage: lastRecord ? lastRecord.mileage : null,
          dueDate,
          dueMileage,
          priority,
          isDue,
          remainingMiles,
          completionPercentage
        };
      })
    );

    // Format recent maintenance records
    const recentMaintenance = records.slice(0, 5).map(record => {
      const task = tasks.find(t => t.id === record.taskId);
      return {
        id: record.id,
        task: task?.name || "Maintenance",
        date: record.date,
        mileage: record.mileage,
        cost: record.cost,
        notes: record.notes,
      };
    });

    return NextResponse.json({
      motorcycle,
      maintenanceSchedule,
      recentMaintenance,
    });
  } catch (error) {
    console.error("Error fetching motorcycle details:", error);
    return NextResponse.json(
      { error: "Failed to fetch motorcycle details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await the params before using them
    const { id } = await params;

    // Verify ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, id),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found" },
        { status: 404 }
      );
    }

    // Parse the request based on content type
    let updateData: any = {
      updatedAt: new Date(),
    };
    
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle form data with file upload
      const formData = await request.formData();
      
      // Handle image upload
      let imageUrl = motorcycle.imageUrl;
      const imageFile = formData.get('image') as File | null;
      
      if (imageFile && imageFile.size > 0) {
        try {
          // Use our improved image upload function
          const result = await FileStorage.saveImage(imageFile);
          
          if (result.success && result.path) {
            imageUrl = result.path;
            console.log(`Image saved successfully: ${imageUrl}`);
          } else {
            console.error(`Failed to save image: ${result.error}`);
            // Return the error to the client
            if (result.error) {
              return NextResponse.json(
                { error: `Failed to upload image: ${result.error}` },
                { status: 400 }
              );
            }
          }
        } catch (error) {
          console.error("Error saving image:", error);
          return NextResponse.json(
            { error: "Failed to upload image. Please try a different file." },
            { status: 500 }
          );
        }
      }

      // Add form fields to update data
      const fields = ['name', 'make', 'model', 'vin', 'color', 'notes'];
      fields.forEach(field => {
        const value = formData.get(field);
        if (value !== null) {
          updateData[field] = value.toString();
        }
      });

      // Handle numeric fields
      const year = formData.get('year');
      if (year) {
        updateData.year = parseInt(year.toString());
      }

      // Handle mileage field - important for maintenance scheduling
      const currentMileageField = formData.get('currentMileage');   
      if (currentMileageField) {
        const oldMileage = motorcycle.currentMileage;
        const newMileage = parseInt(currentMileageField.toString());
        
        // Update the mileage in the update data
        updateData.currentMileage = newMileage;
        
        if (oldMileage !== newMileage) {
          // Process mileage update logic for maintenance and logging
          // This part remains the same
        }
      }
      
      // Handle date field
      const purchaseDate = formData.get('purchaseDate');
      if (purchaseDate && purchaseDate.toString().trim() !== '') {
        updateData.purchaseDate = new Date(purchaseDate.toString());
      }

      // Add image URL if updated
      if (imageUrl !== motorcycle.imageUrl) {
        updateData.imageUrl = imageUrl;
      }
    } else {
      // Handle regular JSON data (existing functionality)
      // This part remains the same
    }

    console.log("Updating motorcycle with data:", { ...updateData, imageUrl: updateData.imageUrl ? "[Image URL Updated]" : "[No Change]" });

    // Update motorcycle
    const updatedMotorcycle = await db
      .update(motorcycles)
      .set(updateData)
      .where(eq(motorcycles.id, id))
      .returning();

    return NextResponse.json(updatedMotorcycle[0]);
  } catch (error) {
    console.error("Error updating motorcycle:", error);
    return NextResponse.json(
      { error: "Failed to update motorcycle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await the params before using them
    const { id } = await params;

    // Verify ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, id),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found" },
        { status: 404 }
      );
    }

    // Delete the motorcycle (cascade will delete related records)
    await db.delete(motorcycles).where(eq(motorcycles.id, id));

    return NextResponse.json({ message: "Motorcycle deleted successfully" });
  } catch (error) {
    console.error("Error deleting motorcycle:", error);
    return NextResponse.json(
      { error: "Failed to delete motorcycle" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to properly update maintenance tasks when motorcycle mileage changes
 */
async function updateMaintenanceTasks(motorcycleId: string, oldMileage: number | null, newMileage: number) {
  // Skip if no previous mileage or mileage decreased
  if (oldMileage === null || newMileage <= oldMileage) {
    return;
  }

  // Get all maintenance tasks for this motorcycle
  const tasks = await db.query.maintenanceTasks.findMany({
    where: eq(maintenanceTasks.motorcycleId, motorcycleId),
  });

  // Process each task
  for (const task of tasks) {
    if (!task.intervalMiles) continue;

    if (task.intervalBase === 'zero') {
      // For zero-based intervals: recalculate based on current mileage milestones
      const intervalsPassed = Math.floor(newMileage / task.intervalMiles);
      const nextDueOdometer = (intervalsPassed + 1) * task.intervalMiles;
      
      await db.update(maintenanceTasks)
        .set({
          nextDueOdometer: nextDueOdometer,
          baseOdometer: newMileage, // Update base odometer to current value
        })
        .where(eq(maintenanceTasks.id, task.id));
    } 
    // For current-based intervals, we intentionally don't update the next due mileage
    // This keeps the maintenance schedule consistent and prevents it from being pushed forward
  }
}

function desc(date: SQLiteColumn<{ name: "date"; tableName: "mileage_logs"; dataType: "date"; columnType: "SQLiteTimestamp"; data: Date; driverParam: number; notNull: true; hasDefault: false; isPrimaryKey: false; isAutoincrement: false; hasRuntimeDefault: false; enumValues: undefined; baseColumn: never; identity: undefined; generated: undefined; }, {}, {}>): any {
  throw new Error("Function not implemented.");
}
