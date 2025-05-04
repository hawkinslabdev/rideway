// app/api/motorcycles/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ motorcycles: [] });
    }

    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, session.user.id),
      orderBy: (motorcycles, { desc }) => [desc(motorcycles.createdAt)],
    });

    return NextResponse.json({ motorcycles: userMotorcycles });
  } catch (error) {
    console.error("Motorcycles API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch motorcycles" },
      { status: 500 }
    );
  }
}

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
    
    const newMotorcycle = await db.insert(motorcycles).values({
      id: randomUUID(),
      userId: session.user.id,
      name: body.name,
      make: body.make,
      model: body.model,
      year: body.year,
      vin: body.vin || null,
      color: body.color || null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      currentMileage: body.currentMileage ? parseInt(body.currentMileage) : null,
      imageUrl: body.imageUrl || null,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newMotorcycle[0], { status: 201 });
  } catch (error) {
    console.error("Create motorcycle error:", error);
    return NextResponse.json(
      { error: "Failed to create motorcycle" },
      { status: 500 }
    );
  }
}