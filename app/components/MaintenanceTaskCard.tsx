// app/components/MaintenanceTaskCard.tsx
import React from 'react';
import { Wrench, AlertTriangle, Clock, Gauge, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '../contexts/SettingsContext';
import { format } from 'date-fns';

interface MaintenanceTaskProps {
  task: {
    id: string;
    task: string;
    motorcycle: string;
    motorcycleId: string;
    description?: string | null;
    
    // Enhanced fields
    intervalMiles: number | null;
    intervalDays: number | null;
    dueDate: string | null;
    dueMileage: number | null;
    currentMileage: number | null;
    remainingMiles: number | null;
    completionPercentage: number | null;
    
    priority: string;
    isDue: boolean;
  };
  compact?: boolean;
}

const MaintenanceTaskCard: React.FC<MaintenanceTaskProps> = ({ task, compact = false }) => {
  const { formatDistance } = useSettings();
  
  // Determine the card style based on priority and due status
  const getCardStyle = () => {
    if (task.isDue) {
      return "border-red-300 bg-red-50";
    }
    
    if (task.priority === "high") {
      return "border-yellow-300 bg-yellow-50";
    }
    
    if (task.priority === "medium") {
      return "border-blue-300 bg-blue-50";
    }
    
    return "border-gray-200";
  };

  // Function to format the due information
  const getDueInfo = () => {
    if (!task.dueMileage && !task.dueDate) {
      return "No due date or mileage set";
    }
    
    let dueInfo = "";
    
    if (task.dueMileage) {
      const formattedMileage = formatDistance(task.dueMileage);
      dueInfo += `Due at ${formattedMileage}`;
      
      if (task.remainingMiles !== null) {
        if (task.remainingMiles > 0) {
          dueInfo += ` (${formatDistance(task.remainingMiles)} remaining)`;
        } else {
          dueInfo += " (Overdue)";
        }
      }
    }
    
    if (task.dueDate) {
      if (dueInfo) dueInfo += " or ";
      
      const dueDate = new Date(task.dueDate);
      dueInfo += `Due on ${format(dueDate, 'MMM d, yyyy')}`;
    }
    
    return dueInfo;
  };

  if (compact) {
    // Compact version for dashboard
    return (
      <div className={`p-3 border rounded-lg flex items-center justify-between ${getCardStyle()}`}>
        <div className="flex-grow">
          <h3 className="font-medium">{task.task}</h3>
          <p className="text-xs text-gray-600">{task.motorcycle}</p>
          <p className="text-xs mt-1">
            {task.dueMileage && (
              <span className="flex items-center">
                <Gauge size={12} className="mr-1" />
                {task.remainingMiles !== null && task.remainingMiles <= 0 
                  ? <span className="text-red-600 font-medium">Overdue</span>
                  : formatDistance(task.remainingMiles || 0) + " remaining"
                }
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/maintenance/${task.id}/complete`}
          className={`ml-2 px-3 py-1 rounded text-xs ${
            task.isDue 
              ? "bg-red-600 text-white" 
              : "bg-blue-600 text-white"
          }`}
        >
          {task.isDue ? "Overdue" : "Complete"}
        </Link>
      </div>
    );
  }
  
  // Full version for maintenance page
  return (
    <div className={`p-4 border rounded-lg ${getCardStyle()}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-md">{task.task}</h3>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            task.priority === "high"
              ? "bg-red-100 text-red-800"
              : task.priority === "medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {task.priority}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{task.motorcycle}</p>
      
      {task.description && (
        <p className="text-sm mb-3 text-gray-700">{task.description}</p>
      )}
      
      <div className="mb-3 text-sm">
        <p className="flex items-center mb-1">
          {task.isDue ? (
            <AlertTriangle size={14} className="mr-1 text-red-500" />
          ) : (
            <Wrench size={14} className="mr-1 text-gray-500" />
          )}
          <span className={task.isDue ? "text-red-700 font-medium" : "text-gray-700"}>
            {getDueInfo()}
          </span>
        </p>
        
        {(task.completionPercentage !== null && task.completionPercentage >= 0) && (
          <>
            <div className="flex justify-between text-xs mt-2 mb-1">
              <span>Progress</span>
              <span>{Math.floor(task.completionPercentage)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  task.isDue ? 'bg-red-500' : 
                  task.completionPercentage >= 90 ? 'bg-red-500' :
                  task.completionPercentage >= 75 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, task.completionPercentage)}%` }}
              ></div>
            </div>
          </>
        )}
      </div>
      
      <div className="mt-4 flex justify-end">
        <Link
          href={`/maintenance/${task.id}/complete`}
          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
            task.isDue 
              ? "bg-red-600 text-white hover:bg-red-700" 
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <CheckCircle size={14} className="mr-1" />
          {task.isDue ? "Overdue - Complete" : "Complete"}
        </Link>
      </div>
    </div>
  );
};

export default MaintenanceTaskCard;