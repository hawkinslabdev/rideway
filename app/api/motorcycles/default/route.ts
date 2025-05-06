// app/api/motorcycles/default/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

// Set a motorcycle as default
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { motorcycleId } = await request.json();
    
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

    // First, unset all default motorcycles for this user
    await db.update(motorcycles)
      .set({ isDefault: false })
      .where(eq(motorcycles.userId, session.user.id));

    // Then set the selected motorcycle as default
    await db.update(motorcycles)
      .set({ isDefault: true })
      .where(eq(motorcycles.id, motorcycleId));

    return NextResponse.json({ 
      message: "Default motorcycle updated successfully",
      motorcycleId
    });
  } catch (error) {
    console.error("Error setting default motorcycle:", error);
    return NextResponse.json(
      { error: "Failed to set default motorcycle" },
      { status: 500 }
    );
  }
}