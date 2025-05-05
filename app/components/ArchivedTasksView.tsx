// app/components/ArchivedTasksView.tsx
"use client";

import { useState, useEffect } from "react";
import { Archive, RefreshCw, AlertCircle, X } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";
import { format, parseISO } from "date-fns";

interface ArchivedTask {
  id: string;
  task: string;
  motorcycle: string;
  motorcycleId: string;
  dueDate: string | null;
  dueMileage: number | null;
  priority: string;
  archived: boolean;
}

export default function ArchivedTasksView() {
  const { formatDistance } = useSettings();
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedTasks();
  }, []);

  const fetchArchivedTasks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/maintenance?includeArchived=true");
      if (!response.ok) {
        throw new Error("Failed to fetch archived tasks");
      }
      
      const data = await response.json();
      
      // Filter to only get archived tasks
      const archived = data.tasks.filter((task: ArchivedTask) => task.archived === true);
      setArchivedTasks(archived);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    setIsRestoring(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/maintenance/task/${taskId}/archive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ archived: false }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to restore task");
      }
      
      // Remove the task from the local state
      setArchivedTasks(prev => prev.filter(task => task.id !== taskId));
      
      // Show success message
      setSuccess("Task restored successfully. It will now appear in your maintenance schedule.");
      
      // Clear success message after a few seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRestoring(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold flex items-center">
          <Archive className="mr-2 text-gray-500" size={20} />
          Archived Maintenance Tasks
        </h2>
        <button
          onClick={fetchArchivedTasks}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          <RefreshCw size={14} className="mr-1" />
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border-b border-green-200 flex items-center justify-between">
          <p className="text-green-800 text-sm">{success}</p>
          <button 
            onClick={() => setSuccess(null)} 
            className="text-green-600 hover:text-green-800"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      {archivedTasks.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <Archive className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p>No archived maintenance tasks found</p>
        </div>
      ) : (
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
                  Due Details
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
              {archivedTasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{task.task}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.motorcycle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.dueDate && (
                      <div>Due: {format(parseISO(task.dueDate), "MMM d, yyyy")}</div>
                    )}
                    {task.dueMileage && (
                      <div>At: {formatDistance(task.dueMileage)}</div>
                    )}
                    {!task.dueDate && !task.dueMileage && "No due date or mileage"}
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
                    <button
                      onClick={() => handleRestoreTask(task.id)}
                      disabled={isRestoring}
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                    >
                      {isRestoring ? 'Restoring...' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}