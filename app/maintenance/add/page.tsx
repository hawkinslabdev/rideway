// app/maintenance/add/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClientLayout from "../../components/ClientLayout";
import Link from "next/link";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { DistanceUtil } from "../../lib/utils/distance";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
}

export default function AddMaintenancePage() {
  const router = useRouter();
  const { settings, getUnitsLabel } = useSettings();
  const unitLabel = getUnitsLabel().distance;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  
  const [formData, setFormData] = useState({
    motorcycleId: "",
    name: "",
    description: "",
    intervalMiles: "",
    intervalDays: "",
    priority: "medium",
    isRecurring: true,
  });

  useEffect(() => {
    const fetchMotorcycles = async () => {
      try {
        const response = await fetch("/api/motorcycles");
        
        if (!response.ok) {
          throw new Error("Failed to fetch motorcycles");
        }
        
        const data = await response.json();
        setMotorcycles(data.motorcycles);
        
        // Set default motorcycle if available
        if (data.motorcycles.length > 0) {
          setFormData(prev => ({
            ...prev,
            motorcycleId: data.motorcycles[0].id
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMotorcycles();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox input types
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.motorcycleId === "") {
      setError("Please select a motorcycle");
      return;
    }
    
    if (formData.name === "") {
      setError("Task name is required");
      return;
    }
    
    // Either interval miles or days should be provided
    if (formData.intervalMiles === "" && formData.intervalDays === "") {
      setError("Please provide either a mileage interval or a time interval");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Convert the mileage interval from display units to storage units (km)
      const displayIntervalMiles = DistanceUtil.parseInput(formData.intervalMiles);
      const storageIntervalMiles = DistanceUtil.toStorageUnits(displayIntervalMiles, settings.units);
      
      const response = await fetch("/api/maintenance/task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId: formData.motorcycleId,
          name: formData.name,
          description: formData.description || null,
          intervalMiles: storageIntervalMiles, // Store interval in kilometers
          intervalDays: formData.intervalDays ? parseInt(formData.intervalDays) : null,
          priority: formData.priority,
          isRecurring: formData.isRecurring,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create maintenance task");
      }
      
      // Redirect back to maintenance page
      router.push("/maintenance?created=true");
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
  
  if (motorcycles.length === 0) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <Link href="/maintenance" className="flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft size={16} className="mr-1" />
              Back to Maintenance
            </Link>
          </div>
          
          <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h2 className="text-xl font-semibold">No Motorcycles Found</h2>
            </div>
            <p className="text-gray-600 mb-6">
              You need to add a motorcycle before you can create maintenance tasks.
            </p>
            <Link href="/garage/add" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <Plus size={16} className="mr-2" />
              Add Your First Motorcycle
            </Link>
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
              <h1 className="text-xl font-bold">Add Maintenance Task</h1>
            </div>
            
            <div className="p-6">
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
                  <label htmlFor="motorcycleId" className="block text-sm font-medium text-gray-700">
                    Motorcycle <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="motorcycleId"
                    name="motorcycleId"
                    value={formData.motorcycleId}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {motorcycles.map(motorcycle => (
                      <option key={motorcycle.id} value={motorcycle.id}>
                        {motorcycle.name} ({motorcycle.year} {motorcycle.make} {motorcycle.model})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Task Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., Oil Change, Chain Maintenance"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Add any details about this maintenance task"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="intervalMiles" className="block text-sm font-medium text-gray-700">
                      Mileage Interval ({unitLabel})
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        name="intervalMiles"
                        id="intervalMiles"
                        min="1"
                        value={formData.intervalMiles}
                        onChange={handleChange}
                        className="flex-grow block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder={`e.g., 3000 ${unitLabel}`}
                      />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                        {unitLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      How often this task needs to be done based on mileage
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="intervalDays" className="block text-sm font-medium text-gray-700">
                      Time Interval
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        name="intervalDays"
                        id="intervalDays"
                        min="1"
                        value={formData.intervalDays}
                        onChange={handleChange}
                        className="flex-grow block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., 180"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                        days
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      How often this task needs to be done based on time
                    </p>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="isRecurring"
                      name="isRecurring"
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={handleChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="isRecurring" className="font-medium text-gray-700">
                      Recurring Maintenance
                    </label>
                    <p className="text-gray-500">
                      Check this if this task needs to be performed regularly
                    </p>
                  </div>
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
                        Creating...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Maintenance Task
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