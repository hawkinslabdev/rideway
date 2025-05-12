// app/components/ServiceRecordForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, X, ArrowLeft } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";

interface ServiceRecordFormProps {
  motorcycleId?: string;
  taskId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export default function ServiceRecordForm({ motorcycleId, taskId, onClose, isModal = false }: ServiceRecordFormProps) {
  const router = useRouter();
  const { formatDistance, formatCurrency } = useSettings();
  
  const [motorcycles, setMotorcycles] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    motorcycleId: motorcycleId || "",
    taskId: taskId || "",
    date: new Date().toISOString().split("T")[0],
    mileage: "",
    task: "",
    cost: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    // Fetch motorcycles
    const fetchMotorcycles = async () => {
      try {
        const response = await fetch("/api/motorcycles");
        if (response.ok) {
          const data = await response.json();
          setMotorcycles(data.motorcycles);
          
          // If motorcycleId is not set and we have motorcycles, set to default
          if (!formData.motorcycleId && data.motorcycles.length > 0) {
            const defaultMotorcycle = data.motorcycles.find((m: any) => m.isDefault) || data.motorcycles[0];
            setFormData(prev => ({
              ...prev, 
              motorcycleId: defaultMotorcycle.id,
              mileage: defaultMotorcycle.currentMileage?.toString() || ""
            }));
            
            // If motorcycleId is set, fetch tasks for that motorcycle
            fetchTasks(defaultMotorcycle.id);
          }
        }
      } catch (err) {
        console.error("Error fetching motorcycles:", err);
      }
    };
    
    fetchMotorcycles();
    
    // If motorcycleId is provided, fetch tasks for that motorcycle
    if (motorcycleId) {
      fetchTasks(motorcycleId);
    }
    
    // If taskId is provided, fetch task details
    if (taskId) {
      fetchTaskDetails(taskId);
    }
  }, []);
  
  // Update motorcycleId when prop changes
  useEffect(() => {
    if (motorcycleId && motorcycleId !== formData.motorcycleId) {
      setFormData(prev => ({ ...prev, motorcycleId }));
      fetchTasks(motorcycleId);
    }
  }, [motorcycleId]);
  
  // Update taskId when prop changes
  useEffect(() => {
    if (taskId && taskId !== formData.taskId) {
      setFormData(prev => ({ ...prev, taskId }));
      fetchTaskDetails(taskId);
    }
  }, [taskId]);

  const fetchTasks = async (motorId: string) => {
    try {
      const response = await fetch(`/api/maintenance/task?motorcycleId=${motorId}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };
  
  const fetchTaskDetails = async (taskId: string) => {
    try {
      const response = await fetch(`/api/maintenance/task/${taskId}`);
      if (response.ok) {
        const task = await response.json();
        // Pre-fill form with task name
        setFormData(prev => ({
          ...prev,
          task: task.name,
          // You could also pre-fill other fields based on the task
        }));
      }
    } catch (err) {
      console.error("Error fetching task details:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "motorcycleId" && value !== formData.motorcycleId) {
      fetchTasks(value);
      
      // Update mileage with current motorcycle mileage
      const selectedMotorcycle = motorcycles.find(m => m.id === value);
      if (selectedMotorcycle && selectedMotorcycle.currentMileage) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          mileage: selectedMotorcycle.currentMileage.toString()
        }));
        return;
      }
    }
    
    if (name === "taskId" && value !== formData.taskId) {
      const selectedTask = tasks.find(t => t.id === value);
      if (selectedTask) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          task: selectedTask.task // Auto-fill task name
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
      };
      
      const response = await fetch("/api/service-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create service record");
      }
      
      // Show success message
      setSuccess(true);
      
      // If this is a modal, call onClose after a brief delay
      if (isModal && onClose) {
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Otherwise redirect to history page
        setTimeout(() => {
          router.push("/history?created=true");
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isModal ? '' : 'max-w-3xl mx-auto'}`}>
      {!isModal && (
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <button 
                onClick={() => router.back()} 
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={16} className="mr-1" />
                Back
              </button>
              <h1 className="text-2xl font-bold mt-2">Log Service Record</h1>
              <p className="text-gray-600">Track maintenance, costs, and other service activities</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`bg-white ${isModal ? '' : 'shadow'} rounded-lg overflow-hidden`}>
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-green-50 border-b border-green-200">
              <p className="text-sm text-green-800">Service record created successfully!</p>
            </div>
          )}
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
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
                  disabled={!!motorcycleId || loading}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option value="">Select a motorcycle</option>
                  {motorcycles.map(motorcycle => (
                    <option key={motorcycle.id} value={motorcycle.id}>
                      {motorcycle.name} ({motorcycle.year} {motorcycle.make} {motorcycle.model})
                    </option>
                  ))}
                </select>
                {formData.motorcycleId && (
                  <p className="mt-1 text-xs text-gray-500">
                    {motorcycles.find(m => m.id === formData.motorcycleId)?.currentMileage 
                      ? `Current mileage: ${formatDistance(motorcycles.find(m => m.id === formData.motorcycleId)?.currentMileage)}`
                      : 'No mileage recorded'
                    }
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
                <label htmlFor="taskId" className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Task
                </label>
                <select
                  id="taskId"
                  name="taskId"
                  value={formData.taskId}
                  onChange={handleChange}
                  disabled={!formData.motorcycleId || tasks.length === 0 || loading}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option value="">Select a task or enter custom</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.task}
                    </option>
                  ))}
                </select>
                {formData.motorcycleId && tasks.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No maintenance tasks found for this motorcycle
                  </p>
                )}
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
                  min="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank if not applicable
                </p>
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
                    min="0"
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
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={isModal && onClose ? onClose : () => router.back()}
              disabled={loading || success}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Save size={16} className="mr-2" />
              {loading ? "Saving..." : "Save Record"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}