// app/components/ClientLayout.tsx
"use client";

import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import Sidebar from "./Sidebar";
import ScheduledMaintenanceCheck from "./ScheduledMaintenanceCheck";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Set up swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedRight: (eventData) => {
      // Only open sidebar if swipe started near the left edge (within 50px)
      if (eventData.initial[0] < 50) {
        setMobileOpen(true);
        
        // Record that user has opened menu before
        if (typeof window !== 'undefined') {
          localStorage.setItem('has-opened-menu', 'true');
        }
      }
    },
    onSwipedLeft: () => {
      if (mobileOpen) {
        setMobileOpen(false);
      }
    },
    trackMouse: false,
    swipeDuration: 250,
    preventScrollOnSwipe: true, 
    delta: 10,
  });

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-100">
      {/* Pass the mobile menu state to your existing Sidebar */}
      <Sidebar 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />
      
      {/* Apply swipe handlers to the main content area */}
      <main 
        className="flex-1 w-full overflow-x-hidden md:pt-0 page-content"
        {...swipeHandlers}
      >
        <div className="md:p-0">
          {children}
        </div>
      </main>
      
      <ScheduledMaintenanceCheck />
    </div>
  );
}