// File: app/components/MileageUpdateModal.tsx

"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Bike, X, Gauge, CheckCircle, Info } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";
import MileageTrackingInfoModal from "./MileageTrackingInfoModal";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
  imageUrl: string | null;
  isDefault: boolean;
  isOwned?: boolean;
}

interface MileageUpdateModalProps {
  onClose: () => void;
}

export default function MileageUpdateModal({ onClose }: MileageUpdateModalProps) {
  const { formatDistance } = useSettings();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [newMileage, setNewMileage] = useState("");
  const [updatingMileage, setUpdatingMileage] = useState(false);
  const [error, setError] = useState("");
  const [showMileageInfoModal, setShowMileageInfoModal] = useState(false);
  
  useEffect(() => {
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
    
    fetchMotorcycles();
  }, []);
  
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
      
      // Validate mileage (should be greater than current)
      const mileageValue = parseInt(newMileage);
      if (isNaN(mileageValue) || mileageValue < 0) {
        throw new Error("Please enter a valid mileage value");
      }
      
      if (selectedMotorcycle.currentMileage && mileageValue < selectedMotorcycle.currentMileage) {
        throw new Error("New mileage cannot be less than current mileage");
      }
      
      // First, update the motorcycle mileage
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
      
      // Next, log the mileage update explicitly to trigger events
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
      
      // Close modal and refresh data
      toast.success(`Updated mileage for ${selectedMotorcycle.name}`, {
        position: "bottom-center",
      });
      
      // Close the modal after short delay
      setTimeout(() => onClose(), 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mileage");
    } finally {
      setUpdatingMileage(false);
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed at the top */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <Gauge size={20} className="text-blue-600 mr-2" />
            Update Mileage
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {motorcycles.length === 0 ? (
            <div className="text-center py-8">
              <Bike size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No motorcycles found</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Motorcycle Selection - Improved scrollable area */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Motorcycle
                </label>
                
                {/* Max height to ensure scrollability on small screens */}
                <div className="max-h-[30vh] overflow-y-auto pr-1">
                  {motorcycles.map((motorcycle) => (
                    <div 
                      key={motorcycle.id}
                      onClick={() => handleMotorcycleSelect(motorcycle)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center mb-2 ${
                        selectedMotorcycle?.id === motorcycle.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full flex-shrink-0 bg-gray-200 flex items-center justify-center mr-3">
                        {motorcycle.imageUrl ? (
                          <img 
                            src={motorcycle.imageUrl} 
                            alt={motorcycle.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <Bike size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium text-sm">{motorcycle.name}</p>
                        <p className="text-xs text-gray-500">
                          {motorcycle.currentMileage 
                            ? formatDistance(motorcycle.currentMileage) 
                            : "No mileage data"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Mileage Input - Enhanced for mobile */}
              <div className="mb-4">
                <div className="flex flex-col space-y-1 mb-2">
                  <label htmlFor="mileage" className="text-sm font-medium text-gray-700">
                    Current Mileage
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMileageInfoModal(true)}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center self-start"
                  >
                    <Info size={14} className="mr-1" />
                    <span>How this affects maintenance</span>
                  </button>
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
                    className={`focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-16 py-3 text-base sm:py-2 sm:text-sm border-gray-300 rounded-md ${
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
                  <p className="mt-1 text-xs text-gray-500">
                    Current reading: {formatDistance(selectedMotorcycle.currentMileage)}
                  </p>
                )}
                
                {error && (
                  <p className="mt-1 text-xs text-red-600">{error}</p>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Footer - Fixed at the bottom */}
        {motorcycles.length > 0 && (
          <div className="p-4 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMileageUpdate}
              disabled={updatingMileage || !selectedMotorcycle}
              className="inline-flex items-center px-4 py-3 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {updatingMileage ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                  Updating...
                </>
              ) : (
                'Update Mileage'
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Mileage Tracking Info Modal */}
      {showMileageInfoModal && (
        <MileageTrackingInfoModal onClose={() => setShowMileageInfoModal(false)} />
      )}
    </div>
  );
}