// app/history/add/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import ClientLayout from "../../components/ClientLayout";
import { useSettings } from "../../contexts/SettingsContext";
import { nanoid } from "nanoid";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
}

export default function AddServiceRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatDistance } = useSettings();
  
  const preselectedMotorcycleId = searchParams.get("motorcycle");
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    motorcycleId: preselectedMotorcycleId || "",
    date: new Date().toISOString().split("T")[0], // Today as default
    mileage: "",
    task: "",
    cost: "",
    location: "",
    notes: "",
  });

  // Fetch motorcycles
  useEffect(() => {
    const fetchMotorcycles = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/motorcycles");
        
        if (!response.ok) {
          throw new Error("Failed to fetch motorcycles");
        }
        
        const data = await response.json();
        setMotorcycles(data.motorcycles || []);
        
        // Set default motorcycle if preselected or first available
        if (data.motorcycles.length > 0) {
          let defaultMotorcycle;
          
          if (preselectedMotorcycleId) {
            defaultMotorcycle = data.motorcycles.find(
              (m: Motorcycle) => m.id === preselectedMotorcycleId
            );
          }
          
          if (!defaultMotorcycle) {
            defaultMotorcycle = data.motorcycles[0];
          }
          
          setSelectedMotorcycle(defaultMotorcycle);
          setFormData(prev => ({
            ...prev,
            motorcycleId: defaultMotorcycle.id,
            mileage: defaultMotorcycle.currentMileage ? defaultMotorcycle.currentMileage.toString() : "",
          }));
        }
      } catch (err) {
        console.error("Error fetching motorcycles:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMotorcycles();
  }, [preselectedMotorcycleId]);
  
  // Update selected motorcycle when motorcycleId changes
  useEffect(() => {
    const motorcycle = motorcycles.find(m => m.id === formData.motorcycleId);
    setSelectedMotorcycle(motorcycle || null);
    
    // Auto-fill current mileage when motorcycle changes
    if (motorcycle && motorcycle.currentMileage && !formData.mileage) {
      setFormData(prev => ({
        ...prev,
        mileage: motorcycle.currentMileage!.toString(),
      }));
    }
  }, [formData.motorcycleId, motorcycles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.motorcycleId) {
      setError("Please select a motorcycle");
      return;
    }
    
    if (!formData.task) {
      setError("Service type is required");
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch("/api/service-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: nanoid(),
          motorcycleId: formData.motorcycleId,
          date: new Date(formData.date).toISOString(),
          mileage: formData.mileage ? parseInt(formData.mileage) : null,
          task: formData.task,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          location: formData.location || null,
          notes: formData.notes || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create service record");
      }
      
      // Redirect to history page
      router.push("/history?created=true");
      
    } catch (err) {
      console.error("Error creating service record:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSaving(false);
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

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <Link href="/history" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} className="mr-1" />
            Back to Service History
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <h1 className="text-xl font-bold">Add Service Record</h1>
          </div>
          
          {error && (
            <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              // app/history/add/page.tsx (continued)
              <AlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          <div className="p-6">
            {motorcycles.length === 0 ? (
              <div className="text-center p-8">
                <div className="inline-block p-3 bg-yellow-100 rounded-full mb-4">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Motorcycles Found</h3>
                <p className="text-gray-600 mb-4">
                  You need to add a motorcycle before you can log service records.
                </p>
                <Link 
                  href="/garage/add" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Your First Motorcycle
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="motorcycleId" className="block text-sm font-medium text-gray-700 mb-1">
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
                      <option value="">Select a motorcycle</option>
                      {motorcycles.map(motorcycle => (
                        <option key={motorcycle.id} value={motorcycle.id}>
                          {motorcycle.name} ({motorcycle.year} {motorcycle.make} {motorcycle.model})
                        </option>
                      ))}
                    </select>
                    {selectedMotorcycle?.currentMileage !== null && (
                      <p className="mt-1 text-xs text-gray-500">
                        Current mileage: {selectedMotorcycle && formatDistance(selectedMotorcycle.currentMileage)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                      Service Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="task"
                      name="task"
                      value={formData.task}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Oil Change, Chain Maintenance"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                      Mileage
                    </label>
                    <input
                      type="number"
                      id="mileage"
                      name="mileage"
                      value={formData.mileage}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Odometer reading"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
                      Cost
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">€</span>
                      </div>
                      <input
                        type="number"
                        id="cost"
                        name="cost"
                        value={formData.cost}
                        onChange={handleChange}
                        step="0.01"
                        className="pl-7 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      Service Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Where the service was performed"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Additional details about the service"
                  />
                </div>
                
                <div className="flex justify-end">
                  <div className="flex space-x-3">
                    <Link
                      href="/history"
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save size={16} className="mr-2" />
                      {isSaving ? "Saving..." : "Save Record"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </ClientLayout>
  );
}