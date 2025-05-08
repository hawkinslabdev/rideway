// File: app/api/maintenance/check-due/route.ts
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { motorcycles, maintenanceTasks, users } from "@/app/lib/db/schema";
import { triggerEvent } from "@/app/lib/services/integrationService";
import { eq, and, lte, gt, isNull, not } from "drizzle-orm";
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
    
    // Direct implementation of the time-based task check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let notificationsTriggered = 0;
    
    // Get all motorcycles for this user
    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, session.user.id),
    });
    
    for (const motorcycle of userMotorcycles) {
      // Find tasks that are newly due today (and were not due yesterday)
      const dueTasks = await db.query.maintenanceTasks.findMany({
        where: and(
          eq(maintenanceTasks.motorcycleId, motorcycle.id),
          eq(maintenanceTasks.archived, false),
          not(isNull(maintenanceTasks.nextDueDate)), // Use not(isNull()) instead of ne(SQL.raw('NULL'))
          lte(maintenanceTasks.nextDueDate, today),
          // Only get tasks that weren't already due yesterday
          gt(maintenanceTasks.nextDueDate, new Date(today.getTime() - 86400000))
        ),
      });
      
      // Trigger maintenance_due event for each task
      for (const task of dueTasks) {
        await triggerEvent(session.user.id, "maintenance_due", {
          motorcycle: {
            id: motorcycle.id,
            name: motorcycle.name,
            make: motorcycle.make,
            model: motorcycle.model,
            year: motorcycle.year
          },
          task: {
            id: task.id,
            name: task.name
          }
        });
        notificationsTriggered++;
        console.log(`Triggered maintenance_due event for time-based task: ${task.name}`);
      }
    }
    
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

// Admin endpoint for checking all users
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // TODO: Add proper admin check here
    // For now, just allow any authenticated user to run this
    // In production, you should verify the user has admin privileges
    
    const allUsers = await db.query.users.findMany();
    let totalNotifications = 0;
    
    // For each user, check for due maintenance tasks
    for (const user of allUsers) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all motorcycles for this user
      const userMotorcycles = await db.query.motorcycles.findMany({
        where: eq(motorcycles.userId, user.id),
      });
      
      for (const motorcycle of userMotorcycles) {
        // Find tasks that are newly due today
        const dueTasks = await db.query.maintenanceTasks.findMany({
          where: and(
            eq(maintenanceTasks.motorcycleId, motorcycle.id),
            eq(maintenanceTasks.archived, false),
            not(isNull(maintenanceTasks.nextDueDate)), // Use not(isNull()) instead of ne(SQL.raw('NULL'))
            lte(maintenanceTasks.nextDueDate, today),
            gt(maintenanceTasks.nextDueDate, new Date(today.getTime() - 86400000))
          ),
        });
        
        // Trigger maintenance_due event for each task
        for (const task of dueTasks) {
          await triggerEvent(user.id, "maintenance_due", {
            motorcycle: {
              id: motorcycle.id,
              name: motorcycle.name,
              make: motorcycle.make,
              model: motorcycle.model,
              year: motorcycle.year
            },
            task: {
              id: task.id,
              name: task.name
            }
          });
          totalNotifications++;
          console.log(`Triggered maintenance_due event for user ${user.id}, task: ${task.name}`);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Maintenance check completed for all users", 
      notificationsSent: totalNotifications 
    });
  } catch (error) {
    console.error("Error in admin maintenance check endpoint:", error);
    return NextResponse.json(
      { error: "Failed to check maintenance" },
      { status: 500 }
    );
  }
}