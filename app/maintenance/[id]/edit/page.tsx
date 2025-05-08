// app/maintenance/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ClientLayout from "../../../components/ClientLayout";
import Link from "next/link";
import { 
  ArrowLeft, Save, AlertCircle, Info, Trash2, Archive, 
  Gauge, Calendar, Clock, CheckCircle, Settings, Star,
  Wrench
} from "lucide-react";
import { useSettings } from "../../../contexts/SettingsContext";
import { DistanceUtil } from "../../../lib/utils/distance";
import { format, addDays, isAfter } from "date-fns";

interface MaintenanceTask {
  id: string;
  task: string;
  description: string | null;
  motorcycle: string;
  motorcycleId: string;
  dueDate: string | null;
  dueMileage: number | null;
  currentMileage: number | null;
  intervalMiles: number | null;
  intervalDays: number | null;
  priority: string;
  isRecurring: boolean;
  archived?: boolean;
  lastCompleted?: string | null;
  lastMileage?: number | null;
  baseOdometer?: number | null;
  baseDate?: string | null;
  remainingMiles?: number | null;
  completionPercentage?: number | null;
}

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
}

export default function EditMaintenanceTaskPage() {
  const params = useParams();
  const router = useRouter();
  const { 
    settings, 
    getUnitsLabel, 
    convertToDisplayUnits,
    convertToStorageUnits 
  } = useSettings();
  
  const unitLabel = getUnitsLabel().distance;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'archive' | 'delete'>('archive');
  const [showMileageInfoModal, setShowMileageInfoModal] = useState(false);
  const [mileageType, setMileageType] = useState<'interval' | 'absolute'>('interval');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const [formData, setFormData] = useState({
    motorcycleId: "",
    name: "",
    description: "",
    intervalMiles: "",
    intervalDays: "",
    nextDueMileage: "",
    priority: "medium",
    isRecurring: true,
    intervalBase: "current" as "current" | "zero",
  });

  // Add state for the actual due values (absolute values)
  const [dueInfo, setDueInfo] = useState({
    dueDate: "",
    dueMileage: "",
    remainingMiles: "",
    percentComplete: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      
      try {
        // Fetch all motorcycles first
        const motorcyclesResponse = await fetch("/api/motorcycles");
        if (!motorcyclesResponse.ok) {
          throw new Error("Failed to fetch motorcycles");
        }
        const motorcyclesData = await motorcyclesResponse.json();
        setMotorcycles(motorcyclesData.motorcycles);
        
        // Then fetch the specific task
        const taskResponse = await fetch(`/api/maintenance/task/${params.id}`);
        if (!taskResponse.ok) {
          if (taskResponse.status === 404) {
            throw new Error("Maintenance task not found");
          }
          throw new Error("Failed to fetch maintenance task");
        }
        
        const taskData = await taskResponse.json();
        setTask(taskData);
        
        // Convert interval miles for display
        const displayIntervalMiles = taskData.intervalMiles ? 
          convertToDisplayUnits(taskData.intervalMiles) : null;

        // Set mileage type based on task data
        if (taskData.dueMileage && !taskData.intervalMiles) {
          setMileageType('absolute');
        } else {
          setMileageType('interval');
        }

        // Check if we have advanced options to show
        if (taskData.intervalBase === 'zero') {
          setShowAdvancedOptions(true);
        }

        // Update form data
        setFormData({
          motorcycleId: taskData.motorcycleId,
          name: taskData.name,
          description: taskData.description || "",
          intervalMiles: displayIntervalMiles ? displayIntervalMiles.toString() : "",
          intervalDays: taskData.intervalDays ? taskData.intervalDays.toString() : "",
          nextDueMileage: taskData.dueMileage ? convertToDisplayUnits(taskData.dueMileage)?.toString() || "" : "",
          priority: taskData.priority || "medium",
          isRecurring: taskData.isRecurring !== false,  // Default to true if not specified
          intervalBase: taskData.intervalBase || "current",
        });

        // Update the due information
        let remainingMiles = null;
        let percentComplete = 0;
        
        if (taskData.dueMileage && taskData.currentMileage) {
          remainingMiles = taskData.dueMileage - taskData.currentMileage;
          
          // Calculate percentage
          if (taskData.intervalMiles) {
            percentComplete = ((taskData.intervalMiles - Math.max(0, remainingMiles)) / taskData.intervalMiles) * 100;
            // Cap at 100%
            percentComplete = Math.min(100, Math.max(0, percentComplete));
          }
        }

        setDueInfo({
          dueDate: taskData.dueDate || "",
          dueMileage: taskData.dueMileage ? convertToDisplayUnits(taskData.dueMileage)?.toString() || "" : "",
          remainingMiles: remainingMiles !== null ? convertToDisplayUnits(remainingMiles)?.toString() || "" : "",
          percentComplete: Math.round(percentComplete),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [params.id, settings.units, convertToDisplayUnits]);

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
  
  const formatDistance = (value: number) => {
    return `${value} ${unitLabel}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.name === "") {
      setError("Task name is required");
      return;
    }
    
    // Either interval miles or days should be provided
    if (mileageType === 'interval' && formData.intervalMiles === "" && formData.intervalDays === "") {
      setError("Please provide either a mileage interval or a time interval");
      return;
    }

    // For absolute mileage, ensure a value is provided
    if (mileageType === 'absolute' && formData.nextDueMileage === "") {
      setError("Please specify the odometer reading when maintenance is due");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare the data differently based on mileage type
      let requestData: any = {
        motorcycleId: formData.motorcycleId,
        name: formData.name,
        description: formData.description || null,
        priority: formData.priority,
        isRecurring: formData.isRecurring,
        intervalBase: formData.intervalBase
      };

      if (mileageType === 'interval') {
        // Convert interval miles to storage units
        const intervalMilesValue = DistanceUtil.parseInput(formData.intervalMiles);
        const intervalMilesInKm = convertToStorageUnits(intervalMilesValue);
        
        requestData.intervalMiles = intervalMilesInKm;
        requestData.intervalDays = formData.intervalDays ? parseInt(formData.intervalDays) : null;
      } else {
        // Convert next due mileage to storage units
        const nextDueMileage = DistanceUtil.parseInput(formData.nextDueMileage);
        const nextDueMileageInKm = convertToStorageUnits(nextDueMileage);
        
        requestData.nextDueMileage = nextDueMileageInKm;
        requestData.intervalMiles = null; // Clear interval-based tracking
      }
      
      const response = await fetch(`/api/maintenance/task/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update maintenance task");
      }
      
      // Redirect back to maintenance page
      router.push("/maintenance?updated=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!params.id) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const endpoint = deleteOption === 'archive' 
        ? `/api/maintenance/task/${params.id}/archive` 
        : `/api/maintenance/task/${params.id}`;
      
      const method = deleteOption === 'archive' ? 'PATCH' : 'DELETE';
      const body = deleteOption === 'archive' ? JSON.stringify({ archived: true }) : undefined;
      
      const response = await fetch(endpoint, {
        method: method,
        headers: deleteOption === 'archive' 
          ? { 'Content-Type': 'application/json' }
          : undefined,
        body: body
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${deleteOption} maintenance task`);
      }
      
      // Redirect back to maintenance page with appropriate status
      const status = deleteOption === 'archive' ? 'archived' : 'deleted';
      router.push(`/maintenance?${status}=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };
  
  // Calculate next due date/mileage for preview
  const calculateNextDue = () => {
    let nextDuePreview = {
      date: null as Date | null,
      mileage: null as number | null,
    };
    
    const selectedMotorcycle = motorcycles.find(m => m.id === formData.motorcycleId);
    if (!selectedMotorcycle) return nextDuePreview;
    
    // Calculate next due mileage
    if (mileageType === 'interval' && formData.intervalMiles) {
      const intervalMiles = parseInt(formData.intervalMiles);
      if (!isNaN(intervalMiles) && selectedMotorcycle.currentMileage !== null) {
        if (formData.intervalBase === 'current') {
          nextDuePreview.mileage = selectedMotorcycle.currentMileage + intervalMiles;
        } else {
          // Zero-based: find next interval from zero
          const intervalsPassed = Math.floor(selectedMotorcycle.currentMileage / intervalMiles);
          nextDuePreview.mileage = (intervalsPassed + 1) * intervalMiles;
        }
      }
    } else if (mileageType === 'absolute' && formData.nextDueMileage) {
      const nextDueMileage = parseInt(formData.nextDueMileage);
      if (!isNaN(nextDueMileage)) {
        nextDuePreview.mileage = nextDueMileage;
      }
    }
    
    // Calculate next due date
    if (formData.intervalDays) {
      const intervalDays = parseInt(formData.intervalDays);
      if (!isNaN(intervalDays)) {
        nextDuePreview.date = addDays(new Date(), intervalDays);
      }
    }
    
    return nextDuePreview;
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
  
  if (error || !task) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="flex mb-4">
            <Link href="/maintenance" className="flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft size={16} className="mr-1" />
              Back to Maintenance
            </Link>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error || "Maintenance task not found"}</p>
            </div>
          </div>
        </main>
      </ClientLayout>
    );
  }

  // Calculate next due previews
  const nextDuePreview = calculateNextDue();
  
  // Check if task is overdue
  const isOverdue = task.dueDate 
    ? new Date(task.dueDate) < new Date() 
    : (task.dueMileage && task.currentMileage ? task.dueMileage <= task.currentMileage : false);

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
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <h1 className="text-xl font-bold">Edit Maintenance Task</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isOverdue 
                  ? "bg-red-100 text-red-800"
                  : task.priority === "high"
                    ? "bg-amber-100 text-amber-800"
                    : task.priority === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
              }`}>
                {isOverdue ? "Overdue" : task.priority}
              </span>
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
              
              {/* Current Status Information */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h2 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Star size={16} className="mr-2 text-amber-500" />
                  Current Maintenance Status
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Absolute next due values */}
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase mb-1">Next Due</h3>
                    <div className="space-y-1.5">
                      {task.dueMileage && (
                        <div className="flex items-center">
                          <Gauge size={14} className={`mr-1.5 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`} />
                          <span className={`text-sm ${isOverdue ? 'font-medium text-red-600' : ''}`}>
                            At {dueInfo.dueMileage} {unitLabel}
                          </span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center">
                          <Calendar size={14} className={`mr-1.5 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`} />
                          <span className={`text-sm ${isOverdue ? 'font-medium text-red-600' : ''}`}>
                            {isOverdue ? 'Overdue since' : 'Due on'} {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      )}
                      {task.lastCompleted && (
                        <div className="flex items-center mt-1">
                          <CheckCircle size={14} className="mr-1.5 text-green-500" />
                          <span className="text-sm text-gray-600">
                            Last completed {format(new Date(task.lastCompleted), "MMM d, yyyy")}
                            {task.lastMileage && ` at ${formatDistance(task.lastMileage as number)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress visualization */}
                  {dueInfo.percentComplete > 0 && (
                    <div>
                      <h3 className="text-xs text-gray-500 uppercase mb-1">Progress</h3>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Completion</span>
                          <span className={`font-medium ${
                            dueInfo.percentComplete >= 100 ? 'text-red-600' :
                            dueInfo.percentComplete >= 90 ? 'text-amber-600' : 
                            'text-green-600'
                          }`}>
                            {dueInfo.percentComplete}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              dueInfo.percentComplete >= 100 ? 'bg-red-500' :
                              dueInfo.percentComplete >= 90 ? 'bg-amber-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, dueInfo.percentComplete)}%` }}
                          ></div>
                        </div>
                        {(task.remainingMiles ?? 0) > 0 && (
                          <p className="text-xs mt-1 text-gray-600">
                            <span className="flex items-center">
                              <Gauge size={12} className="mr-1" />
                              {dueInfo.remainingMiles} {unitLabel} remaining
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Interval info */}
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <h3 className="text-xs text-gray-500 uppercase mb-1">Maintenance Schedule</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {task.intervalMiles ? (
                      <span className="text-sm flex items-center">
                        <Wrench size={14} className="mr-1.5 text-blue-500" />
                        Every {formatDistance(task.intervalMiles)}
                      </span>
                    ) : null}
                    
                    {task.intervalDays ? (
                      <span className="text-sm flex items-center">
                        <Clock size={14} className="mr-1.5 text-blue-500" />
                        Every {task.intervalDays} days
                      </span>
                    ) : null}
                    
                    {task.isRecurring ? (
                      <span className="text-sm flex items-center text-green-600">
                        <CheckCircle size={14} className="mr-1.5" />
                        Recurring
                      </span>
                    ) : (
                      <span className="text-sm flex items-center text-gray-600">
                        <CheckCircle size={14} className="mr-1.5" />
                        One-time
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
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
                
                {/* Mileage Tracking Options - Improved UI */}
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
                    {/* Tracking Type Selection with Visual Indicators */}
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
                            <div className="absolute h-full bg-blue-500 rounded-full" style={{ width: '33%' }}></div>
                            <div className="absolute h-full bg-blue-500 rounded-full" style={{ left: '66%', width: '33%' }}></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Current</span>
                            <span>Every X {unitLabel}/days</span>
                            <span>Repeat</span>
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
                            <span>Target milestone</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Input fields based on selected type */}
                    {mileageType === 'interval' && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
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
                          
                          {formData.intervalMiles && (
                            <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                              {nextDuePreview.mileage && (
                                <span>Next service will be due at approximately: {formatDistance(nextDuePreview.mileage)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="intervalDays" className="block text-sm font-medium text-gray-700">
                            Or time interval:
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
                              placeholder="180"
                            />
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                              days
                            </span>
                          </div>
                          
                          {formData.intervalDays && nextDuePreview.date && (
                            <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                              Next service will be due on: {format(nextDuePreview.date, "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Advanced options for interval-based tracking */}
                    {mileageType === 'interval' && showAdvancedOptions && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Advanced: Interval Calculation Method
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
                    
                    {/* Absolute mileage input */}
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
                            min="1"
                            value={formData.nextDueMileage}
                            onChange={handleChange}
                            className="flex-grow block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="10000"
                          />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            {unitLabel}
                          </span>
                        </div>
                        
                        {formData.nextDueMileage && (
                          <div className="mt-2 bg-blue-50 p-2 rounded text-xs text-blue-600">
                            Task will be due at exactly {formData.nextDueMileage} {unitLabel}
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
                
                <div className="flex justify-between pt-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Manage Task
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Delete/Archive Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium">Manage Maintenance Task</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Choose how you want to handle this maintenance task.
                </p>
              </div>
              
              <div className="mb-6 space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5 mt-1">
                    <input
                      id="archive-option"
                      name="task-action"
                      type="radio"
                      checked={deleteOption === 'archive'}
                      onChange={() => setDeleteOption('archive')}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="archive-option" className="font-medium text-gray-700">
                      Archive task
                    </label>
                    <p className="text-sm text-gray-500">
                      The task will be hidden from your maintenance schedule, but all history and records will be preserved.
                      We can restore archived tasks later.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5 mt-1">
                    <input
                      id="delete-option"
                      name="task-action"
                      type="radio"
                      checked={deleteOption === 'delete'}
                      onChange={() => setDeleteOption('delete')}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="delete-option" className="font-medium text-gray-700">
                      Delete task
                    </label>
                    <p className="text-sm text-gray-500">
                      The task will be permanently deleted. Past maintenance records will remain in your service history,
                      but will no longer be associated with this task.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    deleteOption === 'archive' 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    deleteOption === 'archive' ? 'focus:ring-blue-500' : 'focus:ring-red-500'
                  } disabled:opacity-50`}
                >
                  {isDeleting ? (
                    <span className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      {deleteOption === 'archive' ? (
                        <>
                          <Archive size={16} className="mr-2" />
                          Archive Task
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} className="mr-2" />
                          Delete Task
                        </>
                      )}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Info Modal */}
        {showMileageInfoModal && (
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
                  onClick={() => setShowMileageInfoModal(false)}
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