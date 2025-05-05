// app/api/maintenance/task/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { maintenanceTasks, motorcycles } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.motorcycleId || !body.name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, body.motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });
    
    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found or not owned by user" },
        { status: 404 }
      );
    }
    
    // Validate at least one interval is provided
    if (body.intervalMiles === null && body.intervalDays === null) {
      return NextResponse.json(
        { error: "Either mileage interval or time interval must be provided" },
        { status: 400 }
      );
    }
    
    // Calculate the next due values based on current motorcycle data
    const currentDate = new Date();
    const currentOdometer = motorcycle.currentMileage || 0;
    
    // Determine next due mileage
    let nextDueOdometer = null;
    
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
    } 
    // Otherwise calculate from interval
    else if (body.intervalMiles) {
      nextDueOdometer = currentOdometer + body.intervalMiles;
    }
    
    // Calculate next due date
    let nextDueDate = null;
    if (body.intervalDays) {
      nextDueDate = new Date(currentDate);
      nextDueDate.setDate(nextDueDate.getDate() + body.intervalDays);
    }
    
    // Create maintenance task with enhanced tracking
    const newTask = await db.insert(maintenanceTasks).values({
      id: randomUUID(),
      motorcycleId: body.motorcycleId,
      name: body.name,
      description: body.description || null,
      intervalMiles: body.intervalMiles || null,
      intervalDays: body.intervalDays || null,
      
      // New fields for our hybrid approach
      baseOdometer: currentOdometer,  // Starting point for interval
      nextDueOdometer: nextDueOdometer,
      baseDate: currentDate,
      nextDueDate: nextDueDate,
      
      priority: body.priority || "medium",
      isRecurring: body.isRecurring !== undefined ? body.isRecurring : true,
      createdAt: new Date(),
    }).returning();
    
    return NextResponse.json(newTask[0], { status: 201 });
  } catch (error) {
    console.error("Error creating maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance task" },
      { status: 500 }
    );
  }
}

// Get a specific maintenance task
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Extract task ID from query params
    const url = new URL(request.url);
    const taskId = url.searchParams.get("id");
    
    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }
    
    // Get the task
    const task = await db.query.maintenanceTasks.findFirst({
      where: eq(maintenanceTasks.id, taskId),
    });
    
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
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
        { error: "Unauthorized to access this task" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance task" },
      { status: 500 }
    );
  }
}