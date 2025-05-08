// app/lib/utils/testIntegration.ts

import { triggerEvent } from "../services/integrationService";

export async function testIntegration(userId: string, integrationType: string): Promise<boolean> {
  try {
    // Create test data
    const testData = {
      motorcycle: {
        id: "test-motorcycle-id",
        name: "Test Motorcycle",
        make: "Test Make",
        model: "Test Model",
        year: 2023
      },
      task: {
        id: "test-task-id",
        name: "Test Maintenance Task"
      }
    };
    
    // Trigger a test event
    await triggerEvent(userId, "maintenance_due", testData);
    
    return true;
  } catch (error) {
    console.error("Integration test failed:", error);
    return false;
  }
}