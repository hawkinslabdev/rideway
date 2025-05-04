// app/api/user/delete/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { users, motorcycles } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Due to cascade delete in the schema, deleting the user will automatically
    // delete all associated motorcycles, maintenance tasks, and records
    await db.delete(users).where(eq(users.id, session.user.id));

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}