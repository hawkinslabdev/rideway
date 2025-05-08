// File: app/api/user/integrations/[id]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { integrations, integrationEvents } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { encrypt, decrypt } from "@/app/lib/utils/encryption";
import { randomUUID } from "crypto";
import { IntegrationConfig } from "@/app/lib/types/integrations";

// GET: Get a specific integration
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await the params before using them
    const { id } = await params;

    // Get the integration with verification of ownership
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, id),
        eq(integrations.userId, session.user.id)
      ),
      with: {
        events: true
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Decrypt configuration
    const decryptedIntegration = {
      ...integration,
      config: JSON.parse(decrypt(integration.config)) as IntegrationConfig
    };

    return NextResponse.json(decryptedIntegration);
  } catch (error) {
    console.error("Error fetching integration:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration" },
      { status: 500 }
    );
  }
}

// PATCH: Update an integration
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await the params before using them
    const { id } = await params;

    // Verify integration ownership
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, id),
        eq(integrations.userId, session.user.id)
      )
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Define the type for events
    interface Event {
      eventType: string;
      enabled?: boolean;
      templateData?: Record<string, any>;
    }

    // Update the integration
    let updateData: any = {
      updatedAt: new Date()
    };

    if (body.name) updateData.name = body.name;
    if (body.active !== undefined) updateData.active = body.active;
    
    // If config is provided, encrypt it
    if (body.config) {
      updateData.config = encrypt(JSON.stringify(body.config));
    }

    // Update the integration
    await db.update(integrations)
      .set(updateData)
      .where(eq(integrations.id, id));

    // If events are provided, update them
    if (body.events && Array.isArray(body.events)) {
      // First delete all existing events
      await db.delete(integrationEvents)
        .where(eq(integrationEvents.integrationId, id));

      // Then create new ones
      const eventEntries = body.events.map((event: Event) => ({
        id: randomUUID(),
        integrationId: id,
        eventType: event.eventType,
        enabled: event.enabled ?? true,
        templateData: event.templateData ? JSON.stringify(event.templateData) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (eventEntries.length > 0) {
        await db.insert(integrationEvents).values(eventEntries);
      }
    }

    // Get the updated integration
    const updatedIntegration = await db.query.integrations.findFirst({
      where: eq(integrations.id, id),
      with: {
        events: true
      }
    });

    // Decrypt for response
    if (!updatedIntegration) {
      return NextResponse.json(
        { error: "Failed to update integration" },
        { status: 500 }
      );
    }

    const decryptedIntegration = {
      ...updatedIntegration,
      config: JSON.parse(decrypt(updatedIntegration.config)) as IntegrationConfig
    };

    return NextResponse.json(decryptedIntegration);
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: "Failed to update integration" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an integration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await the params before using them
    const { id } = await params;

    // Verify integration ownership
    const existingIntegration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.id, id),
        eq(integrations.userId, session.user.id)
      )
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Delete the integration (will cascade delete events)
    await db.delete(integrations)
      .where(eq(integrations.id, id));

    return NextResponse.json({ message: "Integration deleted successfully" });
  } catch (error) {
    console.error("Error deleting integration:", error);
    return NextResponse.json(
      { error: "Failed to delete integration" },
      { status: 500 }
    );
  }
}