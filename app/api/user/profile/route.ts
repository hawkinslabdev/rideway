// app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Don't send password hash to client
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// File: app/api/user/profile/route.ts
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, currentPassword, newPassword } = body;

    // Get current user
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Normalize email to lowercase if provided
    const normalizedEmail = email ? email.toLowerCase() : null;

    // Check if email is already taken by another user
    if (normalizedEmail && normalizedEmail !== currentUser.email.toLowerCase()) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });

      if (existingUser) {
        return NextResponse.json(
          { message: "Email already taken" },
          { status: 400 }
        );
      }
    }

    // If changing password, verify current password
    let hashedPassword = currentUser.password;
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { message: "Current password is required" },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        currentUser.password || ""
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { message: "Current password is incorrect" },
          { status: 400 }
        );
      }

      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    // Update user with normalized email
    const updatedUser = await db
      .update(users)
      .set({
        name: name || currentUser.name,
        email: normalizedEmail || currentUser.email,
        password: hashedPassword,
      })
      .where(eq(users.id, session.user.id))
      .returning();

    // Don't return password hash
    const { password: _, ...userWithoutPassword } = updatedUser[0];

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}