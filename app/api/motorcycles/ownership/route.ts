// app/api/motorcycles/ownership/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

// Toggle motorcycle ownership status
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { motorcycleId, isOwned } = await request.json();
    
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

    // If marking as not owned and this was the default motorcycle,
    // we should unset it as default
    let isDefault = motorcycle.isDefault;
    if (isOwned === false && motorcycle.isDefault) {
      isDefault = false;
    }

    // Update the motorcycle ownership status
    const updatedMotorcycle = await db.update(motorcycles)
      .set({ 
        isOwned: isOwned,
        isDefault: isDefault,
        updatedAt: new Date()
      })
      .where(eq(motorcycles.id, motorcycleId))
      .returning();

    // If we unset a default motorcycle, try to set another motorcycle as default
    if (isOwned === false && motorcycle.isDefault) {
      // Find another motorcycle that is owned to make default
      const anotherMotorcycle = await db.query.motorcycles.findFirst({
        where: and(
          eq(motorcycles.userId, session.user.id),
          eq(motorcycles.isOwned, true),
          eq(motorcycles.id, motorcycleId) // not this motorcycle
        ),
        orderBy: (motorcycles, { asc }) => [asc(motorcycles.createdAt)]
      });

      if (anotherMotorcycle) {
        await db.update(motorcycles)
          .set({ isDefault: true })
          .where(eq(motorcycles.id, anotherMotorcycle.id));
      }
    }

    return NextResponse.json({ 
      message: isOwned ? "Motorcycle marked as owned" : "Motorcycle archived as no longer owned",
      motorcycle: updatedMotorcycle[0]
    });
  } catch (error) {
    console.error("Error updating motorcycle ownership:", error);
    return NextResponse.json(
      { error: "Failed to update motorcycle ownership" },
      { status: 500 }
    );
  }
}