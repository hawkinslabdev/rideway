"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Bike, X, Gauge, CheckCircle } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
  imageUrl: string | null;
  isDefault: boolean;
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
        const defaultMotorcycle = ownedMotorcycles.find(m => m.isDefault) || ownedMotorcycles[0];
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
    
    if (!selectedMotorcycle) {
      setError("Please select a motorcycle");
      return;
    }
    
    if (!newMileage) {
      setError("Please enter a valid mileage value");
      return;
    }
    
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
      
      // Update mileage
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
      
      // Log mileage update
      await fetch("/api/motorcycles/mileage-log", {
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
      
      // Update local state
      setMotorcycles(motorcycles.map(m => 
        m.id === selectedMotorcycle.id 
          ? { ...m, currentMileage: mileageValue } 
          : m
      ));
      
      // Show success message
      toast.success(`Updated mileage for ${selectedMotorcycle.name}`, {
        position: "bottom-center",
        icon: <CheckCircle className="text-green-500" size={18} />,
      });
      
      // Close modal after short delay
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Gauge size={20} className="text-blue-600 mr-2" />
            Update Mileage
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
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
            {/* Motorcycle Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Motorcycle
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {motorcycles.map((motorcycle) => (
                  <div 
                    key={motorcycle.id}
                    onClick={() => handleMotorcycleSelect(motorcycle)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center ${
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
                    <div>
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
            
            <form onSubmit={handleMileageUpdate}>
              {/* Mileage Input */}
              <div className="mb-6">
                <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Mileage
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    name="mileage"
                    id="mileage"
                    required
                    min={selectedMotorcycle?.currentMileage || 0}
                    value={newMileage}
                    onChange={(e) => setNewMileage(e.target.value)}
                    className={`focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md ${
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
              
              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingMileage || !selectedMotorcycle}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {updatingMileage ? (
                    <>
                      <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                      Updating...
                    </>
                  ) : (
                    'Update Mileage'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}