// app/api/user/integrations/route.ts

import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { integrations, integrationEvents } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { encrypt, decrypt } from "@/app/lib/utils/encryption";
import { randomUUID } from "crypto";
import { IntegrationConfig } from "@/app/lib/types/integrations";

// GET: Get all integrations for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all integrations for the user
    const userIntegrations = await db.query.integrations.findMany({
      where: eq(integrations.userId, session.user.id),
      with: {
        events: true
      }
    });

    // Decrypt configuration data
    const decryptedIntegrations = userIntegrations.map(integration => ({
      ...integration,
      config: JSON.parse(decrypt(integration.config)) as IntegrationConfig
    }));

    return NextResponse.json({ integrations: decryptedIntegrations });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

// POST: Create a new integration
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.type || !body.config) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure config can be serialized to a valid JSON string
    let encryptedConfig;
    try {
      const configStr = JSON.stringify(body.config);
      encryptedConfig = encrypt(configStr);
    } catch (err) {
      console.error("Error serializing config:", err);
      return NextResponse.json(
        { error: "Invalid configuration format" },
        { status: 400 }
      );
    }

    // Create the integration
    const newIntegration = await db.insert(integrations).values({
      id: randomUUID(),
      userId: session.user.id,
      name: body.name,
      type: body.type,
      active: body.active ?? true,
      config: encryptedConfig,
      createdAt: new Date().toISOString(), // Use ISO string instead of Date object
      updatedAt: new Date().toISOString(), // Use ISO string instead of Date object
    }).returning();

    // Define the type for event objects
    interface IntegrationEvent {
      eventType: string;
      enabled?: boolean;
      templateData?: Record<string, unknown>;
      payloadTemplate?: string;
    }

    // If events are provided, create them
    if (body.events && Array.isArray(body.events)) {
      const eventEntries = body.events.map((event: IntegrationEvent) => {
        // Parse templateData to a string if it exists
        const templateDataStr = event.templateData ? 
          JSON.stringify(event.templateData) : null;
        
        return {
          id: randomUUID(),
          integrationId: newIntegration[0].id,
          eventType: event.eventType,
          enabled: event.enabled ?? true,
          templateData: templateDataStr,
          payloadTemplate: event.payloadTemplate || null,
          createdAt: new Date().toISOString(), // Use ISO string
          updatedAt: new Date().toISOString(), // Use ISO string
        };
      });

      await db.insert(integrationEvents).values(eventEntries);
    }

    // Get the complete integration with events
    const completeIntegration = await db.query.integrations.findFirst({
      where: eq(integrations.id, newIntegration[0].id),
      with: {
        events: true
      }
    });

    // Decrypt for response
    if (!completeIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const decryptedIntegration = {
      ...completeIntegration,
      config: JSON.parse(decrypt(completeIntegration.config)) as IntegrationConfig
    };

    return NextResponse.json(decryptedIntegration, { status: 201 });
  } catch (error) {
    console.error("Error creating integration:", error);
    return NextResponse.json(
      { error: `Failed to create integration: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}