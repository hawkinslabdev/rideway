// app/admin/reset-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Define TypeScript interfaces for our requests and responses
interface GenerateRequest {
  action: 'generate';
  email: string;
}

interface ResetRequest {
  action: 'reset';
  token: string;
  password: string;
}

interface GenerateResponse {
  success: boolean;
  token: string;
}

interface ResetResponse {
  success: boolean;
  email: string;
}

interface ErrorResponse {
  error: string;
}

// In-memory store for tokens (would use database in production)
// Format: { [token: string]: { email: string, expires: Date } }
const resetTokens: Record<string, { email: string, expires: Date }> = {};

export async function POST(request: Request) {
  try {
    // Parse request
    const data = await request.json() as GenerateRequest | ResetRequest;
    
    // Generate new reset token
    if (data.action === 'generate') {
      return await handleGenerateToken(data);
    }
    
    // Reset password using token
    if (data.action === 'reset') {
      return await handleResetPassword(data);
    }
    
    return NextResponse.json(
      { error: "Invalid action. Use 'generate' or 'reset'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Password reset failed" },
      { status: 500 }
    );
  }
}

async function handleGenerateToken(data: GenerateRequest): Promise<NextResponse<GenerateResponse | ErrorResponse>> {
  const { email } = data;
  
  // Check if email exists in the database
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  
  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }
  
  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store token with expiration (24 hours)
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  
  resetTokens[token] = {
    email,
    expires
  };
  
  console.log(`Generated reset token for ${email}: ${token}`);
  
  return NextResponse.json({
    success: true,
    token
  });
}

async function handleResetPassword(data: ResetRequest): Promise<NextResponse<ResetResponse | ErrorResponse>> {
  const { token, password } = data;
  
  // Check if token exists and is valid
  const tokenData = resetTokens[token];
  
  if (!tokenData) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 }
    );
  }
  
  // Check if token has expired
  if (new Date() > tokenData.expires) {
    // Remove expired token
    delete resetTokens[token];
    
    return NextResponse.json(
      { error: "Token has expired" },
      { status: 400 }
    );
  }
  
  // Hash the new password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Update user password
  const updatedUser = await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.email, tokenData.email))
    .returning();
  
  if (!updatedUser || updatedUser.length === 0) {
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
  
  // Remove the used token
  delete resetTokens[token];
  
  console.log(`Password reset successful for ${tokenData.email}`);
  
  return NextResponse.json({
    success: true,
    email: tokenData.email
  });
}