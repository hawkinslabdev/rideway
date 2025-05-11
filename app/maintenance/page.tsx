// app/maintenance/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import ClientLayout from "../components/ClientLayout";
import MaintenanceTaskCard from "../components/MaintenanceTaskCard";
import MaintenanceTimeline from "../components/MaintenanceTimeline";
import QuickAddMaintenanceModal from "../components/QuickAddMaintenanceModal";
import { 
  Archive, Calendar, Bike, Plus, Filter, ChevronLeft, ChevronRight, 
  Search, X, Check, Download, List, BarChart, Clock, 
  AlertTriangle, AlertCircle, Gauge, Info, Wrench,
  CheckCircle, History, Bell, ArrowRight, LayoutGrid,
  RefreshCw
} from "lucide-react";
import { 
  format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, subMonths, isSameMonth, isToday, isSameDay, parseISO,
  eachDayOfInterval, addWeeks, isAfter, isBefore, differenceInDays
} from "date-fns";
import Link from "next/link";
import { useSettings } from "../contexts/SettingsContext";
import MaintenanceTemplateImporter from "../components/MaintenanceTemplateImporter";
import ArchivedTasksView from "../components/ArchivedTasksView";
import { motion, AnimatePresence } from "framer-motion";

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
  remainingMiles: number | null;
  completionPercentage: number | null;
  intervalMiles: number | null;
  intervalDays: number | null;
}

interface MotorcycleOption {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
  imageUrl?: string;
}

export default function MaintenancePage() {
  const { settings, formatDistance, updateSetting } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showTemplateImporter, setShowTemplateImporter] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Use the view preference from settings or default to dashboard
  const [view, setView] = useState<"dashboard" | "calendar" | "list" | "grid">(
    settings.maintenanceView || "dashboard"
  );
  
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [motorcycles, setMotorcycles] = useState<MotorcycleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month" | "overdue">("all");
  
  // State for motorcycle filter
  const [selectedMotorcycles, setSelectedMotorcycles] = useState<string[]>([]);
  const [showMotorcycleFilter, setShowMotorcycleFilter] = useState(false);
  const [activeMotorcycleTab, setActiveMotorcycleTab] = useState<string>("all");

  // Notification badge for mobile
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMotorcycleTab = localStorage.getItem('rideway-active-motorcycle-tab');
        if (savedMotorcycleTab) {
          setActiveMotorcycleTab(savedMotorcycleTab);
        }
      } catch (err) {
        console.error('Failed to load active motorcycle tab:', err);
      }
    }
  }, []);

  useEffect(() => {
    // Set notification badge if there are overdue tasks
    if (maintenanceTasks.some(task => task.isDue)) {
      setHasNewNotifications(true);
    }

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
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('imported') === 'true') {
          setImportSuccess("Maintenance templates imported successfully");
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('completed') === 'true') {
          setImportSuccess("Maintenance task completed successfully");
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('updated') === 'true') {
          setImportSuccess("Maintenance task updated successfully");
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
  const handleViewChange = (newView: "dashboard" | "calendar" | "list" | "grid") => {
    setView(newView);
    // Save the view preference to settings
    if (newView === "calendar" || newView === "list") {
      updateSetting("maintenanceView", newView);
    }
  };

  const handleMotorcycleTabChange = (motorcycleId: string) => {
    setActiveMotorcycleTab(motorcycleId);
    
    // Save preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('rideway-active-motorcycle-tab', motorcycleId);
    }
  };

  const handleQuickAddTask = async (taskData: any) => {
    try {
      const response = await fetch("/api/maintenance/task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create maintenance task");
      }
      
      // Refresh tasks
      const tasksResponse = await fetch("/api/maintenance");
      const tasksData = await tasksResponse.json();
      setMaintenanceTasks(tasksData.tasks);
      
      // Show success message
      setImportSuccess("Maintenance task created successfully");
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
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
    setSelectedDate(new Date());
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
  
  // Time-based filtering function
  const filterByTime = (task: MaintenanceTask): boolean => {
    if (timeFilter === "all") return true;
    
    if (!task.dueDate) return false;
    
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (timeFilter) {
      case "today":
        return isSameDay(dueDate, today);
      case "week":
        const weekEnd = addWeeks(today, 1);
        return (isAfter(dueDate, today) || isSameDay(dueDate, today)) && 
               (isBefore(dueDate, weekEnd) || isSameDay(dueDate, weekEnd));
      case "month":
        const monthEnd = addMonths(today, 1);
        return (isAfter(dueDate, today) || isSameDay(dueDate, today)) && 
               (isBefore(dueDate, monthEnd) || isSameDay(dueDate, monthEnd));
      case "overdue":
        return isBefore(dueDate, today);
      default:
        return true;
    }
  };
  
  // Filter tasks based on the active tab and other filters
  const filteredTasks = maintenanceTasks.filter(task => {
    const matchesSearch = task.task.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        task.motorcycle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    
    // Check if task matches the tab selection
    const matchesTab = activeMotorcycleTab === "all" || task.motorcycleId === activeMotorcycleTab;
    
    // Keep this for additional filtering with the dropdown
    const matchesSelectedMotorcycles = selectedMotorcycles.length === 0 || 
                                    selectedMotorcycles.includes(task.motorcycleId);
    
    // Check if task matches the time filter
    const matchesTimeFilter = filterByTime(task);
    
    return matchesSearch && matchesPriority && matchesTab && matchesSelectedMotorcycles && matchesTimeFilter;
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

  // Calculate task statistics
  const overdueTasks = filteredTasks.filter(task => task.isDue);
  const upcomingTasks = filteredTasks.filter(task => {
    if (!task.isDue && task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Due within the next 7 days
      return differenceInDays(dueDate, today) <= 7 && differenceInDays(dueDate, today) >= 0;
    }
    return false;
  });

  // Due today tasks
  const todayTasks = filteredTasks.filter(task => {
    if (task.dueDate) {
      return isToday(new Date(task.dueDate));
    }
    return false;
  });
  
  // Group tasks by motorcycle for the dashboard view
  const tasksByMotorcycle = motorcycles.map(motorcycle => {
    const tasks = filteredTasks.filter(task => task.motorcycleId === motorcycle.id);
    return {
      motorcycle,
      tasks,
      overdueCount: tasks.filter(task => task.isDue).length,
      upcomingCount: tasks.filter(task => {
        if (!task.isDue && task.dueDate) {
          const dueDate = new Date(task.dueDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return differenceInDays(dueDate, today) <= 7 && differenceInDays(dueDate, today) >= 0;
        }
        return false;
      }).length
    };
  }).filter(group => group.tasks.length > 0);

  // Calculate the overall completion percentage
  const calculateMaintenanceHealth = () => {
    if (filteredTasks.length === 0) return 100;
    return Math.max(0, Math.min(100, 100 - (overdueTasks.length / filteredTasks.length) * 100));
  };

  const maintenanceHealth = calculateMaintenanceHealth();

  // Sort tasks by due date for list view
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // First, sort by overdue status
    if (a.isDue && !b.isDue) return -1;
    if (!a.isDue && b.isDue) return 1;
    
    // Then sort by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    // Then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
           (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
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

  // Clear all active filters
  const clearAllFilters = () => {
    setFilterPriority("all");
    setSelectedMotorcycles([]);
    setSearchTerm("");
    setTimeFilter("all");
  };

  // Create task objects compatible with MaintenanceTaskCard component
  const mapTaskForComponent = (task: MaintenanceTask) => {
    return {
      ...task,
      intervalMiles: task.intervalMiles || null,
      intervalDays: task.intervalDays || null
    };
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-4 md:p-6">
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
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 flex items-start">
              <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </p>
            <button 
              onClick={clearAllFilters}
              className="mt-3 text-sm text-red-600 hover:text-red-800 flex items-center"
            >
              <RefreshCw size={14} className="mr-1" />
              Refresh
            </button>
          </div>
        </main>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Wrench size={24} className="mr-2 text-blue-600" />
                Maintenance
              </h1>
              <p className="text-gray-600 mt-1">
                Track and manage your motorcycle maintenance schedule
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              <Link 
                href="/maintenance/add" 
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 text-sm font-medium shadow-sm"
              >
                <Plus size={16} className="mr-1.5" />
                Add Task
              </Link>
              
              <button
                onClick={() => setShowQuickAddModal(true)}
                className="px-3 py-1.5 border border-blue-500 text-blue-600 bg-white rounded-md flex items-center hover:bg-blue-50 text-sm font-medium shadow-sm"
              >
                <Clock size={16} className="mr-1.5" />
                Quick Add
              </button>
              
              <div className="hidden md:flex">
                <button
                  onClick={() => setShowTemplateImporter(true)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 bg-white rounded-md flex items-center hover:bg-gray-50 text-sm font-medium shadow-sm"
                >
                  <Download size={16} className="mr-1.5" />
                  Import Templates
                </button>
              </div>
            </div>
          </div>
          
          {/* Success message with animation */}
          <AnimatePresence>
            {importSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 bg-green-50 border border-green-200 rounded-md p-4 flex items-center shadow-sm"
              >
                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <p className="text-green-800 flex-grow">{importSuccess}</p>
                <button 
                  onClick={() => setImportSuccess(null)} 
                  className="ml-3 text-green-700 hover:text-green-900 focus:outline-none"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View Selector and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* View toggle with scrollable container for mobile */}
            <div className="overflow-x-auto pb-1.5 -mx-1 px-1 w-full md:w-auto">
              <div className="bg-gray-100 rounded-lg p-1 inline-flex whitespace-nowrap min-w-min">
                <button
                  onClick={() => handleViewChange("dashboard")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all ${
                    view === "dashboard" 
                      ? "bg-white shadow-sm text-blue-600" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <BarChart size={16} className="mr-2 flex-shrink-0" />
                  Dashboard
                </button>
                <button
                  onClick={() => handleViewChange("calendar")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all ${
                    view === "calendar" 
                      ? "bg-white shadow-sm text-blue-600" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Calendar size={16} className="mr-2 flex-shrink-0" />
                  Calendar
                </button>
                <button
                  onClick={() => handleViewChange("list")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all ${
                    view === "list" 
                      ? "bg-white shadow-sm text-blue-600" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <List size={16} className="mr-2 flex-shrink-0" />
                  List
                </button>
                <button
                  onClick={() => handleViewChange("grid")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all ${
                    view === "grid" 
                      ? "bg-white shadow-sm text-blue-600" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <LayoutGrid size={16} className="mr-2 flex-shrink-0" />
                  Grid
                </button>
              </div>
            </div>
            
            {/* Filters - horizontal scrollable container */}
            <div className="overflow-x-auto pb-1.5 -mx-1 px-1 w-full md:w-auto">
              <div className="flex items-center gap-2 whitespace-nowrap min-w-min">
                {/* Time filter - improved dropdown */}
                {view !== "calendar" && (
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as any)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500 flex-shrink-0"
                  >
                    <option value="all">All Tasks</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Due Today</option>
                    <option value="week">Due This Week</option>
                    <option value="month">Due This Month</option>
                  </select>
                )}
                
                {/* Search box */}
                <div className="relative max-w-xs flex-shrink-0">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-8 py-1.5 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      onClick={() => setSearchTerm("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                {/* Motorcycle Filter Button */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowMotorcycleFilter(!showMotorcycleFilter)}
                    className={`inline-flex items-center px-3 py-1.5 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                      selectedMotorcycles.length > 0 
                        ? "border-blue-500 text-blue-700 bg-blue-50" 
                        : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <Filter size={16} className="mr-2 flex-shrink-0" />
                    Motorcycles
                    {selectedMotorcycles.length > 0 && (
                      <span className="ml-1.5 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {selectedMotorcycles.length}
                      </span>
                    )}
                  </button>
                  
                  {/* Dropdown Filter Menu */}
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
                
                {/* Archive toggle */}
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`inline-flex items-center px-3 py-1.5 border rounded-md shadow-sm text-sm font-medium transition-colors flex-shrink-0 ${
                    showArchived 
                      ? 'border-blue-500 text-blue-700 bg-blue-50' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  <Archive size={16} className="mr-2 flex-shrink-0" />
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </button>
              </div>
            </div>
          </div>
          
          {/* Active filters */}
          {(selectedMotorcycles.length > 0 || searchTerm || filterPriority !== "all" || timeFilter !== "all") && (
            <div className="mt-4 pt-3 border-t border-gray-200 overflow-x-auto pb-1">
              <div className="flex flex-wrap gap-2 items-center min-w-min">
                <span className="text-xs font-medium text-gray-500">Active Filters:</span>
                {selectedMotorcycles.length > 0 && selectedMotorcycles.map(motorcycleId => {
                  const motorcycle = motorcycles.find(m => m.id === motorcycleId);
                  return motorcycle ? (
                    <div 
                      key={motorcycleId}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md shadow-sm"
                    >
                      <span>{motorcycle.name}</span>
                      <button 
                        className="ml-1.5 text-blue-600 hover:text-blue-900"
                        onClick={() => toggleMotorcycle(motorcycleId)}
                        aria-label={`Remove ${motorcycle.name} filter`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : null;
                })}
                
                {searchTerm && (
                  <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-md shadow-sm">
                    <span>Search: {searchTerm}</span>
                    <button 
                      className="ml-1.5 text-gray-600 hover:text-gray-900"
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                
                {filterPriority !== "all" && (
                  <div className={`inline-flex items-center px-2 py-1 text-xs rounded-md shadow-sm
                    ${filterPriority === "high" 
                      ? "bg-red-100 text-red-800" 
                      : filterPriority === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    <span>Priority: {filterPriority}</span>
                    <button 
                      className={`ml-1.5 ${
                        filterPriority === "high"
                          ? "text-red-600 hover:text-red-900"
                          : filterPriority === "medium"
                            ? "text-yellow-600 hover:text-yellow-900"
                            : "text-green-600 hover:text-green-900"
                      }`}
                      onClick={() => setFilterPriority("all")}
                      aria-label="Clear priority filter"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                
                {timeFilter !== "all" && (
                  <div className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md shadow-sm">
                    <span>Time: {timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}</span>
                    <button 
                      className="ml-1.5 text-purple-600 hover:text-purple-900"
                      onClick={() => setTimeFilter("all")}
                      aria-label="Clear time filter"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                
                <button 
                  className="text-xs text-blue-600 hover:text-blue-900 hover:underline ml-2"
                  onClick={clearAllFilters}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Motorcycle Selector (only show if not using desktop view) */}
        <div className="md:hidden mb-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <select
              id="motorcycleSelect"
              value={activeMotorcycleTab}
              onChange={(e) => handleMotorcycleTabChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-3 text-base border-none focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Motorcycles</option>
              {motorcycles.map(motorcycle => (
                <option key={motorcycle.id} value={motorcycle.id}>
                  {motorcycle.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Motorcycle Tabs */}
        <div className="hidden md:block mb-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleMotorcycleTabChange("all")}
                className={`px-6 py-3.5 whitespace-nowrap font-medium text-sm focus:outline-none transition ${
                  activeMotorcycleTab === "all" 
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/30' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                All Motorcycles
              </button>
              
              {motorcycles.map(motorcycle => (
                <button
                  key={motorcycle.id}
                  onClick={() => handleMotorcycleTabChange(motorcycle.id)}
                  className={`px-6 py-3.5 whitespace-nowrap font-medium text-sm focus:outline-none transition relative ${
                    activeMotorcycleTab === motorcycle.id 
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/30' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-b-2 hover:border-gray-300'
                  }`}
                >
                  {motorcycle.name}
                  {maintenanceTasks.some(t => t.motorcycleId === motorcycle.id && t.isDue) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard View */}
        {view === "dashboard" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Total Tasks</h3>
                    <Wrench size={18} className="text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">{filteredTasks.length}</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-500">{motorcycles.length} motorcycles</span>
                  </div>
                </div>
                <div className="h-1 bg-blue-500"></div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Overdue</h3>
                    <AlertTriangle size={18} className={`${overdueTasks.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
                  </div>
                  <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : ''}`}>
                    {overdueTasks.length}
                  </p>
                  {overdueTasks.length > 0 ? (
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-red-500">Requires attention</span>
                    </div>
                  ) : (
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-green-500">All up to date</span>
                    </div>
                  )}
                </div>
                <div className="h-1 bg-red-500"></div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Due Soon</h3>
                    <Calendar size={18} className="text-amber-500" />
                  </div>
                  <p className={`text-2xl font-bold ${upcomingTasks.length > 0 ? 'text-amber-600' : ''}`}>
                    {upcomingTasks.length}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-500">Next 7 days</span>
                  </div>
                </div>
                <div className="h-1 bg-amber-500"></div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-500">Due Today</h3>
                    <Clock size={18} className="text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">{todayTasks.length}</p>
                  <div className="flex items-center mt-1">
                    <Link href="/history" className="text-xs text-blue-600 hover:underline flex items-center">
                      <History size={12} className="mr-1" />
                      View history
                    </Link>
                  </div>
                </div>
                <div className="h-1 bg-blue-500"></div>
              </div>
            </div>
            
            {/* Overall maintenance status */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-medium text-gray-700 flex items-center">
                  <Gauge size={18} className="mr-2 text-blue-500" />
                  Maintenance Status
                </h2>
                {filteredTasks.length > 0 && (
                  <div className="flex items-center text-xs">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                    <span className="mr-3">Up to date</span>
                    <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1"></span>
                    <span className="mr-3">Upcoming</span>
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                    <span>Overdue</span>
                  </div>
                )}
              </div>
              
              {filteredTasks.length > 0 ? (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Overall Status</span>
                    <span>
                      <span className="text-red-500 font-medium">{overdueTasks.length} overdue</span>, 
                      <span className="text-amber-500 font-medium ml-1">{upcomingTasks.length} upcoming</span>, 
                      <span className="text-green-500 font-medium ml-1">
                        {filteredTasks.length - overdueTasks.length - upcomingTasks.length} on track
                      </span>
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-red-500 transition-all duration-500 ease-in-out" 
                      style={{width: `${Math.max(2, (overdueTasks.length / filteredTasks.length) * 100)}%`}}
                    ></div>
                    <div 
                      className="h-full bg-amber-500 transition-all duration-500 ease-in-out" 
                      style={{width: `${Math.max(2, (upcomingTasks.length / filteredTasks.length) * 100)}%`}}
                    ></div>
                    <div 
                      className="h-full bg-green-500 transition-all duration-500 ease-in-out" 
                      style={{
                        width: `${Math.max(2, ((filteredTasks.length - overdueTasks.length - upcomingTasks.length) / 
                        filteredTasks.length) * 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className={`text-sm font-medium inline-flex items-center ${
                      maintenanceHealth > 75 
                        ? "text-green-600" 
                        : maintenanceHealth > 50 
                          ? "text-amber-600" 
                          : "text-red-600"
                    }`}>
                      {maintenanceHealth > 75 
                        ? <CheckCircle size={16} className="mr-1" />
                        : maintenanceHealth > 50
                          ? <AlertCircle size={16} className="mr-1" />
                          : <AlertTriangle size={16} className="mr-1" />
                      }
                      {maintenanceHealth > 75 
                        ? "Maintenance on track" 
                        : maintenanceHealth > 50 
                          ? "Attention needed soon" 
                          : "Immediate attention needed"
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 text-center py-4 rounded-lg">
                  <p className="text-gray-500">Add maintenance tasks to see your status</p>
                </div>
              )}
            </div>
            
            {/* Visual maintenance timeline for single motorcycle */}
            {filteredTasks.length > 0 && activeMotorcycleTab !== "all" && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b">
                  <h2 className="font-medium text-gray-700 flex items-center">
                    <Calendar size={18} className="mr-2 text-blue-500" />
                    {motorcycles.find(m => m.id === activeMotorcycleTab)?.name} Timeline
                  </h2>
                </div>
                <div className="p-4">
                  <MaintenanceTimeline 
                    motorcycleId={activeMotorcycleTab}
                    tasks={filteredTasks}
                    currentMileage={motorcycles.find(m => m.id === activeMotorcycleTab)?.currentMileage || null}
                    milesPerDay={30}
                  />
                </div>
              </div>
            )}
            
            {/* Quick actions section */}
            {filteredTasks.length > 0 && overdueTasks.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-red-100 bg-red-50 flex justify-between items-center">
                  <h2 className="font-medium text-red-800 flex items-center">
                    <AlertTriangle size={20} className="text-red-500 mr-2" />
                    Overdue Maintenance
                  </h2>
                  {overdueTasks.length > 1 && (
                    <button className="text-sm text-red-600 hover:text-red-800 flex items-center">
                      <Check size={14} className="mr-1" />
                      Complete all
                    </button>
                  )}
                </div>
                <div className="divide-y divide-red-100">
                  {overdueTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="p-4 flex justify-between items-center bg-white hover:bg-red-50 transition-colors">
                      <div>
                        <h3 className="font-medium">{task.task}</h3>
                        <p className="text-sm text-gray-600">{task.motorcycle}</p>
                        <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                          {task.dueDate && (
                            <span className="flex items-center">
                              <Calendar size={12} className="mr-1 text-red-500" />
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {task.dueMileage && (
                            <span className="flex items-center">
                              <Gauge size={12} className="mr-1 text-red-500" />
                              At: {formatDistance(task.dueMileage)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/maintenance/${task.id}/complete`}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 font-medium shadow-sm flex items-center"
                      >
                        <Check size={14} className="mr-1.5" />
                        Complete
                      </Link>
                    </div>
                  ))}
                  {overdueTasks.length > 3 && (
                    <div className="p-3 text-center bg-red-50">
                      <Link 
                        href="/maintenance?timeFilter=overdue" 
                        className="text-sm text-red-600 hover:text-red-800 hover:underline flex items-center justify-center"
                      >
                        View all {overdueTasks.length} overdue tasks
                        <ArrowRight size={14} className="ml-1" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Due Today Section */}
            {todayTasks.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-blue-100 bg-blue-50 flex justify-between items-center">
                  <h2 className="font-medium text-blue-800 flex items-center">
                    <Clock size={20} className="text-blue-600 mr-2" />
                    Due Today
                  </h2>
                </div>
                <div className="divide-y divide-blue-100">
                  {todayTasks.map(task => (
                    <div key={task.id} className="p-4 flex justify-between items-center bg-white hover:bg-blue-50 transition-colors">
                      <div>
                        <h3 className="font-medium">{task.task}</h3>
                        <p className="text-sm text-gray-600">{task.motorcycle}</p>
                        {task.dueMileage && (
                          <div className="flex mt-1 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Gauge size={12} className="mr-1 text-blue-500" />
                              At: {formatDistance(task.dueMileage)}
                            </span>
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/maintenance/${task.id}/complete`}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium shadow-sm flex items-center"
                      >
                        <Check size={14} className="mr-1.5" />
                        Complete
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Tasks By Motorcycle */}
            {tasksByMotorcycle.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="p-4 border-b">
                  <h2 className="font-medium text-gray-700 flex items-center">
                    <Bike size={18} className="mr-2 text-blue-500" />
                    By Motorcycle
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {tasksByMotorcycle.map(group => (
                    <div key={group.motorcycle.id} className="p-4">
                      {/* Motorcycle header with stats */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-3 border border-gray-300 overflow-hidden">
                            {group.motorcycle.imageUrl ? (
                              <img 
                                src={group.motorcycle.imageUrl} 
                                alt={group.motorcycle.name} 
                                className="w-14 h-14 object-cover"
                              />
                            ) : (
                              <Bike size={24} className="text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{group.motorcycle.name}</h3>
                            <p className="text-sm text-gray-500">
                              {group.motorcycle.year} {group.motorcycle.make} {group.motorcycle.model}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex space-x-2 mb-1">
                            {group.overdueCount > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full shadow-sm">
                                {group.overdueCount} overdue
                              </span>
                            )}
                            {group.upcomingCount > 0 && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full shadow-sm">
                                {group.upcomingCount} upcoming
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {group.motorcycle.currentMileage 
                              ? `Current: ${formatDistance(group.motorcycle.currentMileage)}` 
                              : "No mileage set"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Task progress bars */}
                      <div className="space-y-3 mt-4">
                        {group.tasks.slice(0, 3).map(task => (
                          <div key={task.id} className="group">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center">
                                <span className={`w-2.5 h-2.5 rounded-full mr-2 ${
                                  task.isDue ? 'bg-red-500' : 
                                  task.completionPercentage && task.completionPercentage > 75 ? 'bg-amber-500' : 
                                  'bg-green-500'
                                }`}></span>
                                <span className="text-sm font-medium">{task.task}</span>
                              </div>
                              <Link 
                                href={`/maintenance/${task.id}/complete`}
                                className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                              >
                                Complete
                              </Link>
                            </div>
                            
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              {task.completionPercentage !== null ? (
                                <div 
                                  className={`h-full ${
                                    task.isDue ? 'bg-red-500' : 
                                    task.completionPercentage >= 75 ? 'bg-amber-500' : 
                                    'bg-green-500'
                                  } transition-all duration-500 ease-in-out`}
                                  style={{width: `${Math.min(100, task.completionPercentage)}%`}}
                                ></div>
                              ) : (
                                <div className="h-full bg-gray-300 w-0"></div>
                              )}
                            </div>
                            
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>{task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : 'No date'}</span>
                              <span>
                                {task.dueMileage && formatDistance(task.dueMileage)}
                                {task.remainingMiles !== null && task.remainingMiles > 0 && 
                                  ` (${formatDistance(task.remainingMiles)} left)`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {group.tasks.length > 3 && (
                        <div className="mt-3 text-center">
                          <Link 
                            href={`/maintenance?motorcycle=${group.motorcycle.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
                          >
                            View all {group.tasks.length} tasks
                            <ArrowRight size={14} className="ml-1" />
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
                <Wrench className="mx-auto h-14 w-14 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance tasks found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Start by adding maintenance tasks for your motorcycles or import predefined templates.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => setShowQuickAddModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
                  >
                    <Plus size={16} className="mr-2" />
                    Quick Add Task
                  </button>
                  <button
                    onClick={() => setShowTemplateImporter(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 shadow-sm"
                  >
                    <Download size={16} className="mr-2" />
                    Import Templates
                  </button>
                </div>
              </div>
            )}
            
            {/* Upcoming Tasks Section */}
            {upcomingTasks.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <div className="bg-amber-50 p-4 border-b border-amber-200">
                  <div className="flex items-start">
                    <Clock className="text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h2 className="font-medium text-amber-800">Coming Up This Week</h2>
                      <p className="text-sm text-amber-700">
                        Plan ahead for these maintenance tasks due in the next 7 days
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {upcomingTasks.map(task => (
                      <div 
                        key={task.id} 
                        className="border border-amber-200 rounded-lg p-4 flex flex-col bg-amber-50/30 hover:bg-amber-50 transition"
                      >
                        <div className="flex justify-between mb-2">
                          <h3 className="font-medium">{task.task}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 shadow-sm">
                            Soon
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{task.motorcycle}</p>
                        
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        
                        <div className="flex flex-col space-y-1 text-xs text-gray-600 mb-3">
                          {task.dueDate && (
                            <div className="flex items-center">
                              <Calendar size={12} className="mr-1 text-amber-500" />
                              Due: {format(new Date(task.dueDate), "MMMM d, yyyy")}
                            </div>
                          )}
                          {task.dueMileage && (
                            <div className="flex items-center">
                              <Gauge size={12} className="mr-1 text-amber-500" />
                              At: {formatDistance(task.dueMileage)}
                              {task.remainingMiles !== null && ` (${formatDistance(task.remainingMiles)} remaining)`}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-auto pt-2 flex justify-end">
                          <Link
                            href={`/maintenance/${task.id}/complete`}
                            className="inline-flex items-center px-3 py-1.5 border border-amber-500 text-amber-700 bg-white rounded-md text-sm hover:bg-amber-50 shadow-sm"
                          >
                            <CheckCircle size={14} className="mr-1.5" />
                            Complete Early
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === "calendar" && (
          <div id="calendar-section" className="bg-white rounded-lg shadow-sm border border-gray-100">
            {/* Calendar Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-700 flex items-center">
                <Calendar size={20} className="mr-2 text-blue-500" />
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 bg-white shadow-sm"
                >
                  Today
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                  aria-label="Next month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Enhanced Calendar Grid with visual improvements */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-600">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {weeks.map((week, weekIndex) => (
                  // Render each week
                  week.map((day, dayIndex) => {
                    const dayTasks = getTasksForDate(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const hasOverdue = dayTasks.some(task => task.isDue);
                    
                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`relative bg-white p-2 min-h-[100px] cursor-pointer transition-all ${
                          !isSameMonth(day, currentDate) ? "text-gray-400 bg-gray-50/60" : ""
                        } ${
                          isToday(day) ? "ring-2 ring-blue-400" : ""
                        } ${
                          isSelected ? "bg-blue-50" : ""
                        } ${
                          hasOverdue && !isSelected ? "bg-red-50/60" : ""
                        } hover:bg-gray-50`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className={`font-medium text-sm mb-1.5 ${
                          isToday(day) ? "text-blue-600" : ""
                        }`}>
                          {format(day, "d")}
                        </div>
                        {hasTasks(day) && (
                          <div className="space-y-1 max-h-[76px] overflow-y-auto pr-1">
                            {dayTasks.map(task => (
                              <div
                                key={task.id}
                                className={`text-xs p-1.5 rounded truncate flex items-center shadow-sm ${
                                  task.priority === "high" || task.isDue
                                    ? "bg-red-100 text-red-800"
                                    : task.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                                title={`${task.motorcycle}: ${task.task}`}
                              >
                                {task.isDue && <AlertCircle size={10} className="mr-1 flex-shrink-0" />}
                                <span className="truncate">{task.motorcycle}: {task.task}</span>
                              </div>
                            ))}
                            {dayTasks.length > 3 && (
                              <div className="text-xs text-center mt-1 text-blue-600 bg-blue-50/80 py-0.5 rounded">
                                +{dayTasks.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Today indicator */}
                        {isToday(day) && (
                          <div className="absolute top-1 right-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )).flat()}
              </div>
            </div>

            {/* Selected Date Tasks */}
            {selectedDate && (
              <div className="border-t p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center">
                    <Clock size={18} className="mr-2 text-blue-500" />
                    Tasks for {format(selectedDate, "MMMM d, yyyy")}
                  </h3>
                  {isToday(selectedDate) && (
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full shadow-sm">
                      Today
                    </span>
                  )}
                </div>
                
                {getTasksForDate(selectedDate).length > 0 ? (
                  <div className="space-y-3">
                    {getTasksForDate(selectedDate).map(task => (
                      <MaintenanceTaskCard key={task.id} task={mapTaskForComponent(task)} compact={true} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 text-center border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-2">No tasks scheduled for this day</p>
                    <Link
                      href={`/maintenance/add?date=${format(selectedDate, "yyyy-MM-dd")}`}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 shadow-sm"
                    >
                      <Plus size={14} className="mr-1.5" />
                      Add task for this day
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <div id="list-section" className="space-y-4">
            {/* Priority filter for list view */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Filter by Priority</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterPriority("all")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterPriority === "all" 
                      ? "bg-blue-100 text-blue-800 shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterPriority("high")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterPriority === "high" 
                      ? "bg-red-100 text-red-800 shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setFilterPriority("medium")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterPriority === "medium" 
                      ? "bg-yellow-100 text-yellow-800 shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => setFilterPriority("low")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterPriority === "low" 
                      ? "bg-green-100 text-green-800 shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Low
                </button>
              </div>
            </div>
            
            {/* Tasks List with groups */}
            {sortedTasks.length > 0 ? (
              <div className="space-y-4">
                {/* Overdue Tasks Group */}
                {overdueTasks.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-red-50 p-4 border-b border-red-200">
                      <div className="flex items-center">
                        <AlertCircle className="text-red-500 mr-2 flex-shrink-0" />
                        <div>
                          <h2 className="text-lg font-medium text-red-800">Overdue</h2>
                          <p className="text-sm text-red-700">These tasks require immediate attention</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {overdueTasks.map(task => (
                        <div key={task.id} className="p-4 hover:bg-red-50/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{task.task}</h3>
                              <p className="text-sm text-gray-500">{task.motorcycle}</p>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                {task.dueDate && (
                                  <div className="flex items-center">
                                    <Calendar size={12} className="mr-1 text-red-500" />
                                    <span>Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                                  </div>
                                )}
                                {task.dueMileage && (
                                  <div className="flex items-center">
                                    <Gauge size={12} className="mr-1 text-red-500" />
                                    <span>At: {formatDistance(task.dueMileage)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full shadow-sm">
                                Overdue
                              </span>
                              
                              <div className="flex gap-2 mt-auto pt-2">
                                <Link
                                  href={`/maintenance/${task.id}/edit`}
                                  className="text-xs px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 shadow-sm"
                                >
                                  Edit
                                </Link>
                                <Link
                                  href={`/maintenance/${task.id}/complete`}
                                  className="text-xs px-2.5 py-1 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm"
                                >
                                  Complete
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Due Today Group */}
                {sortedTasks.filter(task => {
                  if (!task.isDue && task.dueDate) {
                    return isToday(new Date(task.dueDate));
                  }
                  return false;
                }).length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-amber-50 p-4 border-b border-amber-200">
                      <div className="flex items-center">
                        <Clock className="text-amber-500 mr-2 flex-shrink-0" />
                        <div>
                          <h2 className="text-lg font-medium text-amber-800">Due Today</h2>
                          <p className="text-sm text-amber-700">Tasks that should be completed today</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {sortedTasks.filter(task => {
                        if (!task.isDue && task.dueDate) {
                          return isToday(new Date(task.dueDate));
                        }
                        return false;
                      }).map(task => (
                        <div key={task.id} className="p-4 hover:bg-amber-50/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{task.task}</h3>
                              <p className="text-sm text-gray-500">{task.motorcycle}</p>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                {task.dueDate && (
                                  <div className="flex items-center">
                                    <Calendar size={12} className="mr-1 text-amber-500" />
                                    <span>Due: Today</span>
                                  </div>
                                )}
                                {task.dueMileage && (
                                  <div className="flex items-center">
                                    <Gauge size={12} className="mr-1 text-amber-500" />
                                    <span>At: {formatDistance(task.dueMileage)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full shadow-sm">
                                Due Today
                              </span>
                              
                              <div className="flex gap-2 mt-auto pt-2">
                                <Link
                                  href={`/maintenance/${task.id}/edit`}
                                  className="text-xs px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 shadow-sm"
                                >
                                  Edit
                                </Link>
                                <Link
                                  href={`/maintenance/${task.id}/complete`}
                                  className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                                >
                                  Complete
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Upcoming Tasks Group */}
                {sortedTasks.filter(task => {
                  if (!task.isDue && task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    // Due in the future but not today
                    return isAfter(dueDate, today) && !isToday(dueDate);
                  }
                  return false;
                }).length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-blue-50 p-4 border-b border-blue-200">
                      <div className="flex items-center">
                        <Calendar className="text-blue-500 mr-2 flex-shrink-0" />
                        <div>
                          <h2 className="text-lg font-medium text-blue-800">Upcoming</h2>
                          <p className="text-sm text-blue-700">Future maintenance tasks to plan for</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {sortedTasks.filter(task => {
                        if (!task.isDue && task.dueDate) {
                          const dueDate = new Date(task.dueDate);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          // Due in the future but not today
                          return isAfter(dueDate, today) && !isToday(dueDate);
                        }
                        return false;
                      }).map(task => (
                        <div key={task.id} className="p-4 hover:bg-blue-50/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{task.task}</h3>
                              <p className="text-sm text-gray-500">{task.motorcycle}</p>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                {task.dueDate && (
                                  <div className="flex items-center">
                                    <Calendar size={12} className="mr-1 text-blue-500" />
                                    <span>Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                                  </div>
                                )}
                                {task.dueMileage && (
                                  <div className="flex items-center">
                                    <Gauge size={12} className="mr-1 text-blue-500" />
                                    <span>At: {formatDistance(task.dueMileage)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full shadow-sm ${
                                task.priority === "high"
                                  ? "bg-red-100 text-red-800"
                                  : task.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}>
                                {task.priority}
                              </span>
                              
                              <div className="flex gap-2 mt-auto pt-2">
                                <Link
                                  href={`/maintenance/${task.id}/edit`}
                                  className="text-xs px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 shadow-sm"
                                >
                                  Edit
                                </Link>
                                <Link
                                  href={`/maintenance/${task.id}/complete`}
                                  className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                                >
                                  Complete
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* No Due Date Group */}
                {sortedTasks.filter(task => !task.dueDate && !task.isDue).length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                      <div className="flex items-center">
                        <Info className="text-gray-500 mr-2 flex-shrink-0" />
                        <div>
                          <h2 className="text-lg font-medium text-gray-800">Mileage Based</h2>
                          <p className="text-sm text-gray-600">Tasks that are due based on odometer readings</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {sortedTasks.filter(task => !task.dueDate && !task.isDue).map(task => (
                        <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{task.task}</h3>
                              <p className="text-sm text-gray-500">{task.motorcycle}</p>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                {task.dueMileage && (
                                  <div className="flex items-center">
                                    <Gauge size={12} className="mr-1 text-gray-500" />
                                    <span>At: {formatDistance(task.dueMileage)}</span>
                                  </div>
                                )}
                                {task.completionPercentage !== null && (
                                  <div className="flex items-center">
                                    <span className="text-blue-600">
                                      {Math.floor(task.completionPercentage)}% complete
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full shadow-sm ${
                                task.priority === "high"
                                  ? "bg-red-100 text-red-800"
                                  : task.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}>
                                {task.priority}
                              </span>
                              
                              <div className="flex gap-2 mt-auto pt-2">
                                <Link
                                  href={`/maintenance/${task.id}/edit`}
                                  className="text-xs px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 shadow-sm"
                                >
                                  Edit
                                </Link>
                                <Link
                                  href={`/maintenance/${task.id}/complete`}
                                  className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                                >
                                  Complete
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
                <Wrench className="mx-auto h-14 w-14 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks match your filters</h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your filters or add new maintenance tasks.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2">
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 shadow-sm"
                  >
                    <X size={16} className="mr-2" />
                    Clear Filters
                  </button>
                  <Link
                    href="/maintenance/add"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Task
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grid View */}
        {view === "grid" && (
          <div id="grid-section" className="space-y-4">
            {/* Priority filter - same as list view */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Filter by Priority</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterPriority("all")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterPriority === "all" 
                      ? "bg-blue-100 text-blue-800 shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterPriority("high")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterPriority === "high" 
                      ? "bg-red-100 text-red-800 shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => setFilterPriority("medium")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterPriority === "medium" 
                      ? "bg-yellow-100 text-yellow-800 shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => setFilterPriority("low")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterPriority === "low" 
                      ? "bg-green-100 text-green-800 shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Low
                </button>
              </div>
            </div>
            
            {/* Tasks grid */}
            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedTasks.map(task => (
                  <MaintenanceTaskCard 
                    key={task.id} 
                    task={mapTaskForComponent(task)} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
                <Wrench className="mx-auto h-14 w-14 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks match your filters</h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your filters or add new maintenance tasks.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2">
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 shadow-sm"
                  >
                    <X size={16} className="mr-2" />
                    Clear Filters
                  </button>
                  <Link
                    href="/maintenance/add"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Task
                  </Link>
                </div>
              </div>
            )}
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

        {/* Archived Tasks Section */}
        {showArchived && (
          <div className="mt-6">
            <ArchivedTasksView />
          </div>
        )}

        {/* Quick Add Modal */}
        {showQuickAddModal && (
          <QuickAddMaintenanceModal
            motorcycles={motorcycles}
            preselectedMotorcycleId={activeMotorcycleTab !== "all" ? activeMotorcycleTab : undefined}
            onClose={() => setShowQuickAddModal(false)}
            onAdd={handleQuickAddTask}
          />
        )}

        {/* Mobile Floating Action Button */}
        <div className="md:hidden fixed bottom-20 right-4 flex flex-col space-y-2">
          {hasNewNotifications && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
              onClick={() => setTimeFilter("overdue")}
            >
              <Bell size={20} />
            </motion.div>
          )}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            onClick={() => setShowQuickAddModal(true)}
          >
            <Plus size={24} />
          </motion.div>
        </div>
      </main>
    </ClientLayout>
  );
}