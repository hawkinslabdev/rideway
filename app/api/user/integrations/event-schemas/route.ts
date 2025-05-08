// File: app/api/user/integrations/event-schemas/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { eventSchemas, generateExamplePayload } from "@/app/lib/utils/eventSchemaDiscovery";
import { EventType } from "@/app/lib/types/integrations";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const url = new URL(request.url);
    const eventType = url.searchParams.get('type') as EventType | null;
    
    if (eventType && eventSchemas[eventType]) {
      // Return schema for a specific event type
      const schema = eventSchemas[eventType];
      const examplePayload = generateExamplePayload(eventType);
      
      return NextResponse.json({
        schema,
        examplePayload
      });
    }
    
    // Return all schemas
    const allSchemas = Object.entries(eventSchemas).map(([type, schema]) => ({
      type,
      ...schema
    }));
    
    return NextResponse.json({ schemas: allSchemas });
  } catch (error) {
    console.error("Error fetching event schemas:", error);
    return NextResponse.json(
      { error: "Failed to fetch event schemas" },
      { status: 500 }
    );
  }
}