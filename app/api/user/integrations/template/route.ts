// app/api/user/integrations/templates/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { db } from "@/app/lib/db/db";
import { integrationTemplates } from "@/app/lib/db/schema";

// GET: Get all integration templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Try to fetch templates from the database first
    const dbTemplates = await db.query.integrationTemplates.findMany();
    
    if (dbTemplates.length > 0) {
      // Format the templates for the response
      const templates = dbTemplates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type as "webhook" | "homeassistant" | "ntfy",
        defaultConfig: JSON.parse(template.defaultConfig)
      }));
      
      return NextResponse.json({ templates });
    }
    
    // Fallback to default hardcoded templates
    const defaultTemplates = [
      {
        id: "webhook-default",
        name: "Generic Webhook",
        description: "Send notifications to any webhook service",
        type: "webhook",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: {},
          authentication: { type: "none" }
        }
      },
      {
        id: "homeassistant-default",
        name: "Home Assistant",
        description: "Send events to Home Assistant automation platform",
        type: "homeassistant",
        defaultConfig: {
          baseUrl: "http://homeassistant.local:8123",
          longLivedToken: "",
          entityId: ""
        }
      },
      {
        id: "ntfy-default",
        name: "Ntfy Notifications",
        description: "Send push notifications via ntfy.sh",
        type: "ntfy",
        defaultConfig: {
          topic: "rideway-notifications",
          server: "https://ntfy.sh",
          priority: "default",
          authorization: { type: "none" }
        }
      },
      {
        id: "webhook-discord",
        name: "Discord Webhook",
        description: "Send notifications to Discord channels",
        type: "webhook",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          authentication: { type: "none" }
        }
      },
      {
        id: "webhook-slack",
        name: "Slack Webhook",
        description: "Send notifications to Slack channels",
        type: "webhook",
        defaultConfig: {
          url: "",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          authentication: { type: "none" }
        }
      }
    ];
    
    return NextResponse.json({ templates: defaultTemplates });
  } catch (error) {
    console.error("Error fetching integration templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration templates" },
      { status: 500 }
    );
  }
}