// File: app/lib/utils/notificationTracker.ts

// Modify the in-memory store to track by both task ID and motorcycle ID
// Structure: { key: timestamp }
const recentNotifications: Record<string, number> = {};

// Default cooldown period in milliseconds (5 minutes)
const DEFAULT_COOLDOWN = 5 * 60 * 1000;

// Create a helper to generate consistent tracking keys
export function getEventTrackingKey(entityId: string, eventType: string): string {
  return `${entityId}_${eventType}`;
}

export function canNotifyForTask(taskId: string, cooldownMs = DEFAULT_COOLDOWN): boolean {
  return canTriggerEvent(taskId, 'maintenance_due', cooldownMs);
}

// More generalized function to handle any type of event throttling
export function canTriggerEvent(
  entityId: string, 
  eventType: string, 
  cooldownMs = DEFAULT_COOLDOWN
): boolean {
  const now = Date.now();
  const key = getEventTrackingKey(entityId, eventType);
  const lastNotified = recentNotifications[key] || 0;
  
  // Check if the cooldown period has elapsed
  if (now - lastNotified < cooldownMs) {
    console.log(`Event ${eventType} for entity ${entityId} skipped (in cooldown period)`);
    return false;
  }
  
  // Update the last notification timestamp
  recentNotifications[key] = now;
  return true;
}

// Function to clean up old entries to prevent memory leaks
export function cleanupOldNotifications(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  
  Object.entries(recentNotifications).forEach(([key, timestamp]) => {
    if (now - timestamp > maxAgeMs) {
      delete recentNotifications[key];
    }
  });
}

// Automatically clean up old notifications every hour
setInterval(cleanupOldNotifications, 60 * 60 * 1000);