"use client";

import { useState, useEffect } from "react";
import ClientLayout from "../components/ClientLayout";
import { Calendar, Plus, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { 
  format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, subMonths, isSameMonth, isToday, isSameDay, parseISO,
  eachDayOfInterval
} from "date-fns";
import Link from "next/link";
import { useSettings } from "../contexts/SettingsContext";

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

export default function MaintenancePage() {
  const { settings, formatDistance, updateSetting } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Use the view preference from settings instead of a local state
  const [view, setView] = useState<"calendar" | "list">(settings.maintenanceView);
  
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchMaintenanceTasks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/maintenance");
        
        if (!response.ok) {
          throw new Error("Failed to fetch maintenance tasks");
        }
        
        const data = await response.json();
        setMaintenanceTasks(data.tasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceTasks();
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
  
  const getTasksForDate = (date: Date) => {
    return maintenanceTasks.filter(task => {
      if (!task.dueDate) return false;
      return isSameDay(parseISO(task.dueDate), date);
    });
  };
  
  const hasTasks = (date: Date) => {
    return getTasksForDate(date).length > 0;
  };

  // Filter tasks for list view
  const filteredTasks = maintenanceTasks.filter(task => {
    const matchesSearch = task.task.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         task.motorcycle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  // Sort tasks by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

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

            <Link
              href="/maintenance/add"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Add Task
            </Link>
          </div>
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
      </main>
    </ClientLayout>
  );
}