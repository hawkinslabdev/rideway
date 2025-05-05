// app/api/maintenance/task/[id]/archive/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { maintenanceTasks, motorcycles } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

// PATCH: Archive a maintenance task (soft delete)
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
    
    // Get the request body to determine if we're archiving or unarchiving
    const body = await request.json();
    const isArchived = body.archived === true;

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

    // Update the task archived status
    const updatedTask = await db
      .update(maintenanceTasks)
      .set({
        archived: isArchived
      })
      .where(eq(maintenanceTasks.id, id))
      .returning();

    return NextResponse.json({
      message: isArchived ? "Maintenance task archived successfully" : "Maintenance task restored successfully",
      task: updatedTask[0]
    });
  } catch (error) {
    console.error("Error archiving maintenance task:", error);
    return NextResponse.json(
      { error: "Failed to archive maintenance task" },
      { status: 500 }
    );
  }
}