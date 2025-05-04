// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import ClientLayout from "./components/ClientLayout";
import { Bike, Calendar, Wrench, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
  imageUrl: string | null;
}

interface MaintenanceTask {
  id: string;
  motorcycle: string;
  task: string;
  dueDate: string | null;
  dueMileage: number | null;
  priority: string;
  isDue: boolean;
}

interface DashboardData {
  motorcycles: Motorcycle[];
  upcomingMaintenance: MaintenanceTask[];
  overdueCount: number;
}

export default function Home() {
  const [data, setData] = useState<DashboardData>({
    motorcycles: [],
    upcomingMaintenance: [],
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </main>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Motorcycles</h2>
              <Bike className="text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{data.motorcycles.length}</p>
            <p className="text-sm text-gray-500 mt-2">in your garage</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upcoming</h2>
              <Calendar className="text-green-500" />
            </div>
            <p className="text-3xl font-bold">{data.upcomingMaintenance.length}</p>
            <p className="text-sm text-gray-500 mt-2">maintenance tasks</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Overdue</h2>
              <AlertTriangle className="text-red-500" />
            </div>
            <p className="text-3xl font-bold">{data.overdueCount}</p>
            <p className="text-sm text-gray-500 mt-2">maintenance tasks</p>
          </div>
        </div>

        {/* Maintenance Table */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Upcoming Maintenance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">Motorcycle</th>
                  <th className="px-6 py-3 text-left">Task</th>
                  <th className="px-6 py-3 text-left">Due Date</th>
                  <th className="px-6 py-3 text-left">Priority</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.upcomingMaintenance.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{task.motorcycle}</td>
                    <td className="px-6 py-4">{task.task}</td>
                    <td className="px-6 py-4">
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : 
                       task.dueMileage ? `${task.dueMileage} miles` : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : task.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-900">
                        Complete
                      </button>
                    </td>
                  </tr>
                ))}
                {data.upcomingMaintenance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No upcoming maintenance tasks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Motorcycle Cards */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">My Garage</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.motorcycles.map((motorcycle) => (
              <div key={motorcycle.id} className="border rounded-lg overflow-hidden flex flex-col">
                <div className="h-40 bg-gray-200 flex items-center justify-center">
                  {motorcycle.imageUrl ? (
                    <img 
                      src={motorcycle.imageUrl} 
                      alt={motorcycle.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Bike size={64} className="text-gray-400" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{motorcycle.name}</h3>
                  <p className="text-sm text-gray-500">
                    {motorcycle.year} {motorcycle.make} {motorcycle.model}
                  </p>
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Current mileage</p>
                      <p className="font-medium">
                        {motorcycle.currentMileage ? `${motorcycle.currentMileage} miles` : "Not set"}
                      </p>
                    </div>
                    <button 
                      onClick={() => window.location.href = `/garage/${motorcycle.id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {data.motorcycles.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <Bike size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No motorcycles in your garage yet</p>
                <button 
                  onClick={() => window.location.href = "/garage/add"}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Your First Motorcycle
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </ClientLayout>
  );
}