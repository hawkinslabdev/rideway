import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    
    // Convert email to lowercase before checking or storing
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists (case-insensitive)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with normalized email
    const newUser = await db.insert(users).values({
      id: randomUUID(),
      name,
      email: normalizedEmail, // Store email in lowercase
      password: hashedPassword,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(
      { message: "User created successfully", user: { id: newUser[0].id, email: newUser[0].email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Error creating user" },
      { status: 500 }
    );
  }
}