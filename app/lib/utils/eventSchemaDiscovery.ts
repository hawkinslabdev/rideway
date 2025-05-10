// app/lib/utils/eventSchemaDiscovery.ts

import { EventType } from "../types/integrations";

// Define schema for each event type
export interface EventSchema {
  description: string;
  fields: EventField[];
}

export interface EventField {
  path: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  example: any;
}

export function isValidEventType(type: string): type is EventType {
  return Object.keys(eventSchemas).includes(type as EventType);
}

export function getSafeEventSchema(eventType: string): EventSchema {
  // Default schema for fallback
  const defaultSchema: EventSchema = {
    description: "Event schema information",
    fields: [
      {
        path: "event",
        type: "string",
        description: "The type of event",
        example: eventType
      },
      {
        path: "timestamp",
        type: "string",
        description: "When the event was triggered",
        example: new Date().toISOString()
      }
    ]
  };
  
  if (isValidEventType(eventType)) {
    return eventSchemas[eventType];
  }
  
  return defaultSchema;
}

// Schema definitions for each event type
export const eventSchemas: Record<EventType, EventSchema> = {
  "maintenance_due": {
    description: "Triggered when maintenance is due for a motorcycle",
    fields: [
      {
        path: "event",
        type: "string",
        description: "The type of event",
        example: "maintenance_due"
      },
      {
        path: "timestamp",
        type: "string",
        description: "When the event was triggered",
        example: new Date().toISOString()
      },
      {
        path: "motorcycle.id",
        type: "string",
        description: "Unique identifier of the motorcycle",
        example: "ab123c-de456f-7890g"
      },
      {
        path: "motorcycle.name",
        type: "string",
        description: "Name of the motorcycle",
        example: "My Ducati"
      },
      {
        path: "motorcycle.make",
        type: "string",
        description: "Manufacturer of the motorcycle",
        example: "Ducati"
      },
      {
        path: "motorcycle.model",
        type: "string",
        description: "Model of the motorcycle",
        example: "Monster 937"
      },
      {
        path: "motorcycle.year",
        type: "number",
        description: "Year of the motorcycle",
        example: 2022
      },
      {
        path: "task.id",
        type: "string",
        description: "Unique identifier of the maintenance task",
        example: "cd456e-fg789h-0123i"
      },
      {
        path: "task.name",
        type: "string",
        description: "Name of the maintenance task",
        example: "Oil Change"
      }
    ]
  },
  "maintenance_completed": {
    description: "Triggered when maintenance is completed for a motorcycle",
    fields: [
      {
        path: "event",
        type: "string",
        description: "The type of event",
        example: "maintenance_completed"
      },
      {
        path: "timestamp",
        type: "string",
        description: "When the event was triggered",
        example: new Date().toISOString()
      },
      {
        path: "motorcycle.id",
        type: "string",
        description: "Unique identifier of the motorcycle",
        example: "ab123c-de456f-7890g"
      },
      {
        path: "motorcycle.name",
        type: "string",
        description: "Name of the motorcycle",
        example: "My Ducati"
      },
      {
        path: "motorcycle.make",
        type: "string",
        description: "Manufacturer of the motorcycle",
        example: "Ducati"
      },
      {
        path: "motorcycle.model",
        type: "string",
        description: "Model of the motorcycle",
        example: "Monster 937"
      },
      {
        path: "motorcycle.year",
        type: "number",
        description: "Year of the motorcycle",
        example: 2022
      },
      {
        path: "task.id",
        type: "string",
        description: "Unique identifier of the maintenance task",
        example: "cd456e-fg789h-0123i"
      },
      {
        path: "task.name",
        type: "string",
        description: "Name of the maintenance task",
        example: "Oil Change"
      },
      {
        path: "record.id",
        type: "string",
        description: "Unique identifier of the maintenance record",
        example: "ef789g-hi012j-3456k"
      },
      {
        path: "record.date",
        type: "string",
        description: "Date when the maintenance was completed",
        example: new Date().toISOString()
      },
      {
        path: "record.mileage",
        type: "number",
        description: "Motorcycle mileage when maintenance was completed",
        example: 5000
      },
      {
        path: "record.cost",
        type: "number",
        description: "Cost of the maintenance",
        example: 85.50
      },
      {
        path: "record.notes",
        type: "string",
        description: "Notes about the maintenance",
        example: "Used synthetic oil"
      }
    ]
  },
  "mileage_updated": {
    description: "Triggered when a motorcycle's mileage is updated",
    fields: [
      {
        path: "event",
        type: "string",
        description: "The type of event",
        example: "mileage_updated"
      },
      {
        path: "timestamp",
        type: "string",
        description: "When the event was triggered",
        example: new Date().toISOString()
      },
      {
        path: "motorcycle.id",
        type: "string",
        description: "Unique identifier of the motorcycle",
        example: "ab123c-de456f-7890g"
      },
      {
        path: "motorcycle.name",
        type: "string",
        description: "Name of the motorcycle",
        example: "My Ducati"
      },
      {
        path: "motorcycle.make",
        type: "string",
        description: "Manufacturer of the motorcycle",
        example: "Ducati"
      },
      {
        path: "motorcycle.model",
        type: "string",
        description: "Model of the motorcycle",
        example: "Monster 937"
      },
      {
        path: "motorcycle.year",
        type: "number",
        description: "Year of the motorcycle",
        example: 2022
      },
      {
        path: "previousMileage",
        type: "number",
        description: "Previous mileage value",
        example: 4500
      },
      {
        path: "newMileage",
        type: "number",
        description: "New updated mileage value",
        example: 5000
      }
    ]
  },
  "motorcycle_added": {
    description: "Triggered when a new motorcycle is added",
    fields: [
      {
        path: "event",
        type: "string",
        description: "The type of event",
        example: "motorcycle_added"
      },
      {
        path: "timestamp",
        type: "string",
        description: "When the event was triggered",
        example: new Date().toISOString()
      },
      {
        path: "id",
        type: "string",
        description: "Unique identifier of the motorcycle",
        example: "ab123c-de456f-7890g"
      },
      {
        path: "name",
        type: "string",
        description: "Name of the motorcycle",
        example: "My Ducati"
      },
      {
        path: "make",
        type: "string",
        description: "Manufacturer of the motorcycle",
        example: "Ducati"
      },
      {
        path: "model",
        type: "string",
        description: "Model of the motorcycle",
        example: "Monster 937"
      },
      {
        path: "year",
        type: "number",
        description: "Year of the motorcycle",
        example: 2022
      },
      {
        path: "vin",
        type: "string",
        description: "VIN of the motorcycle",
        example: "ZDM14BKW9MB123456"
      },
      {
        path: "color",
        type: "string",
        description: "Color of the motorcycle",
        example: "Red"
      }
    ]
  }
};

// Helper to generate a payload example for a specific event type
export function generateExamplePayload(eventType: EventType): any {
  const schema = eventSchemas[eventType];
  if (!schema) return {};
  
  const payload: any = {};
  
  // Build nested objects from the flat field paths
  schema.fields.forEach(field => {
    const pathParts = field.path.split('.');
    let current = payload;
    
    // Build the nested structure
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      
      // If last part, set the example value
      if (i === pathParts.length - 1) {
        current[part] = field.example;
      } 
      // Otherwise create nested object if it doesn't exist
      else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  });
  
  return payload;
}

// Helper to generate default payload templates
export function generateDefaultTemplate(eventType: EventType): string {
  const examplePayload = generateExamplePayload(eventType);
  return JSON.stringify(examplePayload, null, 2);
}