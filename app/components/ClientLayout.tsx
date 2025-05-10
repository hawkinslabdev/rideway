// app/components/ClientLayout.tsx
"use client";

import Sidebar from "./Sidebar";
import ScheduledMaintenanceCheck from "./ScheduledMaintenanceCheck";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-100">
      <Sidebar />
      {/* Add spacing classes: px-4 for horizontal padding, space-y-4 for vertical spacing between children */}
      <main className="flex-1 w-full overflow-x-hidden md:pt-0 page-content">
        <div className="md:p-0">
          {children}
        </div>
      </main>
      
      {/* Add the scheduled check component */}
      <ScheduledMaintenanceCheck />
    </div>
  );
}