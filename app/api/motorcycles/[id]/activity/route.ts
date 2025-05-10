// app/api/motorcycles/[id]/activity/route.ts

import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceRecords, mileageLogs } from "@/app/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
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

    // Parse URL to get limit parameter
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 10;

    // Verify motorcycle ownership
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

    // Get maintenance records
    const maintenanceItems = await db.query.maintenanceRecords.findMany({
      where: eq(maintenanceRecords.motorcycleId, id),
      orderBy: [desc(maintenanceRecords.date)],
      with: {
        task: true
      }
    });

    // Get mileage logs
    const mileageUpdates = await db.query.mileageLogs.findMany({
      where: eq(mileageLogs.motorcycleId, id),
      orderBy: [desc(mileageLogs.date)]
    });

    // Combine and format all activities
    const combinedActivity = [
      // Format maintenance records
      ...maintenanceItems.map(record => ({
        id: record.id,
        type: 'maintenance',
        title: record.task ? record.task.name : 'Maintenance',
        description: record.notes || null,
        date: record.date,
        motorcycleId: record.motorcycleId,
        motorcycleName: motorcycle.name,
        mileage: record.mileage,
        maintenanceType: record.task?.name,
        cost: record.cost,
        notes: record.notes
      })),
      
      // Format mileage updates
      ...mileageUpdates.map(log => ({
        id: log.id,
        type: 'mileage_update',
        title: 'Mileage Update',
        description: log.notes || `Updated mileage to ${log.newMileage}`,
        date: log.date,
        motorcycleId: log.motorcycleId,
        motorcycleName: motorcycle.name,
        mileage: log.newMileage,
        previousMileage: log.previousMileage,
        notes: log.notes
      }))
    ];

    // Add motorcycle creation as an activity if needed
    if (motorcycle.createdAt) {
      combinedActivity.push({
              id: `creation-${motorcycle.id}`,
              type: 'motorcycle_added',
              title: 'Motorcycle Added',
              description: `Added ${motorcycle.year} ${motorcycle.make} ${motorcycle.model} to garage`,
              date: motorcycle.createdAt,
              motorcycleId: motorcycle.id,
              motorcycleName: motorcycle.name,
              mileage: motorcycle.currentMileage ?? 0,
              previousMileage: null,
              notes: null
            });
    }

    // Sort by date (newest first) and apply limit
    const activity = combinedActivity
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return NextResponse.json({ activity });
  } catch (error) {
    console.error("Error fetching motorcycle activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch motorcycle activity" },
      { status: 500 }
    );
  }
}