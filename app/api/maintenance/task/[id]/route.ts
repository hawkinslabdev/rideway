// app/api/maintenance/task/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { maintenanceTasks, motorcycles } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

// GET: Retrieve a specific maintenance task
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

    // Get the task
    const task = await db.query.maintenanceTasks.findFirst({
      where: eq(maintenanceTasks.id, id),
    });

    if (!task) {
      return NextResponse.json(
        { error: "Maintenance task not found" },
        { status: 404 }
      );
    }

    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, task.motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Unauthorized - motorcycle not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: task.id,
      motorcycleId: task.motorcycleId,
      name: task.name,
      description: task.description,
      intervalMiles: task.intervalMiles,
      intervalDays: task.intervalDays,
      priority: task.priority,
      isRecurring: task.isRecurring,
    });
  } catch (error) {
    console.error("Error fetching maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance task" },
      { status: 500 }
    );
  }
}

// PATCH: Update a maintenance task
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

    // Get the request body
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Task name is required" },
        { status: 400 }
      );
    }

    // Get the current task
    const task = await db.query.maintenanceTasks.findFirst({
      where: eq(maintenanceTasks.id, id),
    });

    if (!task) {
      return NextResponse.json(
        { error: "Maintenance task not found" },
        { status: 404 }
      );
    }

    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, task.motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Unauthorized - motorcycle not found" },
        { status: 401 }
      );
    }

    // If user is changing motorcycle, verify ownership of the new motorcycle
    if (body.motorcycleId && body.motorcycleId !== task.motorcycleId) {
      const newMotorcycle = await db.query.motorcycles.findFirst({
        where: and(
          eq(motorcycles.id, body.motorcycleId),
          eq(motorcycles.userId, session.user.id)
        ),
      });

      if (!newMotorcycle) {
        return NextResponse.json(
          { error: "Unauthorized - new motorcycle not found" },
          { status: 401 }
        );
      }
    }
    
    // Get current motorcycle for calculations
    const currentMotorcycle = body.motorcycleId && body.motorcycleId !== task.motorcycleId
      ? await db.query.motorcycles.findFirst({
          where: eq(motorcycles.id, body.motorcycleId),
        })
      : motorcycle;
    
    if (!currentMotorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found" },
        { status: 404 }
      );
    }
    
    const currentOdometer = currentMotorcycle.currentMileage || 0;
    
    // Determine next due mileage
    let nextDueOdometer = task.nextDueOdometer;
    let intervalMiles = body.intervalMiles !== undefined ? body.intervalMiles : task.intervalMiles;
    
    // If explicit nextDueMileage is provided, use that
    if (body.nextDueMileage) {
      nextDueOdometer = body.nextDueMileage;
      
      // Validate that the next due mileage is greater than current mileage
      if (nextDueOdometer <= currentOdometer) {
        return NextResponse.json(
          { error: "Next due mileage must be greater than current motorcycle mileage" },
          { status: 400 }
        );
      }
      
      // Calculate the implied interval if we have a nextDueMileage
      if (currentOdometer > 0) {
        intervalMiles = nextDueOdometer - currentOdometer;
      }
    } 
    // Otherwise calculate from interval
    else if (body.intervalMiles) {
      nextDueOdometer = currentOdometer + body.intervalMiles;
    }
    
    // Calculate next due date
    let nextDueDate = task.nextDueDate;
    const now = new Date();
    
    if (body.intervalDays !== undefined) {
      if (body.intervalDays) {
        nextDueDate = new Date(now);
        nextDueDate.setDate(nextDueDate.getDate() + body.intervalDays);
      } else {
        nextDueDate = null;
      }
    }

    // Update the task
    const updatedTask = await db
      .update(maintenanceTasks)
      .set({
        motorcycleId: body.motorcycleId || task.motorcycleId,
        name: body.name,
        description: body.description !== undefined ? body.description : task.description,
        intervalMiles: intervalMiles,
        intervalDays: body.intervalDays !== undefined ? body.intervalDays : task.intervalDays,
        priority: body.priority || task.priority,
        isRecurring: body.isRecurring !== undefined ? body.isRecurring : task.isRecurring,
        
        // Update the hybrid tracking fields
        baseOdometer: currentOdometer,
        nextDueOdometer: nextDueOdometer,
        baseDate: now,
        nextDueDate: nextDueDate
      })
      .where(eq(maintenanceTasks.id, id))
      .returning();

    return NextResponse.json(updatedTask[0]);
  } catch (error) {
    console.error("Error updating maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to update maintenance task" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a maintenance task
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

    // Get the task
    const task = await db.query.maintenanceTasks.findFirst({
      where: eq(maintenanceTasks.id, id),
    });

    if (!task) {
      return NextResponse.json(
        { error: "Maintenance task not found" },
        { status: 404 }
      );
    }

    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, task.motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Unauthorized - motorcycle not found" },
        { status: 401 }
      );
    }

    // Delete the task
    await db.delete(maintenanceTasks).where(eq(maintenanceTasks.id, id));

    return NextResponse.json({ message: "Maintenance task deleted successfully" });
  } catch (error) {
    console.error("Error deleting maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to delete maintenance task" },
      { status: 500 }
    );
  }
}