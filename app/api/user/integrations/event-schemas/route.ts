// app/api/user/integrations/event-schemas/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { 
  eventSchemas, 
  generateExamplePayload, 
  getSafeEventSchema,
  isValidEventType
} from "@/app/lib/utils/eventSchemaDiscovery";
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
    const eventTypeParam = url.searchParams.get('type');
    
    // Handle single event type request
    if (eventTypeParam) {
      // Get schema safely, falling back to a default if not found
      const schema = getSafeEventSchema(eventTypeParam);
      
      // Generate example payload, or use a default if the function fails
      let examplePayload;
      try {
        examplePayload = isValidEventType(eventTypeParam) 
          ? generateExamplePayload(eventTypeParam as EventType)
          : { event: eventTypeParam, timestamp: new Date().toISOString() };
      } catch (err) {
        console.error(`Error generating example payload for ${eventTypeParam}:`, err);
        examplePayload = { event: eventTypeParam, timestamp: new Date().toISOString() };
      }
      
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