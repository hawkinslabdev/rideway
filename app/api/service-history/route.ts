// app/api/service-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { desc, eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { motorcycles, serviceRecords, maintenanceTasks } from "@/app/lib/db/schema";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { triggerEvent } from "@/app/lib/services/integrationService";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get URL parameters to support filtering
    const url = new URL(req.url);
    const motorcycleId = url.searchParams.get('motorcycleId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const taskType = url.searchParams.get('taskType');
    
    // Get user's motorcycles to filter by ownership
    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, session.user.id),
    });
    
    const motorcycleIds = userMotorcycles.map(m => m.id);
    
    // Build filter conditions using Drizzle's query builder
    let query = db.query.serviceRecords.findMany({
      with: {
        motorcycle: true
      },
      orderBy: [desc(serviceRecords.date)]
    });
    
    // Create condition for motorcycle ownership
    if (motorcycleIds.length === 0) {
      // Return empty if user has no motorcycles
      return NextResponse.json({ 
        records: [],
        stats: {
          totalRecords: 0,
          totalCost: 0,
          avgCost: 0,
          categories: [],
          motorcycles: []
        }
      });
    }
    
    // Apply additional filters
    let whereConditions: any[] = [inArray(serviceRecords.motorcycleId, motorcycleIds)];
    
    if (motorcycleId) {
      whereConditions.push(eq(serviceRecords.motorcycleId, motorcycleId));
    }
    
    if (startDate) {
      whereConditions.push(gte(serviceRecords.date, new Date(startDate)));
    }
    
    if (endDate) {
      whereConditions.push(lte(serviceRecords.date, new Date(endDate)));
    }
    
    // Apply all filters
    // Execute the query using Drizzle with the where conditions applied
    const records = await db.query.serviceRecords.findMany({
      with: {
        motorcycle: true
      },
      orderBy: [desc(serviceRecords.date)],
      where: and(...whereConditions)
    });
    
    // Format the records for the frontend
    const formattedRecords = records.map(record => ({
      id: record.id,
      motorcycleId: record.motorcycleId,
      taskId: record.taskId,
      motorcycle: record.motorcycle?.name || "Unknown",
      motorcycleMake: record.motorcycle?.make,
      motorcycleModel: record.motorcycle?.model,
      motorcycleYear: record.motorcycle?.year,
      date: record.date.toISOString(),
      mileage: record.mileage,
      task: record.task,
      cost: record.cost,
      location: record.location || "",
      notes: record.notes,
    }));

    // Calculate statistics
    const totalCost = formattedRecords.reduce((sum, record) => 
      sum + (record.cost || 0), 0
    );
    
    // Group by task type for category stats
    const taskCategories: Record<string, { count: number, cost: number }> = {};
    formattedRecords.forEach(record => {
      if (!taskCategories[record.task]) {
        taskCategories[record.task] = { count: 0, cost: 0 };
      }
      taskCategories[record.task].count++;
      taskCategories[record.task].cost += record.cost || 0;
    });
    
    // Convert to array for easier consumption
    const categoryStats = Object.entries(taskCategories).map(([name, data]) => ({
      name,
      count: data.count,
      totalCost: data.cost
    }));
    
    // Get stats by motorcycle
    const motorcycleStats: Record<string, { count: number, cost: number }> = {};
    formattedRecords.forEach(record => {
      if (!motorcycleStats[record.motorcycleId]) {
        motorcycleStats[record.motorcycleId] = { count: 0, cost: 0 };
      }
      motorcycleStats[record.motorcycleId].count++;
      motorcycleStats[record.motorcycleId].cost += record.cost || 0;
    });
    
    const stats = {
      totalRecords: formattedRecords.length,
      totalCost: totalCost,
      avgCost: formattedRecords.length > 0 ? totalCost / formattedRecords.length : 0,
      categories: categoryStats,
      motorcycles: Object.entries(motorcycleStats).map(([id, data]) => ({
        id,
        name: userMotorcycles.find(m => m.id === id)?.name || "Unknown",
        count: data.count,
        totalCost: data.cost
      }))
    };

    return NextResponse.json({ 
      records: formattedRecords,
      stats: stats 
    });
  } catch (error) {
    console.error("Error fetching service history:", error);
    return NextResponse.json(
      { error: "Failed to fetch service history", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const data = await req.json();
    
    // Validate the request
    if (!data.motorcycleId || !data.date || !data.task) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, data.motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });
    
    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found or not owned by user" },
        { status: 404 }
      );
    }
    
    // If taskId is provided, verify that it belongs to this motorcycle
    if (data.taskId) {
      const task = await db.query.maintenanceTasks.findFirst({
        where: and(
          eq(maintenanceTasks.id, data.taskId),
          eq(maintenanceTasks.motorcycleId, data.motorcycleId)
        ),
      });
      
      if (!task) {
        return NextResponse.json(
          { error: "Maintenance task not found or does not belong to this motorcycle" },
          { status: 404 }
        );
      }
      
      // If this is completing a maintenance task, update the task's next due date and mileage
      if (task.isRecurring) {
        // Calculate next due date
        let nextDueDate = null;
        if (task.intervalDays) {
          nextDueDate = new Date(data.date);
          nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
        }
        
        // Calculate next due mileage
        let nextDueOdometer = null;
        if (task.intervalMiles && data.mileage) {
          if (task.intervalBase === 'zero') {
            // For zero-based intervals, calculate next milestone
            const intervalsPassed = Math.floor(data.mileage / task.intervalMiles);
            nextDueOdometer = (intervalsPassed + 1) * task.intervalMiles;
          } else {
            // For current-based intervals, add interval to current mileage
            nextDueOdometer = data.mileage + task.intervalMiles;
          }
        }
        
        // Update the task with new base and next due values
        await db.update(maintenanceTasks)
          .set({
            baseOdometer: data.mileage || 0,
            baseDate: new Date(data.date),
            nextDueOdometer: nextDueOdometer,
            nextDueDate: nextDueDate
          })
          .where(eq(maintenanceTasks.id, data.taskId));
      }
    }
    
    // Create the service record
    const serviceRecord = await db.insert(serviceRecords).values({
      id: data.id || randomUUID(),
      motorcycleId: data.motorcycleId,
      taskId: data.taskId || null,
      date: new Date(data.date),
      mileage: data.mileage,
      task: data.task,
      cost: data.cost,
      location: data.location || null,
      notes: data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    // Check if we need to update the motorcycle's current mileage
    if (data.mileage && motorcycle) {
      if (motorcycle.currentMileage === null || data.mileage > motorcycle.currentMileage) {
        // Update the motorcycle's mileage
        await db
          .update(motorcycles)
          .set({
            currentMileage: data.mileage,
            updatedAt: new Date(),
          })
          .where(eq(motorcycles.id, data.motorcycleId));
      }
    }
    
    // Trigger event for integrations
    await triggerEvent(session.user.id, "maintenance_completed", {
      motorcycle: {
        id: motorcycle.id,
        name: motorcycle.name,
        make: motorcycle.make,
        model: motorcycle.model,
        year: motorcycle.year
      },
      task: {
        id: data.taskId || null,
        name: data.task
      },
      record: {
        id: serviceRecord[0].id,
        date: new Date(data.date),
        mileage: data.mileage,
        cost: data.cost,
        notes: data.notes
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      record: serviceRecord[0]
    });
  } catch (error) {
    console.error("Error creating service record:", error);
    return NextResponse.json(
      { error: "Failed to create service record", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}