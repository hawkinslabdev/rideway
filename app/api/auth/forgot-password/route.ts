import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    // Find the user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    // Don't reveal whether a user exists
    if (!user) {
      return NextResponse.json({ 
        message: "If your email exists in our system, an administrator will be notified" 
      });
    }
    
    // Log the request to the console with clear instructions
    console.log('\n---------------------------------------------');
    console.log('📧 PASSWORD RESET REQUEST RECEIVED');
    console.log('---------------------------------------------');
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`User ID: ${user.id}`);
    console.log(`Requested: ${new Date().toLocaleString()}`);
    console.log('\n🔑 To generate a reset token, run:');
    console.log(`node app/scripts/reset-password.js generate ${user.email}`);
    console.log('\nOr in Docker environment:');
    console.log(`docker-compose exec app node app/scripts/reset-password.js generate ${user.email}`);
    console.log('---------------------------------------------\n');
   
   return NextResponse.json({ 
      message: "If your email exists in our system, an administrator will be notified" 
    });
  } catch (error) {
    console.error("Error processing password reset request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}