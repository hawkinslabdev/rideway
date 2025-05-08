// app/lib/utils/notificationTracker.ts
// This utility helps prevent duplicate notifications within a short time window

// In-memory store of recent notifications
// Structure: { taskId: timestamp }
const recentNotifications: Record<string, number> = {};

// Default cooldown period in milliseconds (5 minutes)
const DEFAULT_COOLDOWN = 5 * 60 * 1000;

export function canNotifyForTask(taskId: string, cooldownMs = DEFAULT_COOLDOWN): boolean {
  const now = Date.now();
  const lastNotified = recentNotifications[taskId] || 0;
  
  // Check if the cooldown period has elapsed
  if (now - lastNotified < cooldownMs) {
    console.log(`Notification for task ${taskId} skipped (in cooldown period)`);
    return false;
  }
  
  // Update the last notification timestamp
  recentNotifications[taskId] = now;
  return true;
}

// Function to clean up old entries to prevent memory leaks
export function cleanupOldNotifications(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  
  Object.entries(recentNotifications).forEach(([taskId, timestamp]) => {
    if (now - timestamp > maxAgeMs) {
      delete recentNotifications[taskId];
    }
  });
}

// Automatically clean up old notifications every hour
setInterval(cleanupOldNotifications, 60 * 60 * 1000);