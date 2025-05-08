// app/lib/types/integrations.ts

export type IntegrationType = "webhook" | "homeassistant" | "ntfy";

export interface BaseIntegrationConfig {
  name: string;
  active: boolean;
}

export interface WebhookIntegrationConfig extends BaseIntegrationConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  headers: Record<string, string>;
  authentication?: {
    type: "none" | "basic" | "bearer";
    username?: string;
    password?: string;
    token?: string;
  };
  payloadTemplate?: string;
  useCustomPayload?: boolean; 
}

export interface HomeAssistantIntegrationConfig extends BaseIntegrationConfig {
  baseUrl: string;
  longLivedToken: string;
  entityId?: string;
}

export interface NtfyIntegrationConfig extends BaseIntegrationConfig {
  topic: string;
  server?: string; // Defaults to ntfy.sh if not specified
  priority?: "default" | "low" | "high" | "urgent";
  authorization?: {
    type: "none" | "basic" | "token";
    username?: string;
    password?: string;
    token?: string;
  };
}

export type IntegrationConfig = 
  | WebhookIntegrationConfig 
  | HomeAssistantIntegrationConfig 
  | NtfyIntegrationConfig;

export type EventType = 
  | "maintenance_due" 
  | "maintenance_completed" 
  | "mileage_updated"
  | "motorcycle_added";

export interface IntegrationEventTemplate {
  eventType: EventType;
  enabled: boolean;
  templateData?: any;
}

export interface IntegrationWithEvents {
  id: string;
  userId: string;
  name: string;
  type: IntegrationType;
  active: boolean;
  config: IntegrationConfig;
  events: IntegrationEventTemplate[];
  createdAt: Date;
  updatedAt: Date;
}