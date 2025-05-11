// File: app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from "@/app/lib/db/db";

export async function GET() {
  try {
    // Simple query to test database connectivity
    await db.query.motorcycles.findFirst();
    
    // Return 200 OK if everything is working
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Return 500 if the database is not working
    return NextResponse.json(
      { status: 'error', message: 'Database connection error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}