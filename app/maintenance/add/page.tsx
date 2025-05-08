// app/maintenance/add/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClientLayout from "../../components/ClientLayout";
import MileageTrackingInfoModal from "../../components/MileageTrackingInfoModal";
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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showMileageInfoModal, setShowMileageInfoModal] = useState(false);
  
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
    intervalBase: "current", // Add intervalBase property
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
                
                {/* Mileage Tracking Options - Simplified */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700">When does this maintenance need to be done?</h3>
                    <button 
                      type="button" 
                      className="text-blue-600 hover:text-blue-800 text-sm underline flex items-center"
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    >
                      {showAdvancedOptions ? "Hide advanced options" : "Show advanced options"}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Simple tracking radio buttons with visual indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition ${
                          mileageType === 'interval' 
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => handleMileageTypeChange('interval')}
                      >
                        <div className="flex items-start mb-2">
                          <input
                            id="interval-tracking"
                            name="mileage-tracking-type"
                            type="radio"
                            checked={mileageType === 'interval'}
                            onChange={() => handleMileageTypeChange('interval')}
                            className="h-4 w-4 mt-1 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="interval-tracking" className="ml-2 block font-medium text-gray-700">
                            Regular Intervals
                            <p className="font-normal text-xs text-gray-500 mt-1">
                              Maintenance repeats after a certain distance or time
                            </p>
                          </label>
                        </div>
                        
                        <div className="ml-6 mt-3">
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="absolute h-full bg-blue-500 rounded-full" style={{ width: '50%' }}></div>
                            <div className="absolute h-full bg-blue-500 rounded-full" style={{ left: '75%', width: '50%' }}></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Current</span>
                            <span>+{selectedMotorcycle?.currentMileage ? formatDistance(3000) : "3000 miles"}</span>
                            <span>+{selectedMotorcycle?.currentMileage ? formatDistance(6000) : "6000 miles"}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition ${
                          mileageType === 'absolute' 
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => handleMileageTypeChange('absolute')}
                      >
                        <div className="flex items-start mb-2">
                          <input
                            id="absolute-tracking"
                            name="mileage-tracking-type"
                            type="radio"
                            checked={mileageType === 'absolute'}
                            onChange={() => handleMileageTypeChange('absolute')}
                            className="h-4 w-4 mt-1 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="absolute-tracking" className="ml-2 block font-medium text-gray-700">
                            Specific Milestone
                            <p className="font-normal text-xs text-gray-500 mt-1">
                              Maintenance due at exact odometer reading
                            </p>
                          </label>
                        </div>
                        
                        <div className="ml-6 mt-3">
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="absolute h-full w-4 bg-blue-500" style={{ left: '80%' }}></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0</span>
                            <span>{selectedMotorcycle?.currentMileage ? formatDistance(selectedMotorcycle.currentMileage) : "Current"}</span>
                            <span>Target: {selectedMotorcycle?.currentMileage ? formatDistance(10000) : "10000 miles"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Input fields based on selected type */}
                    {mileageType === 'interval' && (
                      <div className="mt-4">
                        <label htmlFor="intervalMiles" className="block text-sm font-medium text-gray-700">
                          Perform this maintenance every:
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
                            placeholder="3000"
                          />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            {unitLabel}
                          </span>
                        </div>
                        
                        {formData.intervalMiles && selectedMotorcycle?.currentMileage && (
                          <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            Next service will be due at approximately: {formatDistance(parseInt(formData.intervalMiles) + selectedMotorcycle.currentMileage)}
                          </div>
                        )}
                        
                        {/* Advanced options - hidden by default */}
                        {mileageType === 'interval' && showAdvancedOptions && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                              <span>Advanced: Interval Calculation Method</span>
                              <button 
                                type="button" 
                                onClick={() => setShowMileageInfoModal(true)}
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                              >
                                <Info size={14} className="mr-1" />
                                <span className="text-xs">How this works</span>
                              </button>
                            </label>
                            <div className="flex gap-4">
                              <div className="flex items-center">
                                <input
                                  id="current-based"
                                  type="radio"
                                  name="intervalBase"
                                  checked={formData.intervalBase === 'current'}
                                  onChange={() => setFormData(prev => ({ ...prev, intervalBase: 'current' }))}
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
                                  checked={formData.intervalBase === 'zero'}
                                  onChange={() => setFormData(prev => ({ ...prev, intervalBase: 'zero' }))}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="zero-based" className="ml-2 block text-sm text-gray-700">
                                  From Zero (Fixed Intervals)
                                </label>
                              </div>
                            </div>
                            
                            <div className="mt-2 p-2 rounded bg-gray-50 text-xs text-gray-600">
                              {formData.intervalBase === 'current' ? (
                                <>
                                  <p className="mb-1"><strong>From Current Mileage:</strong> Counts forward from your current odometer reading.</p>
                                  <p>Example: If current mileage is 5,000 and interval is 3,000, next service due at 8,000.</p>
                                </>
                              ) : (
                                <>
                                  <p className="mb-1"><strong>From Zero:</strong> Aligns to fixed intervals regardless of current mileage.</p>
                                  <p>Example: If interval is 3,000, services will be at 3,000, 6,000, 9,000, etc.</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                    
                    {mileageType === 'absolute' && (
                      <div className="mt-4">
                        <label htmlFor="nextDueMileage" className="block text-sm font-medium text-gray-700">
                          Due at exactly:
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
                            placeholder="10000"
                          />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            {unitLabel}
                          </span>
                        </div>
                        
                        {selectedMotorcycle?.currentMileage !== null && formData.nextDueMileage && (
                          <div className="mt-2 bg-blue-50 p-2 rounded text-xs">
                            {selectedMotorcycle && parseInt(formData.nextDueMileage) > selectedMotorcycle.currentMileage ? (
                              <span className="text-blue-600">
                                That's {formatDistance(parseInt(formData.nextDueMileage) - selectedMotorcycle.currentMileage)} from your current odometer reading
                              </span>
                            ) : (
                              <span className="text-red-600">
                                Value must be greater than current mileage ({selectedMotorcycle ? formatDistance(selectedMotorcycle.currentMileage) : "unknown"})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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

        {/* Mileage Tracking Info Modal */}
        {showMileageInfoModal && (
          <MileageTrackingInfoModal onClose={() => setShowMileageInfoModal(false)} />
        )}
      </main>
    </ClientLayout>
  );
}