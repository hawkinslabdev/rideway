// File: app/components/ScheduledMaintenanceCheck.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export default function ScheduledMaintenanceCheck() {
  const { data: session } = useSession();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  
  // Function to run the check
  const runMaintenanceCheck = async () => {
    if (!session?.user?.id) return;
    
    try {
      // Check if we've made a check in the last hour
      const now = new Date();
      if (lastCheckTime && (now.getTime() - lastCheckTime.getTime() < 3600000)) {
        return; // Skip if we've checked recently
      }
      
      // Make the API call
      const response = await fetch('/api/maintenance/check-due', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.notificationsSent > 0) {
          console.log(`Maintenance check completed, sent ${data.notificationsSent} notifications`);
        } else {
          console.log('Maintenance check completed, no due tasks found');
        }
        
        setLastCheckTime(now);
        
        // Store last check time in localStorage
        localStorage.setItem('lastMaintenanceCheck', now.toISOString());
      }
    } catch (error) {
      console.error('Error running maintenance check:', error);
    }
  };
  
  useEffect(() => {
    // Get the last check time from localStorage
    const storedLastCheck = localStorage.getItem('lastMaintenanceCheck');
    if (storedLastCheck) {
      setLastCheckTime(new Date(storedLastCheck));
    }
    
    // Run the check once when the component mounts 
    // But add a short delay to not block initial page load
    const initialCheckTimeout = setTimeout(() => {
      runMaintenanceCheck();
    }, 5000);
    
    // Set up interval to check periodically (every 15 minutes)
    checkIntervalRef.current = setInterval(runMaintenanceCheck, 15 * 60 * 1000);
    
    // Clean up on unmount
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      clearTimeout(initialCheckTimeout);
    };
  }, [session]);
  
  // This component doesn't render anything
  return null;
}