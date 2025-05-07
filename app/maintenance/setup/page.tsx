// app/maintenance/setup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Settings, Check, Wrench, 
  AlertTriangle, Bike, Calendar, ChevronRight, 
  BarChart3, RefreshCw,
  Plus
} from "lucide-react";
import ClientLayout from "../../components/ClientLayout";
import { useSettings } from "../../contexts/SettingsContext";

// Define types for our maintenance templates
interface MaintenanceTask {
  name: string;
  intervalMiles: number;
  intervalDays: number | null;
  priority: "low" | "medium" | "high";
}

interface MaintenanceTemplates {
  sport: MaintenanceTask[];
  cruiser: MaintenanceTask[];
  general: MaintenanceTask[];
  [key: string]: MaintenanceTask[]; // Index signature for type safety
}

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
}

export default function MaintenanceSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMotorcycleId = searchParams.get('motorcycle');
  const { formatDistance } = useSettings();
  
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<Motorcycle | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Define maintenance templates for different motorcycle types
  const maintenanceTemplates: MaintenanceTemplates = {
    sport: [
      { name: "Oil Change", intervalMiles: 3000, intervalDays: 180, priority: "high" },
      { name: "Chain Cleaning & Lubrication", intervalMiles: 500, intervalDays: 30, priority: "medium" },
      { name: "Valve Clearance Check", intervalMiles: 12000, intervalDays: 365, priority: "high" },
      { name: "Brake Fluid Change", intervalMiles: 12000, intervalDays: 730, priority: "high" },
      { name: "Coolant Change", intervalMiles: 24000, intervalDays: 730, priority: "medium" },
      { name: "Spark Plug Replacement", intervalMiles: 16000, intervalDays: 730, priority: "medium" },
    ],
    cruiser: [
      { name: "Oil Change", intervalMiles: 5000, intervalDays: 180, priority: "high" },
      { name: "Primary Drive Oil Change", intervalMiles: 10000, intervalDays: 365, priority: "medium" },
      { name: "Transmission Oil Change", intervalMiles: 10000, intervalDays: 365, priority: "medium" },
      { name: "Drive Belt Inspection", intervalMiles: 5000, intervalDays: 180, priority: "medium" },
      { name: "Brake Fluid Change", intervalMiles: 12000, intervalDays: 730, priority: "high" },
      { name: "Spark Plug Replacement", intervalMiles: 20000, intervalDays: 730, priority: "medium" },
    ],
    general: [
      { name: "Oil Change", intervalMiles: 4000, intervalDays: 180, priority: "high" },
      { name: "Chain Cleaning & Lubrication", intervalMiles: 500, intervalDays: 30, priority: "medium" },
      { name: "Tire Pressure Check", intervalMiles: 500, intervalDays: 14, priority: "high" },
      { name: "Air Filter Service", intervalMiles: 8000, intervalDays: 365, priority: "medium" },
      { name: "Brake Pad Check", intervalMiles: 5000, intervalDays: 180, priority: "high" },
      { name: "Battery Terminal Cleaning", intervalMiles: 5000, intervalDays: 180, priority: "low" },
    ]
  };
  
  useEffect(() => {
    const fetchMotorcycles = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/motorcycles");
        if (!response.ok) {
          throw new Error("Failed to fetch motorcycles");
        }
        
        const data = await response.json();
        setMotorcycles(data.motorcycles || []);
        
        // Set initial selection
        if (data.motorcycles && data.motorcycles.length > 0) {
          if (selectedMotorcycleId) {
            const found = data.motorcycles.find((m: Motorcycle) => m.id === selectedMotorcycleId);
            if (found) {
              setSelectedMotorcycle(found);
              
              // Auto-select category based on motorcycle type
              if (found.make.toLowerCase().includes('harley') || 
                  found.make.toLowerCase().includes('indian')) {
                setSelectedCategory('cruiser');
              } else if (found.make.toLowerCase().includes('ducati') || 
                         found.make.toLowerCase().includes('yamaha') && 
                         (found.model.toLowerCase().includes('r1') || 
                          found.model.toLowerCase().includes('r6'))) {
                setSelectedCategory('sport');
              } else {
                setSelectedCategory('general');
              }
            } else {
              setSelectedMotorcycle(data.motorcycles[0]);
            }
          } else {
            setSelectedMotorcycle(data.motorcycles[0]);
          }
        }
        
        // Initialize task selection (all selected by default)
        const initialSelection: Record<string, boolean> = {};
        maintenanceTemplates[selectedCategory].forEach((task) => {
          initialSelection[task.name] = true;
        });
        setSelectedTasks(initialSelection);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    fetchMotorcycles();
  }, [selectedMotorcycleId]);
  
  useEffect(() => {
    // Update task selection when category changes
    const initialSelection: Record<string, boolean> = {};
    maintenanceTemplates[selectedCategory].forEach((task) => {
      initialSelection[task.name] = true;
    });
    setSelectedTasks(initialSelection);
  }, [selectedCategory]);
  
  const handleMotorcycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = motorcycles.find(m => m.id === e.target.value) || null;
    setSelectedMotorcycle(selected);
  };
  
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };
  
  const handleTaskSelection = (taskName: string) => {
    setSelectedTasks(prev => ({
      ...prev,
      [taskName]: !prev[taskName]
    }));
  };
  
  const toggleAllTasks = (select: boolean) => {
    const newSelection: Record<string, boolean> = {};
    maintenanceTemplates[selectedCategory].forEach((task) => {
      newSelection[task.name] = select;
    });
    setSelectedTasks(newSelection);
  };
  
  const handleCreateSchedule = async () => {
    if (!selectedMotorcycle) {
      setError("Please select a motorcycle");
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      // Create array of tasks to create
      const tasksToCreate: Array<Record<string, any>> = [];
      
      maintenanceTemplates[selectedCategory].forEach((task) => {
        if (selectedTasks[task.name]) {
          tasksToCreate.push({
            motorcycleId: selectedMotorcycle.id,
            name: task.name,
            description: `Regular ${task.name.toLowerCase()} maintenance`,
            intervalMiles: task.intervalMiles,
            intervalDays: task.intervalDays,
            priority: task.priority,
            isRecurring: true,
            intervalBase: 'current'
          });
        }
      });
      
      if (tasksToCreate.length === 0) {
        throw new Error("Please select at least one task");
      }
      
      // Use the batch API to create all tasks at once
      const response = await fetch("/api/maintenance/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tasksToCreate),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create maintenance schedule");
      }
      
      // Redirect to maintenance page with success message
      router.push("/?setup=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create maintenance schedule");
    } finally {
      setCreating(false);
    }
  };
  
  if (loading) {
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
          <div className="max-w-3xl mx-auto">
            <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft size={16} className="mr-1" />
              Back to Dashboard
            </Link>
            
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Bike size={32} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-medium mb-2">No Motorcycles Found</h2>
              <p className="text-gray-600 mb-6">
                You need to add a motorcycle before setting up a maintenance schedule.
              </p>
              <Link
                href="/garage/add?initial=true"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={18} className="mr-2" />
                Add Your First Motorcycle
              </Link>
            </div>
          </div>
        </main>
      </ClientLayout>
    );
  }
  
  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/maintenance" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} className="mr-1" />
            Back to Maintenance
          </Link>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 rounded-lg mr-4">
                  <Settings size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Maintenance Setup</h1>
                  <p className="text-blue-100">
                    Choose a maintenance schedule template for your motorcycle
                  </p>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}
            
            <div className="p-6">
              {/* Motorcycle selection */}
              <div className="mb-6">
                <label htmlFor="motorcycleSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Choose a motorcycle
                </label>
                <select
                  id="motorcycleSelect"
                  value={selectedMotorcycle?.id || ""}
                  onChange={handleMotorcycleChange}
                  disabled={creating}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {motorcycles.map((motorcycle) => (
                    <option key={motorcycle.id} value={motorcycle.id}>
                      {motorcycle.name} ({motorcycle.year} {motorcycle.make} {motorcycle.model})
                    </option>
                  ))}
                </select>
                {selectedMotorcycle?.currentMileage !== null && (
                  <p className="mt-1 text-sm text-gray-500">
                    Current mileage: {selectedMotorcycle && selectedMotorcycle.currentMileage !== null ? formatDistance(selectedMotorcycle.currentMileage) : "N/A"}
                  </p>
                )}
              </div>
              
              {/* Category selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose a maintenance template
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleCategoryChange("sport")}
                    className={`p-4 border rounded-lg transition ${
                      selectedCategory === "sport" 
                        ? "border-blue-500 bg-blue-50 text-blue-700" 
                        : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                    disabled={creating}
                  >
                    <h3 className="font-medium">Sport Bike</h3>
                    <p className="text-sm text-gray-500">
                      For high-performance and sport motorcycles
                    </p>
                  </button>
                  
                  <button
                    onClick={() => handleCategoryChange("cruiser")}
                    className={`p-4 border rounded-lg transition ${
                      selectedCategory === "cruiser" 
                        ? "border-blue-500 bg-blue-50 text-blue-700" 
                        : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                    disabled={creating}
                  >
                    <h3 className="font-medium">Cruiser</h3>
                    <p className="text-sm text-gray-500">
                      For cruisers and touring motorcycles
                    </p>
                  </button>
                  
                  <button
                    onClick={() => handleCategoryChange("general")}
                    className={`p-4 border rounded-lg transition ${
                      selectedCategory === "general" 
                        ? "border-blue-500 bg-blue-50 text-blue-700" 
                        : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                    }`}
                    disabled={creating}
                  >
                    <h3 className="font-medium">General</h3>
                    <p className="text-sm text-gray-500">
                      Standard maintenance for most motorcycles
                    </p>
                  </button>
                </div>
              </div>
              
              {/* Task selection */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select maintenance tasks to include
                  </label>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => toggleAllTasks(true)}
                      disabled={creating}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAllTasks(false)}
                      disabled={creating}
                      className="text-xs font-medium text-gray-600 hover:text-gray-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                <div className="border rounded-md overflow-hidden mb-4">
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
                      {maintenanceTemplates[selectedCategory].map((t, index) => (
                        <tr 
                          key={`${t.name}-${index}`} 
                          className={`hover:bg-gray-50 ${!selectedTasks[t.name] ? 'bg-gray-50 text-gray-400' : ''}`}
                        >
                          <td className="px-3 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedTasks[t.name] || false}
                              onChange={() => handleTaskSelection(t.name)}
                              disabled={creating}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className={`text-sm font-medium ${!selectedTasks[t.name] ? 'text-gray-400' : 'text-gray-900'}`}>
                              {t.name}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                            {t.intervalMiles && `Every ${formatDistance(t.intervalMiles)}`}
                            {t.intervalMiles && t.intervalDays && " or "}
                            {t.intervalDays && `${t.intervalDays} days`}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                          {
                            selectedMotorcycle && selectedMotorcycle.currentMileage != null && t.intervalMiles != null 
                                ? `At ${formatDistance(selectedMotorcycle.currentMileage + t.intervalMiles)}`
                                : "N/A"
                            }
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                t.priority === "high"
                                  ? "bg-red-100 text-red-800"
                                  : t.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <RefreshCw className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Recurring Maintenance</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          All selected tasks will be added to your maintenance schedule. The app will remind you when 
                          maintenance is due based on both mileage and time intervals. After completing a task, 
                          the schedule will automatically reset for the next interval.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Link
                  href="/maintenance"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleCreateSchedule}
                  disabled={creating}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-2" />
                      Create Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </ClientLayout>
  );
}