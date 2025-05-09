// app/api/user/integrations/[id]/route.ts

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
    
    // Define update data object
    let updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Handle name update
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    
    // Handle active toggle specifically - ensure it's a boolean in the database
    if (body.active !== undefined) {
      // Make sure we store it as 0 or 1 for SQLite
      updateData.active = body.active ? 1 : 0;
    }
    
    // Handle config update
    if (body.config) {
      try {
        const configStr = JSON.stringify(body.config);
        updateData.config = encrypt(configStr);
      } catch (err) {
        console.error("Error serializing config:", err);
        return NextResponse.json(
          { error: "Invalid configuration format" },
          { status: 400 }
        );
      }
    }

    // Debug log
    console.log("Updating integration with data:", {
      ...updateData,
      config: updateData.config ? "[ENCRYPTED]" : undefined
    });

    // Update the integration
    try {
      await db.update(integrations)
        .set(updateData)
        .where(eq(integrations.id, id));
        
      console.log(`Integration ${id} updated successfully`);
    } catch (err) {
      console.error("Error updating integration:", err);
      return NextResponse.json(
        { error: "Failed to update integration data" },
        { status: 500 }
      );
    }

    // If events are provided, update them
    if (body.events && Array.isArray(body.events)) {
      try {
        // First delete all existing events
        await db.delete(integrationEvents)
          .where(eq(integrationEvents.integrationId, id));

        // Then create new ones
        const eventEntries = body.events.map((event: { eventType: string; enabled?: boolean; templateData?: any; payloadTemplate?: string }) => {
          // Parse template data to a string if it exists
          const templateDataStr = event.templateData ? 
            JSON.stringify(event.templateData) : null;
          
          return {
            id: randomUUID(),
            integrationId: id,
            eventType: event.eventType,
            enabled: event.enabled ?? true,
            templateData: templateDataStr,
            payloadTemplate: event.payloadTemplate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });

        if (eventEntries.length > 0) {
          await db.insert(integrationEvents).values(eventEntries);
        }
      } catch (err) {
        console.error("Error updating integration events:", err);
        return NextResponse.json(
          { error: "Failed to update integration events" },
          { status: 500 }
        );
      }
    }

    // Get the updated integration
    const updatedIntegration = await db.query.integrations.findFirst({
      where: eq(integrations.id, id),
      with: {
        events: true
      }
    });

    // Log the update result
    console.log("Updated integration:", {
      id: updatedIntegration?.id,
      name: updatedIntegration?.name,
      active: updatedIntegration?.active
    });

    // Decrypt for response
    if (!updatedIntegration) {
      return NextResponse.json(
        { error: "Failed to retrieve updated integration" },
        { status: 500 }
      );
    }

    try {
      const decryptedIntegration = {
        ...updatedIntegration,
        config: JSON.parse(decrypt(updatedIntegration.config)) as IntegrationConfig
      };

      return NextResponse.json(decryptedIntegration);
    } catch (err) {
      console.error("Error decrypting integration config:", err);
      return NextResponse.json(
        { error: "Failed to decrypt integration configuration" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json(
      { error: `Failed to update integration: ${error instanceof Error ? error.message : "Unknown error"}` },
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