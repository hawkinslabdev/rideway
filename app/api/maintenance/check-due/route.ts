// File: app/api/maintenance/check-due/route.ts
import { NextResponse } from "next/server";
import { checkAllUsersForDueTasks, checkForDueTimeBasedTasks } from "@/app/lib/utils/maintenanceUtils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

// Simple in-memory rate limiter
const lastRunTime: Record<string, number> = {};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Simple rate limiting - only allow once per hour per user
    const now = Date.now();
    const lastRun = lastRunTime[session.user.id] || 0;
    const timeSinceLastRun = now - lastRun;
    
    if (timeSinceLastRun < 3600000) { // 1 hour in milliseconds
      return NextResponse.json({ 
        message: "Rate limited: You can only run this check once per hour",
        timeRemaining: Math.ceil((3600000 - timeSinceLastRun) / 60000) // minutes
      });
    }
    
    // Update last run time
    lastRunTime[session.user.id] = now;
    
    // Check for current user only
    const notificationsTriggered = await checkForDueTimeBasedTasks(session.user.id);
    
    return NextResponse.json({
      success: true,
      message: "Maintenance check completed",
      notificationsSent: notificationsTriggered
    });
  } catch (error) {
    console.error("Error in maintenance check endpoint:", error);
    return NextResponse.json(
      { error: "Failed to check maintenance" },
      { status: 500 }
    );
  }
}

// Admin endpoint for checking all users - requires admin role // TODO
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Run the check for all users
    const result = await checkAllUsersForDueTasks();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in admin maintenance check endpoint:", error);
    return NextResponse.json(
      { error: "Failed to check maintenance" },
      { status: 500 }
    );
  }
}