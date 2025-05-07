// app/components/MileageUpdateModal.tsx
"use client";

import React, { useState } from 'react';
import { X, Gauge } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface MileageUpdateModalProps {
  motorcycle: {
    id: string;
    name: string;
    currentMileage: number | null;
  };
  onClose: () => void;
  onUpdate: (motorcycleId: string, newMileage: number) => Promise<void>;
}

export default function MileageUpdateModal({ 
  motorcycle, 
  onClose, 
  onUpdate 
}: MileageUpdateModalProps) {
  const { formatDistance } = useSettings();
  const [newMileage, setNewMileage] = useState<string>(
    motorcycle.currentMileage ? motorcycle.currentMileage.toString() : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMileage) {
      setError("Please enter a mileage value");
      return;
    }
    
    const mileageValue = parseInt(newMileage);
    
    // Validate mileage is not less than current
    if (motorcycle.currentMileage && mileageValue < motorcycle.currentMileage) {
      setError(`New mileage cannot be less than the current value (${formatDistance(motorcycle.currentMileage)})`);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onUpdate(motorcycle.id, mileageValue);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mileage");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium flex items-center">
            <Gauge className="mr-2 text-blue-600" size={20} />
            Update Mileage
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 text-sm text-red-800 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
              Current Mileage for {motorcycle.name}
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
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}