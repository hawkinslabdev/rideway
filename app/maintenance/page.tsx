// File: app/maintenance/page.tsx
"use client";

import { useState, useEffect } from "react";
import ClientLayout from "../components/ClientLayout";
import { Archive, Calendar, Plus, Filter, ChevronLeft, ChevronRight, Search, X, Check, Download } from "lucide-react";
import { 
  format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, subMonths, isSameMonth, isToday, isSameDay, parseISO,
  eachDayOfInterval
} from "date-fns";
import Link from "next/link";
import { useSettings } from "../contexts/SettingsContext";
import MaintenanceTemplateImporter from "../components/MaintenanceTemplateImporter";
import ArchivedTasksView from "../components/ArchivedTasksView";

interface MaintenanceTask {
  id: string;
  motorcycle: string;
  motorcycleId: string;
  task: string;
  description: string | null;
  dueDate: string | null;
  dueMileage: number | null;
  priority: string;
  isDue: boolean;
  currentMileage: number | null;
}

// New interface for motorcycles in the filter
interface MotorcycleOption {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
}

export default function MaintenancePage() {
  const { settings, formatDistance, updateSetting } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Use the view preference from settings or default to calendar
  const [view, setView] = useState<"calendar" | "list">(settings.maintenanceView || "calendar");
  
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [motorcycles, setMotorcycles] = useState<MotorcycleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for motorcycle filter
  const [selectedMotorcycles, setSelectedMotorcycles] = useState<string[]>([]);
  const [showMotorcycleFilter, setShowMotorcycleFilter] = useState(false);
  
  // State for template importer
  const [showTemplateImporter, setShowTemplateImporter] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch maintenance tasks
        const tasksResponse = await fetch("/api/maintenance");
        if (!tasksResponse.ok) {
          throw new Error("Failed to fetch maintenance tasks");
        }
        const tasksData = await tasksResponse.json();
        setMaintenanceTasks(tasksData.tasks);
        
        // Fetch motorcycles for the filter
        const motorcyclesResponse = await fetch("/api/motorcycles");
        if (!motorcyclesResponse.ok) {
          throw new Error("Failed to fetch motorcycles");
        }
        const motorcyclesData = await motorcyclesResponse.json();
        setMotorcycles(motorcyclesData.motorcycles);
        
        // Check for success messages in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('created') === 'true') {
          setImportSuccess("Maintenance task created successfully");
          // Clear the URL parameter
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('imported') === 'true') {
          setImportSuccess("Maintenance templates imported successfully");
          // Clear the URL parameter
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle view switching with persistence
  const handleViewChange = (newView: "calendar" | "list") => {
    setView(newView);
    // Save the view preference to settings
    updateSetting("maintenanceView", newView);
  };

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  // Get all days in the date range
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Group days into weeks for the grid
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  calendarDays.forEach(day => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Toggle motorcycle selection in the filter
  const toggleMotorcycle = (motorcycleId: string) => {
    setSelectedMotorcycles(prev => {
      if (prev.includes(motorcycleId)) {
        return prev.filter(id => id !== motorcycleId);
      } else {
        return [...prev, motorcycleId];
      }
    });
  };
  
  // Select or deselect all motorcycles
  const toggleAllMotorcycles = () => {
    if (selectedMotorcycles.length === motorcycles.length) {
      setSelectedMotorcycles([]);
    } else {
      setSelectedMotorcycles(motorcycles.map(m => m.id));
    }
  };
  
  // Filter tasks for both calendar and list views
  const filteredTasks = maintenanceTasks.filter(task => {
    const matchesSearch = task.task.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         task.motorcycle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    
    // Check if task matches selected motorcycles (if any are selected)
    const matchesMotorcycle = selectedMotorcycles.length === 0 || 
                             selectedMotorcycles.includes(task.motorcycleId);
    
    return matchesSearch && matchesPriority && matchesMotorcycle;
  });
  
  // Get tasks for a specific calendar date
  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => {
      if (!task.dueDate) return false;
      return isSameDay(parseISO(task.dueDate), date);
    });
  };
  
  const hasTasks = (date: Date) => {
    return getTasksForDate(date).length > 0;
  };

  // Sort tasks by due date for list view
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
  
  // Handle importing templates
  const handleImportTasks = async (tasks: any[]) => {
    try {
      const response = await fetch("/api/maintenance/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tasks),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import maintenance templates");
      }
      
      const data = await response.json();
      
      // Refresh the tasks list
      const tasksResponse = await fetch("/api/maintenance");
      if (!tasksResponse.ok) {
        throw new Error("Failed to refresh maintenance tasks");
      }
      const tasksData = await tasksResponse.json();
      setMaintenanceTasks(tasksData.tasks);
      
      // Show success message
      setImportSuccess(`Successfully imported ${data.tasks.length} maintenance tasks`);
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
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

  if (error) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </main>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Maintenance Schedule</h1>
          <p className="text-gray-600">Plan and track your motorcycle maintenance</p>
        </div>
        
        {/* Success message */}
        {importSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-800">{importSuccess}</p>
            <button 
              onClick={() => setImportSuccess(null)} 
              className="ml-auto text-green-700 hover:text-green-900"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleViewChange("calendar")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    view === "calendar" ? "bg-white shadow" : "text-gray-600"
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => handleViewChange("list")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    view === "list" ? "bg-white shadow" : "text-gray-600"
                  }`}
                >
                  List
                </button>
              </div>
              
              <div className="relative max-w-xs">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Motorcycle Filter Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMotorcycleFilter(!showMotorcycleFilter)}
                  className={`inline-flex items-center px-3 py-2 border ${
                    selectedMotorcycles.length > 0 
                      ? "border-blue-500 text-blue-700 bg-blue-50" 
                      : "border-gray-300 text-gray-700"
                  } rounded-md text-sm font-medium hover:bg-gray-50`}
                >
                  <Filter size={16} className="mr-2" />
                  Motorcycles
                  {selectedMotorcycles.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {selectedMotorcycles.length}
                    </span>
                  )}
                </button>
                
                {/* Dropdown for motorcycle filter */}
                {showMotorcycleFilter && (
                  <div className="absolute mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <div className="p-2 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Filter by Motorcycle</h3>
                        <button
                          onClick={() => setShowMotorcycleFilter(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                      <div 
                        className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={toggleAllMotorcycles}
                      >
                        <div className={`w-5 h-5 mr-2 flex items-center justify-center border rounded ${
                          selectedMotorcycles.length === motorcycles.length 
                            ? "bg-blue-500 border-blue-500 text-white" 
                            : "border-gray-300"
                        }`}>
                          {selectedMotorcycles.length === motorcycles.length && <Check size={12} />}
                        </div>
                        <span className="text-sm font-medium">
                          {selectedMotorcycles.length === motorcycles.length ? "Deselect All" : "Select All"}
                        </span>
                      </div>
                      
                      {motorcycles.map(motorcycle => (
                        <div 
                          key={motorcycle.id}
                          className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleMotorcycle(motorcycle.id)}
                        >
                          <div className={`w-5 h-5 mr-2 flex items-center justify-center border rounded ${
                            selectedMotorcycles.includes(motorcycle.id) 
                              ? "bg-blue-500 border-blue-500 text-white" 
                              : "border-gray-300"
                          }`}>
                            {selectedMotorcycles.includes(motorcycle.id) && <Check size={12} />}
                          </div>
                          <div className="flex-1 text-sm">
                            <div className="font-medium">{motorcycle.name}</div>
                            <div className="text-xs text-gray-500">
                              {motorcycle.year} {motorcycle.make} {motorcycle.model}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`inline-flex items-center px-4 py-2 border ${
                          showArchived ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700'
                        } rounded-md text-sm font-medium hover:bg-gray-50`}
                      >
                        <Archive size={16} className="mr-2" />
                        {showArchived ? "Hide Archived" : "Show Archived"}
                      </button>
                    <div className="p-2 border-t flex justify-end">
                      <button
                        onClick={() => setShowMotorcycleFilter(false)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowTemplateImporter(true)}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50"
              >
                <Download size={16} className="mr-2" />
                Import Templates
              </button>
              
              {/* Add the Archive button right here */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center px-4 py-2 border ${
                  showArchived ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700'
                } rounded-md text-sm font-medium hover:bg-gray-50`}
              >
                <Archive size={16} className="mr-2" />
                {showArchived ? "Hide Archived" : "Show Archived"}
              </button>
              
              <Link
                href="/maintenance/add"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={16} className="mr-2" />
                Add Task
              </Link>
            </div>

          </div>
          
          {/* Active filters display */}
          {selectedMotorcycles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs font-medium text-gray-500">Active Filters:</span>
              {selectedMotorcycles.map(motorcycleId => {
                const motorcycle = motorcycles.find(m => m.id === motorcycleId);
                return motorcycle ? (
                  <div 
                    key={motorcycleId}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                  >
                    <span>{motorcycle.name}</span>
                    <button 
                      className="ml-1.5 text-blue-600 hover:text-blue-900"
                      onClick={() => toggleMotorcycle(motorcycleId)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null;
              })}
              <button 
                className="text-xs text-blue-600 hover:text-blue-900 hover:underline"
                onClick={() => setSelectedMotorcycles([])}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Calendar View */}
        {view === "calendar" && (
          <div className="bg-white rounded-lg shadow">
            {/* Calendar Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  Today
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {weeks.map((week, weekIndex) => (
                  // Render each week
                  week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`bg-white p-2 min-h-[80px] cursor-pointer hover:bg-gray-50 ${
                        !isSameMonth(day, currentDate) ? "text-gray-400" : ""
                      } ${
                        isToday(day) ? "ring-2 ring-blue-500" : ""
                      } ${selectedDate && isSameDay(day, selectedDate) ? "bg-blue-50" : ""}`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="font-medium text-sm mb-1">
                        {format(day, "d")}
                      </div>
                      {hasTasks(day) && (
                        <div className="space-y-1 max-h-[60px] overflow-y-auto">
                          {getTasksForDate(day).map(task => (
                            <div
                              key={task.id}
                              className={`text-xs p-1 rounded truncate ${
                                task.priority === "high"
                                  ? "bg-red-100 text-red-800"
                                  : task.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                              title={`${task.motorcycle}: ${task.task}`}
                            >
                              {task.motorcycle}: {task.task}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )).flat()}
              </div>
            </div>

            {/* Selected Date Tasks */}
            {selectedDate && (
              <div className="border-t p-4">
                <h3 className="font-semibold mb-2">
                  Tasks for {format(selectedDate, "MMMM d, yyyy")}
                </h3>
                {getTasksForDate(selectedDate).length > 0 ? (
                  <div className="space-y-2">
                    {getTasksForDate(selectedDate).map(task => (
                      <div key={task.id} className="flex justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{task.task}</div>
                          <div className="text-sm text-gray-500">{task.motorcycle}</div>
                          {task.description && (
                            <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                          )}
                        </div>
                        <div className="flex items-start space-x-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              task.priority === "high"
                                ? "bg-red-100 text-red-800"
                                : task.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {task.priority}
                          </span>
                          <Link
                            href={`/maintenance/${task.id}/complete`}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Complete
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No tasks scheduled for this day</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motorcycle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Mileage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedTasks.length > 0 ? (
                    sortedTasks.map(task => (
                      <tr key={task.id} className={`hover:bg-gray-50 ${task.isDue ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{task.task}</div>
                          {task.description && (
                            <div className="text-xs text-gray-500">{task.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.motorcycle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.dueDate ? format(parseISO(task.dueDate), "MMM d, yyyy") : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.dueMileage ? formatDistance(task.dueMileage) : "N/A"}
                          {task.currentMileage && task.dueMileage ? (
                            task.currentMileage < task.dueMileage ? 
                              ` (${formatDistance(task.dueMileage - task.currentMileage)} left)` : 
                              ` (${formatDistance(task.currentMileage - task.dueMileage)} overdue)`
                          ) : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/maintenance/${task.id}/complete`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Complete
                          </Link>
                          <Link
                            href={`/maintenance/${task.id}/edit`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        {maintenanceTasks.length === 0 
                          ? "No maintenance tasks found" 
                          : "No tasks match your search criteria"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Maintenance Template Importer Modal */}
        {showTemplateImporter && (
          <MaintenanceTemplateImporter
            motorcycles={motorcycles}
            onClose={() => setShowTemplateImporter(false)}
            onImport={handleImportTasks}
          />
        )}

        {/* Add this section here - Archived Tasks Section */}
        {showArchived && (
          <div className="mt-6">
            <ArchivedTasksView />
          </div>
        )}
      </main>
    </ClientLayout>
  );
}