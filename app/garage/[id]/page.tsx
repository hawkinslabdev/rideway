// app/garage/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Archive,
  ArrowLeft, 
  Calendar, 
  Wrench, 
  Edit, 
  Clock,
  Info,
  FileText,
  Gauge,
  DollarSign,
  Bike
} from "lucide-react";
import { format } from "date-fns";
import ClientLayout from "@/app/components/ClientLayout";
import { useSettings } from "@/app/contexts/SettingsContext";
import MaintenanceTimeline from "../../components/MaintenanceTimeline";

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
  isOwned: boolean | null;
  isDefault: boolean | null;
  notes: string | null;
}

interface MaintenanceTask {
  isDue: any;
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

interface ActivityLog {
  id: string;
  type: 'maintenance' | 'mileageUpdate' | 'taskAdded';
  date: Date;
  description: string;
  details?: any;
}

type TabType = 'activity' | 'maintenance' | 'costs';

export default function MotorcycleDetail() {
  const params = useParams();
  const router = useRouter();
  const { formatDistance } = useSettings();
  
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<MaintenanceTask[]>([]);
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRecord[]>([]);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [newMileage, setNewMileage] = useState<string>("");
  
  // Activity logs would normally come from API, but we'll generate them from maintenance data
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const fetchMotorcycleDetails = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
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
        
        // Initialize mileage input with current value
        if (data.motorcycle.currentMileage) {
          setNewMileage(data.motorcycle.currentMileage.toString());
        }
        
        // Generate activity logs from maintenance records
        if (data.recentMaintenance) {
          const logs = [];
          
          // Add maintenance records as activity
          data.recentMaintenance.forEach((record: MaintenanceRecord) => {
            logs.push({
              id: record.id,
              type: 'maintenance' as const,
              date: new Date(record.date),
              description: `Performed ${record.task}`,
              details: {
                task: record.task,
                mileage: record.mileage,
                cost: record.cost,
                notes: record.notes
              }
            });
          });
          
          // Add motorcycle creation date as an activity
          if (data.motorcycle.createdAt) {
            logs.push({
              id: 'creation',
              type: 'mileageUpdate' as const,
              date: new Date(data.motorcycle.createdAt),
              description: "Motorcycle added to garage",
              details: {
                mileage: data.motorcycle.currentMileage
              }
            });
          }
          
          // Sort by date, most recent first
          logs.sort((a, b) => b.date.getTime() - a.date.getTime());
          
          setActivityLogs(logs);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMotorcycleDetails();
  }, [params.id]);
  
  const handleToggleOwnership = async () => {
    if (!motorcycle) return;
    
    try {
      const response = await fetch("/api/motorcycles/ownership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          motorcycleId: motorcycle.id, 
          isOwned: !motorcycle.isOwned 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update ownership status");
      }
      
      // Refresh the motorcycle data
      const refreshResponse = await fetch(`/api/motorcycles/${motorcycle.id}`);
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        setMotorcycle(refreshedData.motorcycle);
      }
      
      setShowOwnershipModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ownership status");
    }
  };

  const handleMileageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motorcycle) return;
    
    try {
      // Store previous mileage for logging
      const previousMileage = motorcycle.currentMileage;
      
      const response = await fetch(`/api/motorcycles/${motorcycle.id}`, {
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
      
      await fetch("/api/motorcycles/mileage-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId: motorcycle.id,
          previousMileage: motorcycle.currentMileage,
          newMileage: parseInt(newMileage),
          notes: `Updated mileage from ${formatDistance(motorcycle.currentMileage || 0)} to ${formatDistance(parseInt(newMileage))}`
        }),
      });

      // Add the mileage update to activity logs with improved detail
      const newLog: ActivityLog = {
        id: `mileage-${Date.now()}`,
        type: 'mileageUpdate',
        date: new Date(),
        description: `Updated mileage from ${formatDistance(previousMileage || 0)} to ${formatDistance(parseInt(newMileage))}`,
        details: {
          previousMileage: previousMileage,
          newMileage: parseInt(newMileage),
          difference: previousMileage !== null ? parseInt(newMileage) - previousMileage : null
        }
      };
      
      setActivityLogs([newLog, ...activityLogs]);
      
      // Update local state with new mileage
      setMotorcycle(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentMileage: parseInt(newMileage),
        };
      });
      
      // Close modal
      setShowMileageModal(false);
      
      // Refresh maintenance schedule since due dates might change based on mileage
      const refreshData = await fetch(`/api/motorcycles/${params.id}`);
      const refreshedData = await refreshData.json();
      setMaintenanceSchedule(refreshedData.maintenanceSchedule || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mileage");
    }
  };

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

  if (error || !motorcycle) {
    return (
      <ClientLayout>
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
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/garage" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} className="mr-1" />
            Back to Garage
          </Link>
        </div>
        
        {/* Motorcycle Profile Panel */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-6 md:flex">
            {/* Motorcycle Image */}
            <div className="md:w-1/3 mb-4 md:mb-0 md:mr-6">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                {motorcycle.imageUrl ? (
                  <img src={motorcycle.imageUrl} alt={motorcycle.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                    <Bike size={48} className="mb-2" />
                    <p>No image available</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Motorcycle Details */}
            <div className="md:w-2/3 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{motorcycle.name}</h1>
                  <p className="text-lg text-gray-600">{motorcycle.make} {motorcycle.model} {motorcycle.year}</p>
                </div>
                
                <div className="mt-2 sm:mt-0 flex space-x-2">
                  <button 
                    onClick={() => setShowMileageModal(true)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md flex items-center hover:bg-gray-200 text-sm"
                  >
                    <Gauge size={16} className="mr-1" />
                    Update Mileage
                  </button>
                  <button 
                    onClick={() => setShowOwnershipModal(true)}
                    className={`px-3 py-1.5 ${
                      motorcycle.isOwned 
                        ? "bg-gray-100 text-gray-700" 
                        : "bg-blue-100 text-blue-700"
                    } rounded-md flex items-center hover:bg-gray-200 text-sm ml-2`}
                  >
                    <Archive size={16} className="mr-1" />
                    {motorcycle.isOwned ? "Archive" : "Restore"}
                  </button>
                  <Link
                    href={`/garage/${motorcycle.id}/edit`}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 text-sm"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </Link>
                </div>
              </div>
              
              {/* Quick Details */}
              <div className="flex-grow">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-xs text-gray-500">VIN</p>
                    <p className="font-medium">{motorcycle.vin || "Not provided"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-xs text-gray-500">Color</p>
                    <p className="font-medium">{motorcycle.color || "Not provided"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-xs text-gray-500">Current Mileage</p>
                    <p className="font-medium">{motorcycle.currentMileage ? formatDistance(motorcycle.currentMileage) : "Not set"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-xs text-gray-500">Purchase Date</p>
                    <p className="font-medium">
                      {motorcycle.purchaseDate 
                        ? format(new Date(motorcycle.purchaseDate), "MMM d, yyyy")
                        : "Not provided"}
                    </p>
                  </div>
                </div>
                
                {motorcycle.notes && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-sm mt-1">{motorcycle.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white shadow rounded-t-lg border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 font-medium text-sm focus:outline-none ${
                activeTab === 'activity' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Recent Activity
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-6 py-3 font-medium text-sm focus:outline-none ${
                activeTab === 'maintenance' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Maintenance Schedule
            </button>
            <button
              onClick={() => setActiveTab('costs')}
              className={`px-6 py-3 font-medium text-sm focus:outline-none ${
                activeTab === 'costs' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Costs
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-b-lg p-6 mb-6">
          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Recent Activity</h2>
                <Link 
                  href={`/maintenance/add?motorcycle=${motorcycle.id}`}
                  className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <Wrench size={16} className="mr-1.5" />
                  Log Maintenance
                </Link>
              </div>
              
              {activityLogs.length > 0 ? (
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  {/* Timeline Items */}
                  <div className="space-y-4">
                    {activityLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="relative pl-10">
                        {/* Timeline Icon */}
                        <div className="absolute left-0 p-1 rounded-full bg-white border-2 border-blue-500">
                          {log.type === 'maintenance' && <Wrench size={14} className="text-blue-500" />}
                          {log.type === 'mileageUpdate' && <Gauge size={14} className="text-blue-500" />}
                          {log.type === 'taskAdded' && <Calendar size={14} className="text-blue-500" />}
                        </div>
                        
                        {/* Event Content */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex flex-wrap justify-between mb-1">
                            <h3 className="font-medium">{log.description}</h3>
                            <time className="text-xs text-gray-500">
                              {format(new Date(log.date), "MMM d, yyyy")}
                            </time>
                          </div>
                          
                          {log.type === 'maintenance' && log.details && (
                            <div className="text-sm">
                              {log.details.mileage && <p>Mileage: {formatDistance(log.details.mileage)}</p>}
                              {log.details.cost && <p>Cost: ${log.details.cost.toFixed(2)}</p>}
                              {log.details.notes && <p className="text-gray-600 mt-1">{log.details.notes}</p>}
                            </div>
                          )}
                          
                          {log.type === 'mileageUpdate' && log.details && (
                            <div className="text-sm">
                              {log.details.mileage && <p>Mileage: {formatDistance(log.details.mileage)}</p>}
                              {log.details.previousMileage && log.details.newMileage && (
                                <p>
                                  Updated from {formatDistance(log.details.previousMileage)} to {formatDistance(log.details.newMileage)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {activityLogs.length > 5 && (
                    <div className="mt-4 text-center">
                      <Link
                        href={`/history?motorcycle=${motorcycle.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View More Activity
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 mb-4">No activity has been logged yet</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link
                      href={`/maintenance/add?motorcycle=${motorcycle.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center justify-center"
                    >
                      <Wrench size={16} className="mr-2" />
                      Log Maintenance
                    </Link>
                    <button
                      onClick={() => setShowMileageModal(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 inline-flex items-center justify-center"
                    >
                      <Gauge size={16} className="mr-2" />
                      Update Mileage
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Schedule Tab */}
          {activeTab === 'maintenance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Maintenance Schedule</h2>
                <Link
                  href={`/maintenance/add?motorcycle=${motorcycle.id}`}
                  className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <Calendar size={16} className="mr-1.5" />
                  Add Task
                </Link>
              </div>
              
              {maintenanceSchedule && maintenanceSchedule.length > 0 ? (
                <div className="space-y-6">
                  {/* Visual timeline component */}
                  <MaintenanceTimeline 
                    motorcycleId={motorcycle.id}
                    tasks={maintenanceSchedule.map(task => ({
                      id: task.id,
                      task: task.name,
                      description: task.description,
                      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
                      dueMileage: task.dueMileage,
                      priority: task.priority,
                      isDue: task.isDue,
                      currentMileage: motorcycle.currentMileage
                    }))}
                    currentMileage={motorcycle.currentMileage}
                    milesPerDay={30} // You can adjust this or make it a user setting
                  />
                  
                  {/* Original task cards */}
                  <div className="mt-6 border-t pt-6">
                    <h3 className="text-md font-medium mb-3">All Maintenance Tasks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {maintenanceSchedule.map((task) => (
                        <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition">
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
                          
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                          )}
                          
                          <div className="text-sm text-gray-600 space-y-1 mb-3">
                            {task.dueDate && (
                              <div className="flex items-center">
                                <Calendar size={14} className="mr-1" />
                                Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                              </div>
                            )}
                            {task.dueMileage && (
                              <div className="flex items-center">
                                <Wrench size={14} className="mr-1" />
                                Or at: {formatDistance(task.dueMileage)}
                              </div>
                            )}
                            
                            {task.lastCompleted && (
                              <div className="flex items-center text-xs text-gray-500 mt-2">
                                <Clock size={12} className="mr-1" />
                                Last done: {format(new Date(task.lastCompleted), "MMM d, yyyy")}
                                {task.lastMileage && ` at ${formatDistance(task.lastMileage)}`}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <Link 
                              href={`/maintenance/${task.id}/complete`}
                              className="flex-1 text-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                            >
                              Mark Complete
                            </Link>
                            <Link
                              href={`/maintenance/${task.id}/edit`}
                              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                            >
                              Edit
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 mb-4">No maintenance tasks scheduled yet</p>
                  <Link
                    href={`/maintenance/add?motorcycle=${motorcycle.id}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Calendar size={16} className="mr-2" />
                    Add First Maintenance Task
                  </Link>
                </div>
              )}
              
              {maintenanceSchedule && maintenanceSchedule.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <Link
                    href={`/maintenance?motorcycle=${motorcycle.id}`}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                  >
                    View All Maintenance Tasks
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Costs Tab */}
          {activeTab === 'costs' && (
            <div className="flex flex-col items-center justify-center py-8">
              <DollarSign size={48} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">Cost Tracking Coming Soon</h3>
              <p className="text-gray-500 max-w-md text-center mb-6">
                Track all your maintenance costs, fuel expenses, and other motorcycle-related spending
                in one place.
              </p>
              <div className="bg-gray-50 rounded-lg p-6 w-full max-w-lg">
                <h4 className="font-medium mb-2 text-gray-700">Currently Available</h4>
                <p className="text-sm text-gray-600 mb-4">
                  While we're working on a dedicated cost tracking feature, you can still track maintenance 
                  costs in the maintenance records.
                </p>
                <Link
                  href={`/maintenance/add?motorcycle=${motorcycle.id}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Wrench size={16} className="mr-2" />
                  Add Maintenance Record
                </Link>
              </div>
            </div>
          )}
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
                      min={motorcycle.currentMileage || 0}
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
                  {motorcycle.currentMileage && (
                    <p className="mt-1 text-xs text-gray-500">
                      Current reading: {formatDistance(motorcycle.currentMileage)}
                    </p>
                  )}
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

        {/* Ownership Modal */}
        {showOwnershipModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium mb-2">
                {motorcycle.isOwned ? "Archive Motorcycle" : "Restore Motorcycle"}
              </h3>
              <p className="text-gray-600 mb-4">
                {motorcycle.isOwned
                  ? "Archiving will mark this motorcycle as no longer owned. It will still appear in your service history but will be hidden from the main garage view."
                  : "Restoring will mark this motorcycle as currently owned and make it visible in your garage again."}
              </p>
              
              {motorcycle.isOwned && motorcycle.isDefault && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                  <strong>Note:</strong> This motorcycle is currently set as your default. Archiving it will remove this status.
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowOwnershipModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleOwnership}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    motorcycle.isOwned
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {motorcycle.isOwned ? "Archive Motorcycle" : "Restore Motorcycle"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ClientLayout>
  );
}