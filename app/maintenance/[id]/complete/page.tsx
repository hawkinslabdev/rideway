// app/maintenance/[id]/complete/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ClientLayout from "../../../components/ClientLayout";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { DistanceUtil } from "../../../lib/utils/distance";

interface MaintenanceTask {
  id: string;
  task: string;
  description: string | null;
  motorcycle: string;
  motorcycleId: string;
  dueDate: string | null;
  dueMileage: number | null;
  currentMileage: number | null;
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
  
  const [formData, setFormData] = useState({
    mileage: "",
    cost: "",
    notes: "",
    receiptUrl: ""
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
          receiptUrl: formData.receiptUrl || null
        }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to complete maintenance" }));
        throw new Error(data.error || "Failed to complete maintenance");
      }
      
      // If record is created successfully and the mileage is higher than current motorcycle mileage,
      // update the motorcycle's current mileage as well
      if (storageMileage !== null && task.currentMileage !== null && storageMileage > task.currentMileage) {
        await fetch(`/api/motorcycles/${task.motorcycleId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentMileage: storageMileage
          }),
        });
      }
      
      // Redirect back to maintenance page
      router.push("/maintenance?completed=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
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
                    Current Mileage ({unitLabel})
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
      </main>
    </ClientLayout>
  );
}