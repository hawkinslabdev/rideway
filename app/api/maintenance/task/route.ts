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
    
    // Calculate next due values
    const nextDueOdometer = body.intervalMiles ? currentOdometer + body.intervalMiles : null;
    
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