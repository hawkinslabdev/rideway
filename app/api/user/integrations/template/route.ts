// File: app/api/user/integrations/templates/route.ts

import { NextResponse } from "next/server";
import { db } from "@/app/lib/db/db";
import { integrationTemplates } from "@/app/lib/db/schema";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

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

    // Get all templates
    const templates = await db.query.integrationTemplates.findMany();

    // Parse the default config JSON
    const parsedTemplates = templates.map(template => ({
      ...template,
      defaultConfig: JSON.parse(template.defaultConfig)
    }));

    return NextResponse.json({ templates: parsedTemplates });
  } catch (error) {
    console.error("Error fetching integration templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration templates" },
      { status: 500 }
    );
  }
}