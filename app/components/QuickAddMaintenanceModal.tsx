// app/components/QuickAddMaintenanceModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Calendar, Clock, Wrench, AlertCircle } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";

// Predefined maintenance templates
const COMMON_MAINTENANCE = [
  { name: "Oil Change", intervalMiles: 3000, intervalDays: 180, priority: "high" },
  { name: "Chain Cleaning & Lubrication", intervalMiles: 500, intervalDays: 30, priority: "medium" },
  { name: "Tire Pressure Check", intervalMiles: 500, intervalDays: 14, priority: "high" },
  { name: "Chain Tension Check", intervalMiles: 1000, intervalDays: 60, priority: "medium" },
  { name: "Air Filter Service", intervalMiles: 10000, intervalDays: 365, priority: "medium" },
  { name: "Valve Clearance Check", intervalMiles: 15000, intervalDays: 730, priority: "high" },
  { name: "Brake Fluid Change", intervalMiles: 15000, intervalDays: 730, priority: "high" },
  { name: "Brake Pad Check", intervalMiles: 5000, intervalDays: 180, priority: "high" },
  { name: "Spark Plug Change", intervalMiles: 15000, intervalDays: 730, priority: "medium" },
  { name: "Fork Oil Change", intervalMiles: 20000, intervalDays: 730, priority: "medium" },
];

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
}

interface QuickAddMaintenanceModalProps {
  motorcycles: Motorcycle[];
  preselectedMotorcycleId?: string;
  onClose: () => void;
  onAdd: (task: any) => Promise<void>;
}

export default function QuickAddMaintenanceModal({
  motorcycles,
  preselectedMotorcycleId,
  onClose,
  onAdd
}: QuickAddMaintenanceModalProps) {
  const { formatDistance } = useSettings();
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<string>(preselectedMotorcycleId || "");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [customIntervalMiles, setCustomIntervalMiles] = useState<string>("");
  const [customIntervalDays, setCustomIntervalDays] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preset" | "custom">("preset");
  
  // Set preselected motorcycle if provided
  useEffect(() => {
    if (preselectedMotorcycleId) {
      setSelectedMotorcycle(preselectedMotorcycleId);
    } else if (motorcycles.length > 0) {
      setSelectedMotorcycle(motorcycles[0].id);
    }
  }, [preselectedMotorcycleId, motorcycles]);
  
  // Handle selection of a maintenance template
  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    
    // Pre-fill custom fields with template values
    const template = COMMON_MAINTENANCE.find(t => t.name === templateName);
    if (template) {
      setCustomName(template.name);
      setCustomIntervalMiles(template.intervalMiles.toString());
      setCustomIntervalDays(template.intervalDays.toString());
      setPriority(template.priority);
    }
  };
  
  // Handle submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedMotorcycle === "") {
      setError("Please select a motorcycle");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const motorcycle = motorcycles.find(m => m.id === selectedMotorcycle);
      
      // Create task object based on view mode
      let taskData;
      if (viewMode === "preset" && selectedTemplate) {
        const template = COMMON_MAINTENANCE.find(t => t.name === selectedTemplate);
        if (!template) {
          throw new Error("Template not found");
        }
        
        taskData = {
          motorcycleId: selectedMotorcycle,
          name: template.name,
          description: `Regular ${template.name.toLowerCase()} maintenance`,
          intervalMiles: template.intervalMiles,
          intervalDays: template.intervalDays,
          priority: template.priority,
          isRecurring: true,
          intervalBase: 'current'
        };
      } else {
        // Validate custom form
        if (!customName) {
          throw new Error("Task name is required");
        }
        
        if (!customIntervalMiles && !customIntervalDays) {
          throw new Error("Either mileage interval or time interval is required");
        }
        
        taskData = {
          motorcycleId: selectedMotorcycle,
          name: customName,
          description: null,
          intervalMiles: customIntervalMiles ? parseInt(customIntervalMiles) : null,
          intervalDays: customIntervalDays ? parseInt(customIntervalDays) : null,
          priority: priority,
          isRecurring: true,
          intervalBase: 'current'
        };
      }
      
      // Call the onAdd callback
      await onAdd(taskData);
      
      // Close modal
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add maintenance task");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getSelectedMotorcycle = () => {
    return motorcycles.find(m => m.id === selectedMotorcycle);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Quick Add Maintenance</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 flex-grow overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Motorcycle Selection */}
            <div className="mb-4">
              <label htmlFor="motorcycleId" className="block text-sm font-medium text-gray-700 mb-1">
                Motorcycle
              </label>
              <select
                id="motorcycleId"
                value={selectedMotorcycle}
                onChange={(e) => setSelectedMotorcycle(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select a motorcycle</option>
                {motorcycles.map(motorcycle => (
                  <option key={motorcycle.id} value={motorcycle.id}>
                    {motorcycle.name} ({motorcycle.year} {motorcycle.make} {motorcycle.model})
                  </option>
                ))}
              </select>
              {getSelectedMotorcycle()?.currentMileage && (
                <p className="mt-1 text-xs text-gray-500">
                  Current mileage: {formatDistance(getSelectedMotorcycle()!.currentMileage!)}
                </p>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setViewMode("preset")}
                className={`flex-1 py-1.5 text-sm font-medium rounded ${
                  viewMode === "preset" 
                    ? "bg-white text-blue-600 shadow" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Common Presets
              </button>
              <button
                type="button"
                onClick={() => setViewMode("custom")}
                className={`flex-1 py-1.5 text-sm font-medium rounded ${
                  viewMode === "custom" 
                    ? "bg-white text-blue-600 shadow" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Custom Task
              </button>
            </div>
            
            {/* Preset Templates */}
            {viewMode === "preset" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select a maintenance type
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                  {COMMON_MAINTENANCE.map(template => (
                    <div
                      key={template.name}
                      className={`border rounded-lg p-3 cursor-pointer hover:border-blue-300 transition ${
                        selectedTemplate === template.name 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200"
                      }`}
                      onClick={() => handleSelectTemplate(template.name)}
                    >
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <div className="flex items-center">
                          <Wrench size={12} className="mr-1" />
                          Every {formatDistance(template.intervalMiles)}
                        </div>
                        <div className="flex items-center mt-0.5">
                          <Calendar size={12} className="mr-1" />
                          Every {template.intervalDays} days
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedTemplate && getSelectedMotorcycle()?.currentMileage && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">
                      Maintenance Schedule Preview
                    </h4>
                    <div className="text-xs text-blue-600">
                      <p>
                        First due at: {formatDistance(getSelectedMotorcycle()!.currentMileage! + 
                          COMMON_MAINTENANCE.find(t => t.name === selectedTemplate)!.intervalMiles)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Custom Task Form */}
            {viewMode === "custom" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="customName" className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., Oil Change, Chain Maintenance"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customIntervalMiles" className="block text-sm font-medium text-gray-700 mb-1">
                      Mileage Interval
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        id="customIntervalMiles"
                        min="1"
                        value={customIntervalMiles}
                        onChange={(e) => setCustomIntervalMiles(e.target.value)}
                        className="flex-grow block w-full border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="3000"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                        miles
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="customIntervalDays" className="block text-sm font-medium text-gray-700 mb-1">
                      Time Interval
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        id="customIntervalDays"
                        min="1"
                        value={customIntervalDays}
                        onChange={(e) => setCustomIntervalDays(e.target.value)}
                        className="flex-grow block w-full border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="180"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                        days
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (viewMode === "preset" && !selectedTemplate) || !selectedMotorcycle}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Adding...
              </span>
            ) : (
              <span className="flex items-center">
                <Plus size={16} className="mr-2" />
                Add Task
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}