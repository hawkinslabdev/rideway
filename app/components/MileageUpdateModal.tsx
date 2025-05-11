// app/components/MileageUpdateModal.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Bike, X, Gauge, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
  imageUrl: string | null;
  isOwned?: boolean; // Added property
  isDefault?: boolean; // Indicates if the motorcycle is the default one
}

interface MileageUpdateModalProps {
  onClose: () => void;
  motorcycle?: Motorcycle;
}

export default function MileageUpdateModal({ onClose, motorcycle }: MileageUpdateModalProps) {
  const { formatDistance } = useSettings();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(!motorcycle);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(motorcycle || null);
  const [newMileage, setNewMileage] = useState(motorcycle?.currentMileage?.toString() || "");
  const [updatingMileage, setUpdatingMileage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Only fetch motorcycles if no specific motorcycle was provided
  useEffect(() => {
    if (!motorcycle) {
      fetchMotorcycles();
    }
  }, [motorcycle]);

  const fetchMotorcycles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/motorcycles");
      
      if (!response.ok) {
        throw new Error("Failed to fetch motorcycles");
      }
      
      const data = await response.json();
      
      // Filter to only show owned motorcycles
      const ownedMotorcycles = data.motorcycles.filter((m: Motorcycle) => m.isOwned !== false);
      
      setMotorcycles(ownedMotorcycles);
      
      // Select default motorcycle if available
      const defaultMotorcycle = ownedMotorcycles.find((m: Motorcycle) => m.isDefault) || ownedMotorcycles[0];
      if (defaultMotorcycle) {
        setSelectedMotorcycle(defaultMotorcycle);
        setNewMileage(defaultMotorcycle.currentMileage?.toString() || "");
      }
    } catch (err) {
      console.error("Failed to fetch motorcycles:", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleMotorcycleSelect = (motorcycle: Motorcycle) => {
    setSelectedMotorcycle(motorcycle);
    setNewMileage(motorcycle.currentMileage?.toString() || "");
    setError("");
  };
  
  const handleMileageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMotorcycle || !newMileage) return;
    
    try {
      setUpdatingMileage(true);
      setError("");
      
      // Validate mileage (should be greater than current)
      const mileageValue = parseInt(newMileage);
      if (isNaN(mileageValue) || mileageValue < 0) {
        throw new Error("Please enter a valid mileage value");
      }
      
      if (selectedMotorcycle.currentMileage && mileageValue < selectedMotorcycle.currentMileage) {
        throw new Error("New mileage cannot be less than current mileage");
      }
      
      // Update the motorcycle mileage
      const response = await fetch(`/api/motorcycles/${selectedMotorcycle.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentMileage: mileageValue,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update mileage");
      }
      
      // Log the mileage update explicitly to trigger events
      const logResponse = await fetch("/api/motorcycles/mileage-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId: selectedMotorcycle.id,
          previousMileage: selectedMotorcycle.currentMileage,
          newMileage: mileageValue,
          notes: `Updated mileage from ${formatDistance(selectedMotorcycle.currentMileage || 0)} to ${formatDistance(mileageValue)}`
        }),
      });
      
      if (!logResponse.ok) {
        console.warn("Failed to log mileage update, but motorcycle was updated");
      } else {
        const logData = await logResponse.json();
        
        if (logData.notificationsTriggered > 0) {
          toast.success(`${logData.notificationsTriggered} maintenance tasks are now due`, {
            position: "bottom-center",
            duration: 5000,
          });
        }
      }
      
      // Show success animation
      setSuccess(true);
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
        // Update successful message
        toast.success(`Updated mileage for ${selectedMotorcycle.name}`, {
          position: "bottom-center",
        });
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mileage");
    } finally {
      setUpdatingMileage(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-lg max-w-md w-full shadow-xl"
        >
          {success ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Mileage Updated!</h3>
              <p className="text-gray-600 mb-6">
                Your motorcycle's mileage has been successfully updated
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center">
                    <Gauge size={20} className="mr-2" />
                    Update Mileage
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-white hover:text-white/80 transition-colors"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : motorcycles.length === 0 && !selectedMotorcycle ? (
                  <div className="text-center py-8">
                    <Bike size={40} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-4">No motorcycles found</p>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleMileageUpdate}>
                    {/* Motorcycle Selection - Only show if no specific motorcycle was provided */}
                    {!motorcycle && motorcycles.length > 1 && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Motorcycle
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {motorcycles.map((moto) => (
                            <div 
                              key={moto.id}
                              onClick={() => handleMotorcycleSelect(moto)}
                              className={`p-3 border rounded-lg cursor-pointer transition flex items-center ${
                                selectedMotorcycle?.id === moto.id 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="h-10 w-10 rounded-full flex-shrink-0 bg-gray-200 flex items-center justify-center mr-3">
                                {moto.imageUrl ? (
                                  <img 
                                    src={moto.imageUrl} 
                                    alt={moto.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <Bike size={20} className="text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{moto.name}</p>
                                <p className="text-xs text-gray-500">
                                  {moto.currentMileage 
                                    ? formatDistance(moto.currentMileage) 
                                    : "No mileage data"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Selected Motorcycle Display */}
                    {selectedMotorcycle && (
                      <div className="mb-6">
                        <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center mr-4 overflow-hidden">
                            {selectedMotorcycle.imageUrl ? (
                              <img 
                                src={selectedMotorcycle.imageUrl} 
                                alt={selectedMotorcycle.name}
                                className="h-12 w-12 object-cover"
                              />
                            ) : (
                              <Bike size={24} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{selectedMotorcycle.name}</h3>
                            <p className="text-sm text-gray-500">
                              {selectedMotorcycle.year} {selectedMotorcycle.make} {selectedMotorcycle.model}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Mileage Input */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">
                          Current Mileage
                        </label>
                        <div className="flex items-center text-xs text-blue-600">
                          <Info size={12} className="mr-1" />
                          <span>Triggers maintenance reminders</span>
                        </div>
                      </div>
                      
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          name="mileage"
                          id="mileage"
                          required
                          min={selectedMotorcycle?.currentMileage || 0}
                          value={newMileage}
                          onChange={(e) => setNewMileage(e.target.value)}
                          className={`focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-16 py-3 text-base md:text-sm border-gray-300 rounded-md ${
                            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                          placeholder="Enter current mileage"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">
                            {formatDistance(1).split(' ')[1]}
                          </span>
                        </div>
                      </div>
                      {selectedMotorcycle?.currentMileage && (
                        <div className="mt-2 flex items-center text-sm">
                          <Gauge size={16} className="text-gray-400 mr-2" />
                          <span className="text-gray-500">
                            Current reading: {formatDistance(selectedMotorcycle.currentMileage)}
                          </span>
                        </div>
                      )}
                      
                      {error && (
                        <div className="mt-2 flex items-start text-sm text-red-600">
                          <AlertTriangle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Custom Trip/Usage Fields - Optional Enhancement */}
                    <div className="border-t border-gray-200 pt-4 mb-6">
                      <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer list-none">
                          <span className="text-sm font-medium text-gray-700">Trip Details (Optional)</span>
                          <span className="text-blue-600 text-xs group-open:rotate-180 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                          </span>
                        </summary>
                        <div className="mt-3 space-y-3">
                          <div>
                            <label htmlFor="tripName" className="block text-sm font-medium text-gray-700 mb-1">
                              Trip Name
                            </label>
                            <input
                              type="text"
                              id="tripName"
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., Weekend Ride, Commute"
                            />
                          </div>
                          <div>
                            <label htmlFor="tripNotes" className="block text-sm font-medium text-gray-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              id="tripNotes"
                              rows={2}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Any notes about this trip or mileage update"
                            ></textarea>
                          </div>
                        </div>
                      </details>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingMileage || !selectedMotorcycle}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
                      >
                        {updatingMileage ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Gauge size={16} className="mr-2" />
                            Update Mileage
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}