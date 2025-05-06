// app/maintenance/add/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClientLayout from "../../components/ClientLayout";
import Link from "next/link";
import { ArrowLeft, Plus, AlertCircle, Info } from "lucide-react";
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
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [intervalBase, setIntervalBase] = useState<'current' | 'zero'>('current');
  
  // Track the type of mileage entry
  const [mileageType, setMileageType] = useState<'interval' | 'absolute'>('interval');
  
  const [formData, setFormData] = useState({
    motorcycleId: "",
    name: "",
    description: "",
    intervalMiles: "",      // For interval-based tracking
    nextDueMileage: "",     // For absolute tracking
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
          const defaultMotorcycle = data.motorcycles[0];
          setSelectedMotorcycle(defaultMotorcycle);
          setFormData(prev => ({
            ...prev,
            motorcycleId: defaultMotorcycle.id
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

  // Update selected motorcycle when motorcycleId changes
  useEffect(() => {
    const motorcycle = motorcycles.find(m => m.id === formData.motorcycleId);
    setSelectedMotorcycle(motorcycle || null);
  }, [formData.motorcycleId, motorcycles]);

  // Calculate the next due mileage based on interval for the help text
  const calculateNextDueMileage = () => {
    if (!selectedMotorcycle || selectedMotorcycle.currentMileage === null) {
      return "unknown";
    }
    
    const intervalMiles = DistanceUtil.parseInput(formData.intervalMiles);
    if (intervalMiles === null) {
      return "unknown";
    }
    
    const nextDueMileage = selectedMotorcycle.currentMileage + intervalMiles;
    return formatDistance(nextDueMileage);
  };

  const formatDistance = (value: number) => {
    return `${value} ${unitLabel}`;
  };

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

  const handleMileageTypeChange = (type: 'interval' | 'absolute') => {
    setMileageType(type);
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
    
    // Either interval miles, absolute mileage, or days should be provided
    if (formData.intervalMiles === "" && formData.nextDueMileage === "" && formData.intervalDays === "") {
      setError("Please provide either a mileage value or a time interval");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Determine which mileage value to use based on selected type
      let intervalMiles: number | null = null;
      let absoluteMileage: number | null = null;
      
      if (mileageType === 'interval') {
        // For interval-based tracking, convert interval to storage units
        intervalMiles = DistanceUtil.parseInput(formData.intervalMiles);
        intervalMiles = DistanceUtil.toStorageUnits(intervalMiles, settings.units);
      } else {
        // For absolute tracking, convert absolute value to storage units
        absoluteMileage = DistanceUtil.parseInput(formData.nextDueMileage);
        absoluteMileage = DistanceUtil.toStorageUnits(absoluteMileage, settings.units);
        
        // Calculate the interval from current mileage
        if (selectedMotorcycle && selectedMotorcycle.currentMileage !== null && absoluteMileage !== null) {
          intervalMiles = absoluteMileage - selectedMotorcycle.currentMileage;
          
          // Validate that the next due mileage is greater than current
          if (intervalMiles <= 0) {
            throw new Error("Next due mileage must be greater than current motorcycle mileage");
          }
        }
      }
      
      const response = await fetch("/api/maintenance/task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId: formData.motorcycleId,
          name: formData.name,
          description: formData.description || null,
          intervalMiles: intervalMiles,  // Pass the calculated interval
          intervalDays: formData.intervalDays ? parseInt(formData.intervalDays) : null,
          intervalBase: intervalBase, // Add the new field
          nextDueMileage: absoluteMileage, // Pass the absolute value if entered
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
                  {selectedMotorcycle && selectedMotorcycle.currentMileage !== null && (
                    <p className="mt-1 text-xs text-gray-500">
                      Current mileage: {formatDistance(selectedMotorcycle.currentMileage)}
                    </p>
                  )}
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
                
                {/* Mileage Tracking Options */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start mb-4">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center">
                      Mileage Tracking
                      <button 
                        type="button" 
                        onClick={() => setShowInfoModal(true)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        <Info size={16} />
                      </button>
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Tracking type toggle */}
                    <div className="flex gap-4">
                      <div className="flex items-center">
                        <input
                          id="interval-tracking"
                          name="mileage-tracking-type"
                          type="radio"
                          checked={mileageType === 'interval'}
                          onChange={() => handleMileageTypeChange('interval')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="interval-tracking" className="ml-2 block text-sm font-medium text-gray-700">
                          Interval Based
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="absolute-tracking"
                          name="mileage-tracking-type"
                          type="radio"
                          checked={mileageType === 'absolute'}
                          onChange={() => handleMileageTypeChange('absolute')}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="absolute-tracking" className="ml-2 block text-sm font-medium text-gray-700">
                          Absolute Value
                        </label>
                      </div>
                    </div>
                    
                    {/* Mileage input based on selected type */}
                    {mileageType === 'interval' ? (
                      <div>
                        <label htmlFor="intervalMiles" className="block text-sm font-medium text-gray-700">
                          Mileage Interval (Every X {unitLabel})
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
                        
                        {/* Add the interval base selector */}
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Interval Calculation Base
                          </label>
                          <div className="flex gap-4">
                            <div className="flex items-center">
                              <input
                                id="current-based"
                                type="radio"
                                name="intervalBase"
                                checked={intervalBase === 'current'}
                                onChange={() => setIntervalBase('current')}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <label htmlFor="current-based" className="ml-2 block text-sm text-gray-700">
                                From Current Mileage
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                id="zero-based"
                                type="radio"
                                name="intervalBase"
                                checked={intervalBase === 'zero'}
                                onChange={() => setIntervalBase('zero')}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <label htmlFor="zero-based" className="ml-2 block text-sm text-gray-700">
                                From Zero (Absolute Intervals)
                              </label>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Choose whether intervals count from the current mileage or are aligned to fixed values from zero.
                          </p>
                          
                          {/* Example calculation based on the selected interval base */}
                          {formData.intervalMiles && selectedMotorcycle?.currentMileage && (
                            <div className="mt-2 bg-blue-50 p-2 rounded text-xs text-blue-600">
                              {intervalBase === 'current' ? (
                                <span>
                                  Next service due at: {formatDistance(parseInt(formData.intervalMiles) + selectedMotorcycle.currentMileage)}
                                </span>
                              ) : (
                                <span>
                                  Next service due at: {formatDistance(Math.ceil(selectedMotorcycle.currentMileage / parseInt(formData.intervalMiles)) * parseInt(formData.intervalMiles))}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="nextDueMileage" className="block text-sm font-medium text-gray-700">
                          Due At Specific Odometer Reading
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="number"
                            name="nextDueMileage"
                            id="nextDueMileage"
                            min={selectedMotorcycle?.currentMileage ? selectedMotorcycle.currentMileage + 1 : 1}
                            value={formData.nextDueMileage}
                            onChange={handleChange}
                            className="flex-grow block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder={`e.g., 10000 ${unitLabel}`}
                          />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            {unitLabel}
                          </span>
                        </div>
                        {selectedMotorcycle && selectedMotorcycle.currentMileage !== null && formData.nextDueMileage && (
                          <p className="mt-1 text-xs text-gray-600">
                            {parseInt(formData.nextDueMileage) > selectedMotorcycle.currentMileage ? (
                              `That's ${parseInt(formData.nextDueMileage) - selectedMotorcycle.currentMileage} ${unitLabel} from now`
                            ) : (
                              <span className="text-red-600">Value must be greater than current mileage</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="intervalDays" className="block text-sm font-medium text-gray-700">
                    Time Interval (Optional)
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
        
        {/* Info Modal */}
        {showInfoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium mb-4">Mileage Tracking Options</h3>
              <div className="space-y-4 text-sm">
                <p>
                  <strong>Interval Based:</strong> Track maintenance by specifying how often it should be done (e.g., "every 3,000 miles"). 
                  The system will automatically calculate the next due mileage based on when you last performed the maintenance.
                </p>
                <p>
                  <strong>Absolute Value:</strong> Track maintenance by specifying an exact odometer reading (e.g., "due at 10,000 miles"). 
                  This is useful for manufacturer-specified maintenance at specific mileage points.
                </p>
                <p className="text-gray-600 italic">
                  Both methods will track your progress through the maintenance interval, but allow you to choose how to define when maintenance is due.
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