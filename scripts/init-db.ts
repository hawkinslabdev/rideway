// scripts/init-db.ts
import { db } from "../app/lib/db/db";
import { users, motorcycles, maintenanceTasks, maintenanceRecords } from "../app/lib/db/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const isDevelopment = process.env.NODE_ENV === 'development';

async function initializeDatabase() {
  console.log("Initializing database...");

  try {
    // Check if database is already initialized by checking for users
    const existingUsers = await db.query.users.findMany({ limit: 1 });
    
    if (existingUsers.length > 0) {
      console.log("Database already initialized");
      return;
    }

    // Only create test data in development mode
    if (isDevelopment) {
      console.log("Development mode: Creating test data...");

      // Create a test user
      const hashedPassword = await bcrypt.hash("password123", 10);
      const userId = randomUUID();
      
      await db.insert(users).values({
        id: userId,
        name: "Test User",
        email: "test@example.com",
        password: hashedPassword,
        createdAt: new Date(),
      });

      console.log("Created test user");

      // Create a test motorcycle
      const motorcycleId = randomUUID();
      
      await db.insert(motorcycles).values({
        id: motorcycleId,
        userId: userId,
        name: "My Ducati",
        make: "Ducati",
        model: "Monster 937",
        year: 2022,
        currentMileage: 5000,
        purchaseDate: new Date("2022-01-15"),
        color: "Red",
        vin: "ZDM14BKW9MB123456",
        notes: "First motorcycle",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("Created test motorcycle");

      // Create some maintenance tasks
      const oilChangeTaskId = randomUUID();
      const chainMaintenanceTaskId = randomUUID();

      await db.insert(maintenanceTasks).values([
        {
          id: oilChangeTaskId,
          motorcycleId: motorcycleId,
          name: "Oil Change",
          description: "Change engine oil and filter",
          intervalMiles: 3000,
          intervalDays: 180,
          priority: "high",
          isRecurring: true,
          createdAt: new Date(),
        },
        {
          id: chainMaintenanceTaskId,
          motorcycleId: motorcycleId,
          name: "Chain Maintenance", 
          description: "Clean and lubricate chain",
          intervalMiles: 500,
          intervalDays: 30,
          priority: "medium",
          isRecurring: true,
          createdAt: new Date(),
        },
      ]);

      console.log("Created maintenance tasks");

      // Create a maintenance record
      await db.insert(maintenanceRecords).values({
        id: randomUUID(),
        motorcycleId: motorcycleId,
        taskId: oilChangeTaskId,
        date: new Date("2024-10-15"),
        mileage: 3000,
        cost: 85.50,
        notes: "Used synthetic oil",
        createdAt: new Date(),
      });

      console.log("Created maintenance record");
      console.log("Test data creation complete!");
    } else {
      console.log("Production mode: Skipping test data creation");
    }

    console.log("Database initialization complete!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default initializeDatabase;