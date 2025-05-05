// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import ClientLayout from "./components/ClientLayout";
import { Bike, Calendar, Wrench, AlertTriangle, BarChart, Clock, Gauge, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useSettings } from "./contexts/SettingsContext";
import Link from "next/link";

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
  motorcycleId: string;
  task: string;
  dueDate: string | null;
  dueMileage: number | null;
  currentMileage: number | null;
  priority: string;
  isDue: boolean;
}

interface DashboardData {
  motorcycles: Motorcycle[];
  upcomingMaintenance: MaintenanceTask[];
  overdueCount: number;
}

export default function Home() {
  const { formatDistance } = useSettings();
  const [data, setData] = useState<DashboardData>({
    motorcycles: [],
    upcomingMaintenance: [],
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<string>("");
  const [newMileage, setNewMileage] = useState<string>("");

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

  const handleMileageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMotorcycle || !newMileage) return;

    try {
      const response = await fetch(`/api/motorcycles/${selectedMotorcycle}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentMileage: parseInt(newMileage),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update mileage");
      }

      // Refresh dashboard data
      const dashboardResponse = await fetch("/api/dashboard");
      const dashboardData = await dashboardResponse.json();
      setData(dashboardData);
      
      // Reset form and close modal
      setNewMileage("");
      setShowMileageModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mileage");
    }
  };

  const openMileageModal = (motorcycleId: string, currentMileage: number | null) => {
    setSelectedMotorcycle(motorcycleId);
    setNewMileage(currentMileage?.toString() || "");
    setShowMileageModal(true);
  };

  if (loading) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-4 md:p-6">
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
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </main>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-6">Dashboard</h1>

        {/* Context-aware alerts */}
        {data.overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 md:mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  {data.overdueCount} maintenance {data.overdueCount === 1 ? 'task is' : 'tasks are'} overdue
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  Regular maintenance keeps your bike running safely and efficiently.
                </p>
                <Link 
                  href="/maintenance" 
                  className="mt-2 inline-flex items-center text-sm font-medium text-red-800 hover:text-red-900"
                >
                  View overdue tasks
                  <ArrowRight size={14} className="ml-1" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Panel */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 md:mb-6">
          <h2 className="text-base font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {data.motorcycles.length === 0 ? (
              <Link 
                href="/garage/add" 
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Bike size={18} className="mr-2" />
                Add Your First Motorcycle
              </Link>
            ) : (
              <>
                <Link 
                  href="/garage/add" 
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <Bike size={16} className="mr-1.5" />
                  Add Motorcycle
                </Link>
                <button 
                  onClick={() => openMileageModal(data.motorcycles[0].id, data.motorcycles[0].currentMileage)}
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <Gauge size={16} className="mr-1.5" />
                  Update Mileage
                </button>
                <Link 
                  href="/maintenance/add" 
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <Wrench size={16} className="mr-1.5" />
                  Add Maintenance
                </Link>
                <Link 
                  href="/history" 
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <BarChart size={16} className="mr-1.5" />
                  Service History
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Maintenance Status Indicator */}
        {data.upcomingMaintenance.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-4 md:mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Maintenance Status</h2>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${data.overdueCount > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${100 - (data.overdueCount / data.upcomingMaintenance.length * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.overdueCount === 0 
                ? "All maintenance up to date" 
                : `${data.overdueCount} of ${data.upcomingMaintenance.length} tasks need attention`}
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <h2 className="text-base md:text-lg font-semibold">Motorcycles</h2>
              <Bike className="text-blue-500" size={20} />
            </div>
            <p className="text-2xl md:text-3xl font-bold">{data.motorcycles.length}</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">in your garage</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <h2 className="text-base md:text-lg font-semibold">Upcoming</h2>
              <Calendar className="text-green-500" size={20} />
            </div>
            <p className="text-2xl md:text-3xl font-bold">{data.upcomingMaintenance.length}</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">maintenance tasks</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <h2 className="text-base md:text-lg font-semibold">Overdue</h2>
              <AlertTriangle className="text-red-500" size={20} />
            </div>
            <p className="text-2xl md:text-3xl font-bold">{data.overdueCount}</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">maintenance tasks</p>
          </div>
        </div>

        {/* Maintenance Table - Responsive Mobile Design */}
        <div className="bg-white rounded-lg shadow mb-4 md:mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-base md:text-lg font-semibold">Upcoming Maintenance</h2>
            <Link 
              href="/maintenance" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All
            </Link>
          </div>
          
          {/* Mobile List View (visible on small screens) */}
          <div className="sm:hidden">
            {data.upcomingMaintenance.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {data.upcomingMaintenance.map((task) => (
                  <div key={task.id} className={`p-4 ${task.isDue ? 'bg-red-50' : ''}`}>
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium text-sm">{task.task}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : task.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{task.motorcycle}</p>
                    <div className="flex flex-col space-y-1 mb-3 text-xs">
                      {task.dueDate && (
                        <div className="flex items-center">
                          <Clock size={12} className="mr-1 text-gray-500" />
                          <span>{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                      {task.dueMileage && (
                        <div className="flex items-center">
                          <Gauge size={12} className="mr-1 text-gray-500" />
                          <span>{formatDistance(task.dueMileage)}</span>
                        </div>
                      )}
                    </div>
                    <Link 
                      href={`/maintenance/${task.id}/complete`}
                      className={`text-xs px-3 py-1.5 rounded-md inline-block ${
                        task.isDue 
                          ? "bg-red-600 text-white hover:bg-red-700" 
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {task.isDue ? "Overdue - Complete" : "Complete"}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No upcoming maintenance tasks
              </div>
            )}
          </div>
          
          {/* Desktop Table View (hidden on small screens) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">Motorcycle</th>
                  <th className="px-6 py-3 text-left">Task</th>
                  <th className="px-6 py-3 text-left">Due Date</th>
                  <th className="px-6 py-3 text-left">Due Mileage</th>
                  <th className="px-6 py-3 text-left">Priority</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.upcomingMaintenance.map((task) => (
                  <tr key={task.id} className={`hover:bg-gray-50 ${task.isDue ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">{task.motorcycle}</td>
                    <td className="px-6 py-4">{task.task}</td>
                    <td className="px-6 py-4">
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {task.dueMileage ? formatDistance(task.dueMileage) : "N/A"}
                      {task.currentMileage && task.dueMileage && (
                        task.currentMileage < task.dueMileage ? 
                          ` (${formatDistance(task.dueMileage - task.currentMileage)} left)` : 
                          ` (${formatDistance(task.currentMileage - task.dueMileage)} overdue)`
                      )}
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
                      <Link 
                        href={`/maintenance/${task.id}/complete`}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${
                          task.isDue 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : "text-blue-600 hover:text-blue-900"
                        }`}
                      >
                        {task.isDue ? "Overdue - Complete" : "Complete"}
                      </Link>
                    </td>
                  </tr>
                ))}
                {data.upcomingMaintenance.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No upcoming maintenance tasks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Motorcycles Grid - Responsive Design */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-base md:text-lg font-semibold">My Garage</h2>
            <Link 
              href="/garage" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All
            </Link>
          </div>
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {data.motorcycles.map((motorcycle) => {
              // Find maintenance tasks for this bike
              const motorcycleTasks = data.upcomingMaintenance.filter(
                task => task.motorcycleId === motorcycle.id
              );
              const hasDueTasks = motorcycleTasks.some(task => task.isDue);
              
              return (
                <div 
                  key={motorcycle.id} 
                  className={`border rounded-lg overflow-hidden flex flex-col ${
                    hasDueTasks ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <div className="h-32 md:h-40 bg-gray-200 flex items-center justify-center">
                    {motorcycle.imageUrl ? (
                      <img 
                        src={motorcycle.imageUrl} 
                        alt={motorcycle.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Bike size={48} className="text-gray-400" />
                    )}
                  </div>
                  
                  {/* Add maintenance summary badge if needed */}
                  {hasDueTasks && (
                    <div className="bg-red-100 px-4 py-1.5 text-xs">
                      <span className="font-medium text-red-800">
                        {motorcycleTasks.filter(t => t.isDue).length} maintenance {motorcycleTasks.filter(t => t.isDue).length === 1 ? 'task' : 'tasks'} due
                      </span>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-base md:text-lg">{motorcycle.name}</h3>
                    <p className="text-xs md:text-sm text-gray-500">
                      {motorcycle.year} {motorcycle.make} {motorcycle.model}
                    </p>
                    <div className="mt-3 md:mt-4 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">Current mileage</p>
                        <p className="font-medium text-sm">
                          {motorcycle.currentMileage ? formatDistance(motorcycle.currentMileage) : "Not set"}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openMileageModal(motorcycle.id, motorcycle.currentMileage)}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs md:text-sm hover:bg-gray-300"
                        >
                          Update
                        </button>
                        <Link
                          href={`/garage/${motorcycle.id}`}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs md:text-sm hover:bg-blue-700"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {data.motorcycles.length === 0 && (
              <div className="col-span-full text-center py-8 md:py-12">
                <Bike size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No motorcycles in your garage yet</p>
                <Link
                  href="/garage/add"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Add Your First Motorcycle
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mileage Update Modal */}
        {showMileageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium mb-4">Update Mileage</h3>
              <form onSubmit={handleMileageUpdate}>
                <div className="mb-4">
                  <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Mileage
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="mileage"
                      id="mileage"
                      required
                      min="0"
                      step="1"
                      value={newMileage}
                      onChange={(e) => setNewMileage(e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter current mileage"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">
                        {formatDistance(1).split(' ')[1]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowMileageModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </ClientLayout>
  );
}