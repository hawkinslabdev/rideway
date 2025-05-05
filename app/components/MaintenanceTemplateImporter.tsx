// File: app/components/MaintenanceTemplateImporter.tsx
"use client";

import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle, Download, Info } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";
import { DistanceUtil } from "../lib/utils/distance";

interface MaintenanceTemplateTask {
  name: string;
  description: string | null;
  intervalMiles: number | null;
  intervalDays: number | null;
  priority: string;
}

interface MaintenanceTemplate {
  id: string;
  name: string;
  description: string;
  tasks: MaintenanceTemplateTask[];
}

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
}

interface MaintenanceTemplateImporterProps {
  motorcycles: Motorcycle[];
  onClose: () => void;
  onImport: (tasks: any[]) => Promise<void>;
}

export default function MaintenanceTemplateImporter({
  motorcycles,
  onClose,
  onImport,
}: MaintenanceTemplateImporterProps) {
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [taskSelection, setTaskSelection] = useState<Record<string, boolean>>({});
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const { formatDistance } = useSettings();

  // Load templates when component mounts
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/data/maintenance-templates.json");
        if (!response.ok) {
          throw new Error("Failed to load maintenance templates");
        }
        
        const data = await response.json();
        setTemplates(data);
        
        // Set first template as default if available
        if (data.length > 0) {
          setSelectedTemplate(data[0].id);
          
          // Initialize task selection (all selected by default)
          const initialSelection: Record<string, boolean> = {};
          data[0].tasks.forEach((task: MaintenanceTemplateTask) => {
            initialSelection[task.name] = true;
          });
          setTaskSelection(initialSelection);
        }
        
        // Set first motorcycle as default if available
        if (motorcycles.length > 0) {
          setSelectedMotorcycle(motorcycles[0].id);
        }
      } catch (err) {
        setError("Failed to load maintenance templates. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplates();
  }, [motorcycles]);

  // When template selection changes, update task selection
  useEffect(() => {
    if (!selectedTemplate) return;
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;
    
    // Initialize task selection for new template (all selected by default)
    const initialSelection: Record<string, boolean> = {};
    template.tasks.forEach(task => {
      initialSelection[task.name] = true;
    });
    setTaskSelection(initialSelection);
  }, [selectedTemplate, templates]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTemplate(e.target.value);
  };

  const handleMotorcycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMotorcycle(e.target.value);
  };

  const handleTaskSelectionChange = (taskName: string) => {
    setTaskSelection(prev => ({
      ...prev,
      [taskName]: !prev[taskName]
    }));
  };

  const toggleAllTasks = (select: boolean) => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;
    
    const newSelection: Record<string, boolean> = {};
    template.tasks.forEach(task => {
      newSelection[task.name] = select;
    });
    setTaskSelection(newSelection);
  };

  const handleImport = async () => {
    if (!selectedTemplate || !selectedMotorcycle) return;
    
    setImporting(true);
    setError(null);
    
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) throw new Error("Template not found");
      
      // Filter tasks based on selection
      const selectedTasks = template.tasks.filter(task => taskSelection[task.name]);
      
      if (selectedTasks.length === 0) {
        throw new Error("Please select at least one maintenance task");
      }
      
      // Prepare tasks for import
      const tasksToImport = selectedTasks.map(task => ({
        motorcycleId: selectedMotorcycle,
        name: task.name,
        description: task.description,
        intervalMiles: task.intervalMiles,
        intervalDays: task.intervalDays,
        priority: task.priority,
        isRecurring: true,
      }));
      
      // Call the onImport callback with the tasks
      await onImport(tasksToImport);
      
      // Close the modal after successful import
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import template");
    } finally {
      setImporting(false);
    }
  };

  const getSelectedTemplateDescription = () => {
    if (!selectedTemplate) return null;
    const template = templates.find(t => t.id === selectedTemplate);
    return template?.description;
  };

  // Calculate the next due mileage for a task given the selected motorcycle
  const calculateNextDueMileage = (task: MaintenanceTemplateTask) => {
    if (!selectedMotorcycle || !task.intervalMiles) return "N/A";
    
    const motorcycle = motorcycles.find(m => m.id === selectedMotorcycle);
    if (!motorcycle || motorcycle.currentMileage === null) return "N/A";
    
    const nextDueMileage = motorcycle.currentMileage + task.intervalMiles;
    return formatDistance(nextDueMileage);
  };

  // Format interval for display
  const formatInterval = (task: MaintenanceTemplateTask) => {
    const parts = [];
    
    if (task.intervalMiles) {
      parts.push(`Every ${formatDistance(task.intervalMiles)}`);
    }
    
    if (task.intervalDays) {
      const years = Math.floor(task.intervalDays / 365);
      const months = Math.floor((task.intervalDays % 365) / 30);
      
      if (years > 0) {
        parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
      }
      
      if (months > 0) {
        parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
      }
      
      if (years === 0 && months === 0) {
        parts.push(`${task.intervalDays} days`);
      }
    }
    
    return parts.join(' or ');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full p-6">
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <Download size={20} className="mr-2 text-blue-600" />
            Import Maintenance Template
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
            <AlertCircle size={18} className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        <div className="p-6 space-y-4 flex-grow overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label htmlFor="templateSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Select Maintenance Template
              </label>
              <select
                id="templateSelect"
                value={selectedTemplate}
                onChange={handleTemplateChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              
              {getSelectedTemplateDescription() && (
                <p className="mt-1 text-sm text-gray-500">
                  {getSelectedTemplateDescription()}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="motorcycleSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Apply To Motorcycle
              </label>
              <select
                id="motorcycleSelect"
                value={selectedMotorcycle}
                onChange={handleMotorcycleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {motorcycles.map(motorcycle => (
                  <option key={motorcycle.id} value={motorcycle.id}>
                    {motorcycle.name} ({motorcycle.year} {motorcycle.make} {motorcycle.model})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium flex items-center">
                Maintenance Tasks
                <button 
                  onClick={() => setShowInfoModal(true)}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  <Info size={16} />
                </button>
              </h3>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => toggleAllTasks(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllTasks(false)}
                  className="text-xs font-medium text-gray-600 hover:text-gray-800"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            {/* Tasks Table */}
            <div className="mt-2 border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      <span className="sr-only">Select</span>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Task
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Interval
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Next Due
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.tasks.map((task, index) => (
                    <tr 
                      key={`${task.name}-${index}`} 
                      className={`hover:bg-gray-50 ${!taskSelection[task.name] ? 'bg-gray-50 text-gray-400' : ''}`}
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={taskSelection[task.name] || false}
                          onChange={() => handleTaskSelectionChange(task.name)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {task.name}
                        </div>
                        {task.description && (
                          <div className="text-xs text-gray-500">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatInterval(task)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {task.intervalMiles ? calculateNextDueMileage(task) : "N/A"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            task.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : task.priority === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.tasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 text-center">
                        No maintenance tasks in this template
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !selectedTemplate || !selectedMotorcycle}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {importing ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Importing...
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                Import Selected Tasks
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">About Maintenance Templates</h3>
            <div className="space-y-4 text-sm">
              <p>
                Maintenance templates provide predefined sets of maintenance tasks based on common motorcycle maintenance schedules.
              </p>
              <p>
                When you import a template, you can select which tasks to include. The tasks will be added to your motorcycle's maintenance schedule with appropriate intervals.
              </p>
              <p>
                The system will calculate the next due date and mileage based on your motorcycle's current odometer reading and today's date.
              </p>
              <p className="text-xs text-gray-500 italic">
                Note: These templates are general guidelines. Always refer to your motorcycle's owner's manual for the manufacturer's recommended maintenance schedule.
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
    </div>
  );
}