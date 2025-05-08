// app/api/motorcycles/mileage-log/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, mileageLogs } from "@/app/lib/db/schema";
import { triggerEvent } from "@/app/lib/services/integrationService";
import { eq, and, desc } from "drizzle-orm";
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

    const { motorcycleId, previousMileage, newMileage, notes } = await request.json();
    
    if (!motorcycleId || newMileage === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found" },
        { status: 404 }
      );
    }
    
    // Check if the mileage is actually different from current mileage
    // This prevents duplicate entries when this endpoint is called unnecessarily
    if (motorcycle.currentMileage === newMileage) {
      return NextResponse.json(
        { message: "Mileage unchanged, no log entry created" },
        { status: 200 }
      );
    }

    // Create a mileage log entry
    const logEntry = await db.insert(mileageLogs).values({
      id: randomUUID(),
      motorcycleId: motorcycleId,
      previousMileage: previousMileage !== undefined ? previousMileage : motorcycle.currentMileage,
      newMileage: newMileage,
      date: new Date(),
      notes: notes || `Updated mileage to ${newMileage}`,
      createdAt: new Date(),
    }).returning();

    // Also update the motorcycle's current mileage
    await db.update(motorcycles)
      .set({ 
        currentMileage: newMileage,
        updatedAt: new Date()
      })
      .where(eq(motorcycles.id, motorcycleId));

    // Trigger an event for the mileage update
    await triggerEvent(session.user.id, "mileage_updated", {
      motorcycle: {
        id: motorcycle.id,
        name: motorcycle.name,
        make: motorcycle.make,
        model: motorcycle.model,
        year: motorcycle.year
      },
      previousMileage: previousMileage !== undefined ? previousMileage : motorcycle.currentMileage,
      newMileage: newMileage
    });

    return NextResponse.json(logEntry[0], { status: 201 });
  } catch (error) {
    console.error("Error logging mileage update:", error);
    return NextResponse.json(
      { error: "Failed to log mileage update" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const motorcycleId = url.searchParams.get('motorcycleId');
    
    if (!motorcycleId) {
      return NextResponse.json(
        { error: "Motorcycle ID is required" },
        { status: 400 }
      );
    }

    // Verify motorcycle ownership
    const motorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, motorcycleId),
        eq(motorcycles.userId, session.user.id)
      ),
    });

    if (!motorcycle) {
      return NextResponse.json(
        { error: "Motorcycle not found" },
        { status: 404 }
      );
    }

    // Get mileage logs for the motorcycle
    const logs = await db.query.mileageLogs.findMany({
      where: eq(mileageLogs.motorcycleId, motorcycleId),
      orderBy: (logs, { desc }) => [desc(logs.date)],
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching mileage logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch mileage logs" },
      { status: 500 }
    );
  }
}