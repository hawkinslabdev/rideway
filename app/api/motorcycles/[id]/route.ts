// app/api/motorcycles/[id]/route.ts
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

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
          if (task.intervalMiles && lastRecord.mileage) {
            dueMileage = lastRecord.mileage + task.intervalMiles;
          }
        } else {
          // If no previous record, calculate from current date/mileage
          if (task.intervalDays) {
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + task.intervalDays);
          }
          if (task.intervalMiles && motorcycle.currentMileage) {
            dueMileage = motorcycle.currentMileage + task.intervalMiles;
          }
        }

        // Determine if the task is overdue
        const now = new Date();
        const isOverdue = (dueDate && dueDate < now) || 
                         (dueMileage && motorcycle.currentMileage && dueMileage <= motorcycle.currentMileage);

        if (isOverdue) {
          priority = "high";
        }

        return {
          id: task.id,
          name: task.name,
          description: task.description,
          intervalMiles: task.intervalMiles,
          intervalDays: task.intervalDays,
          lastCompleted: lastRecord ? lastRecord.date : null,
          lastMileage: lastRecord ? lastRecord.mileage : null,
          dueDate,
          dueMileage,
          priority,
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
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Create a unique filename
        const extension = imageFile.name.split('.').pop();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `${Date.now()}-${randomString}.${extension}`;
        const publicPath = join(process.cwd(), 'public', 'uploads');
        const filePath = join(publicPath, filename);
        
        // Ensure the uploads directory exists
        try {
          await mkdir(publicPath, { recursive: true });
        } catch (error) {
          // Directory might already exist
        }
        
        // Save the file
        await writeFile(filePath, buffer);
        imageUrl = `/uploads/${filename}`;
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

      const currentMileage = formData.get('currentMileage');
      if (currentMileage) {
        updateData.currentMileage = parseInt(currentMileage.toString());
      }

      // Handle date field
      const purchaseDate = formData.get('purchaseDate');
      if (purchaseDate) {
        updateData.purchaseDate = new Date(purchaseDate.toString());
      }

      // Add image URL if updated
      if (imageUrl !== motorcycle.imageUrl) {
        updateData.imageUrl = imageUrl;
      }
    } else {
      // Handle regular JSON data (existing functionality)
      const body = await request.json();
      
      updateData = {
        ...updateData,
        name: body.name,
        make: body.make,
        model: body.model,
        year: body.year ? parseInt(body.year) : motorcycle.year,
        vin: body.vin || null,
        color: body.color || null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        currentMileage: body.currentMileage ? parseInt(body.currentMileage) : null,
        notes: body.notes || null,
      };
    }

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