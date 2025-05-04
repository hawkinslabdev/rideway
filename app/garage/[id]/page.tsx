// app/garage/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Wrench, AlertTriangle, Edit, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import Sidebar from "@/app/components/Sidebar";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  color: string | null;
  purchaseDate: Date | null;
  currentMileage: number | null;
  imageUrl: string | null;
  notes: string | null;
}

interface MaintenanceTask {
  id: string;
  name: string;
  description: string | null;
  intervalMiles: number | null;
  intervalDays: number | null;
  lastCompleted: Date | null;
  lastMileage: number | null;
  dueDate: Date | null;
  dueMileage: number | null;
  priority: string;
}

interface MaintenanceRecord {
  id: string;
  task: string;
  date: Date;
  mileage: number | null;
  cost: number | null;
  notes: string | null;
}

export default function MotorcycleDetail() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<MaintenanceTask[]>([]);
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    const fetchMotorcycleDetails = async () => {
      if (!params.id) return;
      
      try {
        const response = await fetch(`/api/motorcycles/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Motorcycle not found");
          }
          throw new Error("Failed to fetch motorcycle details");
        }
        
        const data = await response.json();
        setMotorcycle(data.motorcycle);
        setMaintenanceSchedule(data.maintenanceSchedule || []);
        setRecentMaintenance(data.recentMaintenance || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMotorcycleDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !motorcycle) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error || "Motorcycle not found"}</p>
            <Link 
              href="/garage" 
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              Back to Garage
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/garage" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} className="mr-1" />
            Back to Garage
          </Link>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{motorcycle.name}</h1>
              <p className="text-gray-600">{motorcycle.make} {motorcycle.model} {motorcycle.year}</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/garage/${motorcycle.id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700"
              >
                <Edit size={16} className="mr-1" />
                Edit
              </Link>
              <button className="p-2 border rounded-md hover:bg-gray-50">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Photo and Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-video bg-gray-200 flex items-center justify-center">
                {motorcycle.imageUrl ? (
                  <img src={motorcycle.imageUrl} alt={motorcycle.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400">No image available</div>
                )}
              </div>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Details</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">VIN</dt>
                    <dd className="mt-1 text-sm text-gray-900">{motorcycle.vin || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Color</dt>
                    <dd className="mt-1 text-sm text-gray-900">{motorcycle.color || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {motorcycle.purchaseDate 
                        ? format(new Date(motorcycle.purchaseDate), "MMMM d, yyyy")
                        : "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Current Mileage</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {motorcycle.currentMileage ? `${motorcycle.currentMileage} miles` : "Not set"}
                    </dd>
                  </div>
                </dl>
                
                {motorcycle.notes && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                    <p className="mt-1 text-sm text-gray-900">{motorcycle.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Maintenance */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Recent Maintenance</h2>
              </div>
              <div className="p-6">
                {recentMaintenance && recentMaintenance.length > 0 ? (
                  <div className="space-y-4">
                    {recentMaintenance.map((record) => (
                      <div key={record.id} className="flex items-start border-b pb-4 last:border-0">
                        <div className="flex-grow">
                          <h4 className="font-medium">{record.task}</h4>
                          <p className="text-sm text-gray-500">
                            {format(new Date(record.date), "MMM d, yyyy")} 
                            {record.mileage && ` • ${record.mileage} miles`}
                          </p>
                          {record.notes && (
                            <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                          )}
                        </div>
                        {record.cost && (
                          <div className="ml-4">
                            <p className="font-medium">${record.cost.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No maintenance records yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Maintenance Schedule */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Maintenance Schedule</h2>
              </div>
              <div className="p-6">
                {maintenanceSchedule && maintenanceSchedule.length > 0 ? (
                  <div className="space-y-4">
                    {maintenanceSchedule.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{task.name}</h4>
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
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {task.dueDate && (
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </div>
                          )}
                          {task.dueMileage && (
                            <div className="flex items-center">
                              <Wrench size={14} className="mr-1" />
                              Or at: {task.dueMileage} miles
                            </div>
                          )}
                        </div>
                        <button className="mt-3 w-full px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                          Mark Complete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No maintenance tasks scheduled</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-left">
                  Update Mileage
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-left">
                  Log Maintenance
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-left">
                  View Full History
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}