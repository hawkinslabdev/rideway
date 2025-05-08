// app/api/auth/validate-token/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { passwordResetTokens } from "@/app/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }
  
  try {
    // Find the token and check if it's valid
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date())
      ),
    });
    
    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }
    
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error validating token:", error);
    return NextResponse.json({ error: "Failed to validate token" }, { status: 500 });
  }
}