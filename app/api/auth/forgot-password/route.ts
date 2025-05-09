import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { users, passwordResetTokens } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    console.log("\n\n=============== PASSWORD RESET REQUEST RECEIVED ===============");
    const { email } = await request.json();
    
    if (!email) {
      console.error("PASSWORD RESET ERROR: Email is required");
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    console.log(`PASSWORD RESET: Request for email: ${email}`);
    
    // Find the user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    // Don't reveal whether a user exists
    if (!user) {
      console.log(`PASSWORD RESET: User not found for email: ${email}`);
      return NextResponse.json({ 
        message: "If your email exists in our system, you will receive password reset instructions" 
      });
    }
    
    // Log the request to the console with clear instructions
    console.log('\n---------------------------------------------');
    console.log('📧 PASSWORD RESET REQUEST RECEIVED');
    console.log('---------------------------------------------');
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`User ID: ${user.id}`);
    console.log(`Requested: ${new Date().toLocaleString()}`);
    
    // Generate a unique token
    const token = randomUUID();
    
    // Set expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    try {
      // Store the token in the database
      await db.insert(passwordResetTokens).values({
        id: randomUUID(),
        userId: user.id,
        token: token,
        expiresAt: expiresAt,
        used: false,
        createdAt: new Date()
      });
      
      console.log('\n🔑 PASSWORD RESET TOKEN GENERATED:');
      console.log(`Token: ${token}`);
      console.log(`Expires: ${expiresAt.toLocaleString()}`);
      console.log('\nTo reset the password manually, use:');
      console.log(`http://localhost:3000/auth/reset-password/${token}`);
      console.log('---------------------------------------------\n');
    } catch (dbError) {
      console.error('ERROR SAVING TOKEN TO DATABASE:', dbError);
      throw dbError;
    }
   
    return NextResponse.json({ 
      message: "If your email exists in our system, you will receive password reset instructions" 
    });
  } catch (error) {
    console.error("Error processing password reset request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}