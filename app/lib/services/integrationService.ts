// app/lib/services/integrationService.ts

import { db } from "../db/db";
import { integrations, integrationEvents, integrationEventLogs } from "../db/schema";
import { canTriggerEvent, getEventTrackingKey } from "../utils/notificationTracker";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "../utils/encryption";
import { randomUUID } from "crypto";
import { 
  IntegrationType, 
  IntegrationConfig, 
  WebhookIntegrationConfig,
  HomeAssistantIntegrationConfig,
  NtfyIntegrationConfig,
  EventType
} from "../types/integrations";

// Log integration events for debugging
export async function triggerEvent(userId: string, eventType: string, data: any) {
  try {
    console.log(`[TriggerEvent] Starting: ${eventType}`, { userId, dataKeys: Object.keys(data) });
    
    // Add throttling for mileage_updated events
    if (eventType === 'mileage_updated' && data.motorcycle && data.motorcycle.id) {
      const motorcycleId = data.motorcycle.id;
      
      // Use a shorter cooldown for mileage updates - 10 seconds
      if (!canTriggerEvent(motorcycleId, eventType, 10 * 1000)) {
        console.log(`[TriggerEvent] Skipping duplicate mileage_updated event for motorcycle ${motorcycleId}`);
        return { 
          success: true, 
          message: "Event throttled to prevent duplicates", 
          integrations: 0,
          throttled: true
        };
      }
    }
    // Find all active integrations for this user with this event type
    const userIntegrations = await db.query.integrations.findMany({
      where: eq(integrations.userId, userId),
      with: {
        events: {
          where: and(
            eq(integrationEvents.eventType, eventType),
            eq(integrationEvents.enabled, true)
          )
        }
      }
    });

    console.log(`[TriggerEvent] Found ${userIntegrations.length} total integrations for user`);

    // Filter to only active integrations that have this event type enabled
    const activeIntegrations = userIntegrations.filter(
      integration => integration.active && integration.events.length > 0
    );

    console.log(`[TriggerEvent] Found ${activeIntegrations.length} active integrations for event ${eventType}`);

    if (activeIntegrations.length === 0) {
      console.log(`[TriggerEvent] No active integrations for ${eventType}`);
      return { success: true, message: "No active integrations for this event type", integrations: 0 };
    }
    
    // Process each integration
    const results = await Promise.all(
      activeIntegrations.map(async (integration) => {
        try {
          console.log(`[TriggerEvent] Processing integration: ${integration.id} (${integration.name}) of type ${integration.type}`);
          
          // Decrypt configuration
          let config;
          try {
            config = JSON.parse(decrypt(integration.config));
            console.log(`[TriggerEvent] Successfully decrypted config for integration ${integration.id}`);
          } catch (err) {
            console.error(`[TriggerEvent] Failed to decrypt config for integration ${integration.id}:`, err);
            return {
              integrationId: integration.id,
              success: false,
              message: "Failed to decrypt integration configuration"
            };
          }
          
          // Get the event template data and payload template if available
          const event = integration.events[0];
          let payload = {
            event: eventType,
            timestamp: new Date().toISOString(),
            ...data
          };
          
          // Apply event template data if available
          if (event.templateData) {
            try {
              const template = JSON.parse(event.templateData);
              payload = {
                ...payload,
                ...template
              };
              console.log(`[TriggerEvent] Applied template data for integration ${integration.id}`);
            } catch (err) {
              console.error(`[TriggerEvent] Failed to parse template data for integration ${integration.id}:`, err);
            }
          }
          
          // Apply custom payload template for webhooks if enabled
          if (integration.type === 'webhook' && 
              config.useCustomPayload === true && 
              'payloadTemplate' in event && event.payloadTemplate) {
            try {
              if (typeof event.payloadTemplate === 'string') {
                payload = processTemplate(event.payloadTemplate, payload);
                console.log(`[TriggerEvent] Applied custom payload template for integration ${integration.id}`);
              }
            } catch (err) {
              console.error(`[TriggerEvent] Failed to process payload template for integration ${integration.id}:`, err);
            }
          }
          
          // Send the event based on integration type
          let result;
          try {
            switch(integration.type) {
              case 'webhook':
                result = await sendWebhookEvent(config, payload);
                break;
              case 'homeassistant':
                result = await sendHomeAssistantEvent(config, payload);
                break;
              case 'ntfy':
                result = await sendNtfyEvent(config, payload);
                break;
              default:
                throw new Error(`Unsupported integration type: ${integration.type}`);
            }
            
            console.log(`[TriggerEvent] Integration ${integration.id} result:`, result);

            // Log the event
            try {
              await logIntegrationEvent(
                integration.id,
                eventType as EventType,
                result.success ? "success" : "failed",
                result.message,
                payload,
                result.response
              );
            } catch (err) {
              console.error(`[TriggerEvent] Failed to log event for integration ${integration.id}:`, err);
            }

            return {
              integrationId: integration.id,
              success: result.success,
              message: result.message
            };
          } catch (err) {
            console.error(`[TriggerEvent] Error sending event for integration ${integration.id}:`, err);
            
            // Try to log the error
            try {
              await logIntegrationEvent(
                integration.id,
                eventType as EventType,
                "failed",
                err instanceof Error ? err.message : "Unknown error",
                payload,
                null
              );
            } catch (logErr) {
              console.error(`[TriggerEvent] Failed to log error for integration ${integration.id}:`, logErr);
            }
            
            return {
              integrationId: integration.id,
              success: false,
              message: err instanceof Error ? err.message : "Unknown error"
            };
          }
        } catch (error) {
          console.error(`[TriggerEvent] Unexpected error for integration ${integration.id}:`, error);
          return {
            integrationId: integration.id,
            success: false,
            message: error instanceof Error ? error.message : "Unknown error"
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`[TriggerEvent] Complete: ${eventType} - ${successCount}/${results.length} successful`);

    return {
      success: results.some(r => r.success), // At least one succeeded
      integrations: activeIntegrations.length,
      successful: successCount,
      results
    };
  } catch (error) {
    console.error(`[TriggerEvent] Global error for ${eventType} event:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error",
      integrations: 0
    };
  }
}


function preparePayload(
  type: IntegrationType, 
  config: IntegrationConfig, 
  eventType: EventType, 
  data: any,
  template: any
) {
  // Base payload structure
  const basePayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data
  };

  // Apply template transformations if provided
  let payload = { ...basePayload };
  if (template) {
    // Apply template-specific transformations, which could be expanded for more complex templating
    payload = { ...payload, ...template };
  }

  // Integration-specific payload formatting
  switch (type) {
    case "webhook":
      return payload;
    
    case "homeassistant":
      // For Home Assistant, format as service call
      return {
        ...payload,
        service: "notify.mobile_app",
        data: {
          title: `Rideway ${eventType.replace('_', ' ')}`,
          message: formatEventMessage(eventType, data),
          data: {
            tag: `rideway-${eventType}`,
            group: "rideway",
            ...data
          }
        }
      };
    
    case "ntfy":
      // For Ntfy, format with title and message
      return {
        ...payload,
        title: `Rideway ${eventType.replace('_', ' ')}`,
        message: formatEventMessage(eventType, data),
        tags: ["motorcycle", eventType.split('_')[0]]
      };
    
    default:
      return payload;
  }
}

function processTemplate(template: string, data: any): any {
  try {
    // If template is not a string, return as is
    if (typeof template !== 'string') {
      return data;
    }
    
    let processedTemplate = template;
    
    // Find all {{variable}} patterns
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      const fullMatch = match[0];
      const variablePath = match[1].trim();
      
      // Navigate the data object using the path
      const pathParts = variablePath.split('.');
      let value = { ...data };
      
      for (const part of pathParts) {
        if (value === undefined || value === null) break;
        value = value[part];
      }
      
      // Replace the variable with its value
      if (value !== undefined && value !== null) {
        const stringValue = typeof value === 'object' 
          ? JSON.stringify(value)
          : String(value);
          
        processedTemplate = processedTemplate.replace(fullMatch, stringValue);
      } else {
        // If value not found, replace with empty string
        processedTemplate = processedTemplate.replace(fullMatch, '');
      }
    }
    
    // Try to parse the result as JSON, fall back to string if not valid JSON
    try {
      return JSON.parse(processedTemplate);
    } catch (e) {
      return processedTemplate;
    }
  } catch (error) {
    console.error("Error processing template:", error);
    return data; // Fall back to the original data
  }
}

function formatEventMessage(eventType: EventType, data: any): string {
  switch (eventType) {
    case "maintenance_due":
      return `Maintenance due for ${data.motorcycle.name}: ${data.task.name}`;
    
    case "maintenance_completed":
      return `Maintenance completed for ${data.motorcycle.name}: ${data.task.name}`;
    
    case "mileage_updated":
      return `Mileage updated for ${data.motorcycle.name} to ${data.newMileage} ${data.units}`;
    
    case "motorcycle_added":
      return `New motorcycle added: ${data.name} (${data.year} ${data.make} ${data.model})`;
    
    default:
      return `Rideway event: ${eventType}`;
  }
}

async function sendIntegrationEvent(
  type: IntegrationType, 
  config: IntegrationConfig, 
  payload: any
): Promise<{ success: boolean, message: string, response?: any }> {
  switch (type) {
    case "webhook":
      return await sendWebhookEvent(config as WebhookIntegrationConfig, payload);
    
    case "homeassistant":
      return await sendHomeAssistantEvent(config as HomeAssistantIntegrationConfig, payload);
    
    case "ntfy":
      return await sendNtfyEvent(config as NtfyIntegrationConfig, payload);
    
    default:
      return { 
        success: false, 
        message: `Unsupported integration type: ${type}` 
      };
  }
}

async function sendWebhookEvent(
  config: WebhookIntegrationConfig, 
  payload: any
): Promise<{ success: boolean, message: string, response?: any }> {
  try {
    console.log(`[SendWebhook] Preparing to send webhook to ${config.url}`);
    
    // Process template if custom payload is enabled
    const finalPayload = config.useCustomPayload && config.payloadTemplate 
      ? processTemplate(config.payloadTemplate, payload)
      : payload;
    
    // Create headers object
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {})
    };

    // Add authentication if configured
    if (config.authentication) {
      switch (config.authentication.type) {
        case "basic":
          if (config.authentication.username && config.authentication.password) {
            const authString = Buffer.from(
              `${config.authentication.username}:${config.authentication.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${authString}`;
          }
          break;
        
        case "bearer":
          if (config.authentication.token) {
            headers['Authorization'] = `Bearer ${config.authentication.token}`;
          }
          break;
      }
    }

    console.log(`[SendWebhook] Sending ${config.method} request to ${config.url}`);
    
    // Send the request
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers,
      body: ['GET', 'HEAD'].includes(config.method || 'POST') ? undefined : JSON.stringify(finalPayload)
    });

    // Log response status
    console.log(`[SendWebhook] Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      success: true,
      message: "Webhook delivered successfully",
      response: responseData
    };
  } catch (error) {
    console.error("[SendWebhook] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error sending webhook"
    };
  }
}

async function sendHomeAssistantEvent(
  config: HomeAssistantIntegrationConfig, 
  payload: any
): Promise<{ success: boolean, message: string, response?: any }> {
  try {
    const url = `${config.baseUrl}/api/services/${payload.service}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.longLivedToken}`
      },
      body: JSON.stringify(payload.data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();

    return {
      success: true,
      message: "Home Assistant service call successful",
      response: responseData
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error sending to Home Assistant"
    };
  }
}

async function sendNtfyEvent(
  config: NtfyIntegrationConfig, 
  payload: any
): Promise<{ success: boolean, message: string, response?: any }> {
  try {
    const server = config.server || 'https://ntfy.sh';
    const url = `${server}/${config.topic}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add priority if specified
    if (config.priority) {
      headers['Priority'] = config.priority;
    }

    // Add authorization if configured
    if (config.authorization) {
      switch (config.authorization.type) {
        case "basic":
          if (config.authorization.username && config.authorization.password) {
            const authString = Buffer.from(
              `${config.authorization.username}:${config.authorization.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${authString}`;
          }
          break;
        
        case "token":
          if (config.authorization.token) {
            headers['Authorization'] = `Bearer ${config.authorization.token}`;
          }
          break;
      }
    }

    // Format the payload for ntfy
    const ntfyPayload = {
      topic: config.topic,
      title: payload.title,
      message: payload.message,
      priority: config.priority || 3,
      tags: payload.tags || []
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(ntfyPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return {
      success: true,
      message: "Ntfy notification sent successfully",
      response: await response.text()
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error sending to ntfy"
    };
  }
}

async function logIntegrationEvent(
  integrationId: string,
  eventType: EventType,
  status: string,
  statusMessage: string,
  requestData: any,
  responseData: any
) {
  try {
    // Sanitize sensitive data from request
    const sanitizedRequest = sanitizeData(requestData);

    await db.insert(integrationEventLogs).values({
      id: randomUUID(),
      integrationId,
      eventType,
      status,
      statusMessage,
      requestData: JSON.stringify(sanitizedRequest),
      responseData: responseData ? JSON.stringify(responseData) : null,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error logging integration event:", error);
  }
}

function sanitizeData(data: any): any {
  if (!data) return data;
  
  // Deep clone the data
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Function to recursively sanitize sensitive fields
  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    // List of sensitive field names to sanitize
    const sensitiveFields = [
      'password', 'token', 'secret', 'apiKey', 'apiSecret', 'key',
      'Authorization', 'authorization', 'auth', 'credential'
    ];
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '********';
      }
    }
  };
  
  sanitizeObject(sanitized);
  return sanitized;
}