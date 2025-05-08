// app/components/ClientLayout.tsx
"use client";

import Sidebar from "./Sidebar";
import ScheduledMaintenanceCheck from "./ScheduledMaintenanceCheck";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 w-full overflow-x-hidden">
        {children}
      </main>
      
      {/* Add the scheduled check component */}
      <ScheduledMaintenanceCheck />
    </div>
  );
}