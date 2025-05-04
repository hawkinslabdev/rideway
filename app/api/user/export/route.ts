// app/api/user/export/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, maintenanceRecords } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all user's motorcycles
    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, session.user.id),
      with: {
        maintenanceTasks: true,
        maintenanceRecords: true,
      },
    });

    // Format the data for export
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      user: {
        name: session.user.name,
        email: session.user.email,
      },
      motorcycles: userMotorcycles.map(motorcycle => ({
        id: motorcycle.id,
        name: motorcycle.name,
        make: motorcycle.make,
        model: motorcycle.model,
        year: motorcycle.year,
        vin: motorcycle.vin,
        color: motorcycle.color,
        purchaseDate: motorcycle.purchaseDate,
        currentMileage: motorcycle.currentMileage,
        imageUrl: motorcycle.imageUrl,
        notes: motorcycle.notes,
        createdAt: motorcycle.createdAt,
        updatedAt: motorcycle.updatedAt,
        maintenanceTasks: motorcycle.maintenanceTasks.map(task => ({
          id: task.id,
          name: task.name,
          description: task.description,
          intervalMiles: task.intervalMiles,
          intervalDays: task.intervalDays,
          priority: task.priority,
          isRecurring: task.isRecurring,
          createdAt: task.createdAt,
        })),
        maintenanceRecords: motorcycle.maintenanceRecords.map(record => ({
          id: record.id,
          taskId: record.taskId,
          date: record.date,
          mileage: record.mileage,
          cost: record.cost,
          notes: record.notes,
          receiptUrl: record.receiptUrl,
          createdAt: record.createdAt,
        })),
      })),
    };

    // Create the JSON file
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Return as downloadable file
    return new NextResponse(jsonData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="rideway-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}