"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Calendar, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday, isSameDay } from "date-fns";

export default function MaintenancePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");

  // Mock data
  const maintenanceTasks = [
    {
      id: 1,
      motorcycle: "Ducati Monster",
      task: "Oil Change",
      dueDate: new Date(2025, 4, 15),
      priority: "high",
      mileage: 6000,
    },
    {
      id: 2,
      motorcycle: "Triumph Bonneville",
      task: "Chain Adjustment",
      dueDate: new Date(2025, 4, 8),
      priority: "medium",
      mileage: 3000,
    },
    {
      id: 3,
      motorcycle: "Ducati Monster",
      task: "Valve Check",
      dueDate: new Date(2025, 5, 20),
      priority: "medium",
      mileage: 12000,
    },
  ];

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const hasTasks = (date: Date) => {
    return maintenanceTasks.some(task => isSameDay(task.dueDate, date));
  };

  const getTasksForDate = (date: Date) => {
    return maintenanceTasks.filter(task => isSameDay(task.dueDate, date));
  };

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Maintenance Schedule</h1>
          <p className="text-gray-600">Plan and track your motorcycle maintenance</p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView("calendar")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    view === "calendar" ? "bg-white shadow" : "text-gray-600"
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    view === "list" ? "bg-white shadow" : "text-gray-600"
                  }`}
                >
                  List
                </button>
              </div>
              
              <button className="flex items-center px-3 py-2 border rounded-md text-sm hover:bg-gray-50">
                <Filter size={16} className="mr-2" />
                Filter
              </button>
            </div>

            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus size={16} className="mr-2" />
              Add Task
            </button>
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
                  onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                {weekDays.map(day => (
                  <div
                    key={day.toISOString()}
                    className={`bg-white p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 ${
                      isToday(day) ? "ring-2 ring-blue-500" : ""
                    } ${selectedDate && isSameDay(day, selectedDate) ? "bg-blue-50" : ""}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="font-medium text-sm mb-1">
                      {format(day, "d")}
                    </div>
                    {hasTasks(day) && (
                      <div className="space-y-1">
                        {getTasksForDate(day).map(task => (
                          <div
                            key={task.id}
                            className={`text-xs p-1 rounded ${
                              task.priority === "high"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {task.motorcycle}: {task.task}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {view === "list" && (
          <div className="bg-white rounded-lg shadow">
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
                      Mileage
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
                  {maintenanceTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{task.task}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.motorcycle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(task.dueDate, "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.mileage} mi
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            task.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-4">
                          Complete
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}