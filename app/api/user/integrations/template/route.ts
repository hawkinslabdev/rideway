// File: app/api/user/integrations/templates/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

// Default templates for different integration types
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

    // In the future, we could fetch these from the database
    // For now, just return the hardcoded templates
    return NextResponse.json({ templates: defaultTemplates });
  } catch (error) {
    console.error("Error fetching integration templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration templates" },
      { status: 500 }
    );
  }
}