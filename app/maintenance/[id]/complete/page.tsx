// app/maintenance/[id]/complete/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ClientLayout from "../../../components/ClientLayout";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Calendar, Info, Settings } from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { DistanceUtil } from "../../../lib/utils/distance";
import { format, formatDistanceToNow } from "date-fns";

interface MaintenanceTask {
  id: string;
  task: string;
  description: string | null;
  motorcycle: string;
  motorcycleId: string;
  
  // Enhanced fields
  intervalMiles: number | null;
  intervalDays: number | null;
  dueDate: string | null;
  dueMileage: number | null;
  currentMileage: number | null;
  remainingMiles: number | null;
  completionPercentage: number | null;
  
  // Last maintenance info
  lastCompletedDate: string | null;
  lastCompletedMileage: number | null;
}

export default function CompleteMaintenancePage() {
  const params = useParams();
  const router = useRouter();
  const { settings, getUnitsLabel } = useSettings();
  const unitLabel = getUnitsLabel().distance;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const [formData, setFormData] = useState({
    mileage: "",
    cost: "",
    notes: "",
    receiptUrl: "",
    resetSchedule: true, // Default to resetting the maintenance schedule
  });

  useEffect(() => {
    const fetchTask = async () => {
      if (!params.id) return;
      
      try {
        // First get all maintenance tasks to find this specific one
        const response = await fetch("/api/maintenance");
        
        if (!response.ok) {
          throw new Error("Failed to fetch maintenance tasks");
        }
        
        const data = await response.json();
        const foundTask = data.tasks.find((t: MaintenanceTask) => t.id === params.id);
        
        if (!foundTask) {
          throw new Error("Maintenance task not found");
        }
        
        setTask(foundTask);

        // Pre-fill mileage if available - convert from storage units (km) to display units
        if (foundTask.currentMileage) {
          // We need to convert the storage value (km) to the display units
          const displayMileage = DistanceUtil.toDisplayUnits(
            foundTask.currentMileage, 
            settings.units
          );
          
          setFormData(prev => ({
            ...prev,
            mileage: displayMileage?.toString() || ""
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [params.id, settings.units]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateMileage = (mileage: number | null, currentMileage: number | null): boolean => {
    // If we don't have mileage input or current motorcycle mileage to validate against, allow it
    if (mileage === null || currentMileage === null) {
      return true;
    }
    
    // When storing a new record, the mileage should be at least equal to current mileage
    // (Allow equal for cases where maintenance is performed but odometer doesn't change)
    return mileage >= currentMileage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!task) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Convert display mileage to storage units (km)
      const displayMileage = DistanceUtil.parseInput(formData.mileage);
      const storageMileage = DistanceUtil.toStorageUnits(displayMileage, settings.units);
      
      // Validate that the mileage makes sense (should be at least the current mileage)
      if (storageMileage !== null && task.currentMileage !== null) {
        if (!validateMileage(storageMileage, task.currentMileage)) {
          throw new Error(`Mileage cannot be less than the current motorcycle mileage (${
            DistanceUtil.format(task.currentMileage, settings.units)
          })`);
        }
      }
      
      const response = await fetch(`/api/maintenance/${task.id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mileage: storageMileage, // Always send storage units (km) to API
          cost: formData.cost ? parseFloat(formData.cost) : null,
          notes: formData.notes || `Completed ${task.task}`,
          receiptUrl: formData.receiptUrl || null,
          resetSchedule: formData.resetSchedule // Send the user's choice about resetting the schedule
        }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to complete maintenance" }));
        throw new Error(data.error || "Failed to complete maintenance");
      }
      
      // Redirect back to maintenance page
      router.push("/maintenance?completed=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  // Helper to render maintenance status info 
  const renderMaintenanceInfo = () => {
    if (!task) return null;
    
    return (
      <div className="my-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Maintenance Status</h3>
        
        <div className="space-y-2 text-sm">
          {/* Interval Information */}
          <div>
            <span className="text-gray-600">Interval: </span>
            <span className="font-medium">
              {task.intervalMiles ? DistanceUtil.format(task.intervalMiles, settings.units) : ''}
              {task.intervalMiles && task.intervalDays ? ' or ' : ''}
              {task.intervalDays ? `${task.intervalDays} days` : ''}
            </span>
          </div>
          
          {/* Due Information */}
          <div>
            <span className="text-gray-600">Due at: </span>
            <span className="font-medium">
              {task.dueMileage ? DistanceUtil.format(task.dueMileage, settings.units) : 'N/A'}
              {task.dueDate ? ` or ${format(new Date(task.dueDate), 'MMM d, yyyy')}` : ''}
            </span>
          </div>
          
          {/* Remaining */}
          {task.remainingMiles !== null && (
            <div>
              <span className="text-gray-600">Remaining: </span>
              <span className="font-medium">
                {task.remainingMiles > 0 
                  ? DistanceUtil.format(task.remainingMiles, settings.units)
                  : "Overdue"
                }
              </span>
            </div>
          )}
          
          {/* Completion Percentage */}
          {task.completionPercentage !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress toward next service</span>
                <span>{Math.round(task.completionPercentage)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    task.completionPercentage >= 90 ? 'bg-red-500' : 
                    task.completionPercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, task.completionPercentage)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Last completed information */}
          {(task.lastCompletedDate || task.lastCompletedMileage) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-gray-600">Last completed: </span>
              <span className="font-medium">
                {task.lastCompletedDate ? format(new Date(task.lastCompletedDate), 'MMM d, yyyy') : ''}
                {task.lastCompletedMileage ? 
                  (task.lastCompletedDate ? ' at ' : '') + 
                  DistanceUtil.format(task.lastCompletedMileage, settings.units) 
                  : ''
                }
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (isLoading) {
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
  
  if (error || !task) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="flex mb-4">
            <Link href="/maintenance" className="flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft size={16} className="mr-1" />
              Back to Maintenance
            </Link>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error || "Maintenance task not found"}</p>
            </div>
          </div>
        </main>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/maintenance" className="flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft size={16} className="mr-1" />
              Back to Maintenance
            </Link>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <h1 className="text-xl font-bold">Complete Maintenance Task</h1>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">{task.task}</h2>
                <p className="text-gray-600">For {task.motorcycle}</p>
                {task.description && (
                  <p className="mt-2 text-gray-700">{task.description}</p>
                )}
              </div>
              
              {/* Maintenance Status Information */}
              {renderMaintenanceInfo()}
              
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-red-800">{error}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">
                    Current Odometer ({unitLabel})
                  </label>
                  <input
                    type="number"
                    name="mileage"
                    id="mileage"
                    value={formData.mileage}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder={`Current odometer reading (${unitLabel})`}
                  />
                  {task.currentMileage && (
                    <p className="mt-1 text-xs text-gray-500">
                      Current motorcycle mileage: {DistanceUtil.format(task.currentMileage, settings.units)}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
                    Cost (Optional)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="cost"
                      id="cost"
                      step="0.01"
                      value={formData.cost}
                      onChange={handleChange}
                      className="block w-full pl-7 pr-12 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter any details about the maintenance performed"
                  />
                </div>
                
                {/* Maintenance Schedule Options */}
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-start mb-2">
                    <Settings size={18} className="text-blue-600 mr-2 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">Maintenance Schedule</h3>
                      <p className="text-xs text-blue-600 mt-1">
                        Choose how to schedule the next maintenance
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowInfoModal(true)}
                      className="ml-auto p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Info size={16} />
                    </button>
                  </div>
                  
                  <div className="mt-3 space-y-3">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="resetSchedule-true"
                          name="resetSchedule"
                          type="radio"
                          checked={formData.resetSchedule === true}
                          onChange={() => setFormData(prev => ({ ...prev, resetSchedule: true }))}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="resetSchedule-true" className="font-medium text-gray-700">
                          Reset schedule
                        </label>
                        <p className="text-gray-500">
                          Calculate the next due maintenance from today's values
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="resetSchedule-false"
                          name="resetSchedule"
                          type="radio"
                          checked={formData.resetSchedule === false}
                          onChange={() => setFormData(prev => ({ ...prev, resetSchedule: false }))}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="resetSchedule-false" className="font-medium text-gray-700">
                          Maintain original schedule
                        </label>
                        <p className="text-gray-500">
                          {task.dueMileage && task.remainingMiles && task.remainingMiles > 0 
                            ? `Keep next service due at ${DistanceUtil.format(task.dueMileage, settings.units)}`
                            : "Adjust for next interval from original schedule"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="receiptUrl" className="block text-sm font-medium text-gray-700">
                    Receipt URL (Optional)
                  </label>
                  <input
                    type="text"
                    name="receiptUrl"
                    id="receiptUrl"
                    value={formData.receiptUrl}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="URL to receipt or invoice"
                  />
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Complete
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Info Modal */}
        {showInfoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Info size={20} className="text-blue-600 mr-2" />
                Maintenance Scheduling Options
              </h3>
              <div className="space-y-4 text-sm">
                <p>
                  <strong>Reset schedule:</strong> This option recalculates the next maintenance due date based on today's odometer reading. 
                  Choose this when you want to start a fresh maintenance cycle.
                </p>
                <p>
                  <strong>Maintain original schedule:</strong> This preserves the original maintenance schedule. 
                  If you're doing maintenance early, the next due date will remain unchanged. 
                  If you're doing maintenance late, it will adjust to keep you on the correct interval cycle.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ClientLayout>
  );
}