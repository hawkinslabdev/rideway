// app/components/MaintenanceTaskCard.tsx
import React from 'react';
import { Wrench, AlertTriangle, Clock, Gauge, CheckCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '../contexts/SettingsContext';
import { format, isToday, differenceInDays } from 'date-fns';

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

  const getCardStyle = () => {
    if (task.isDue) {
      return "border-red-300 bg-red-50";
    }
    
    // For non-overdue tasks, check progress percentage
    if (task.completionPercentage !== null) {
      if (task.completionPercentage >= 90) {
        return "border-yellow-300 bg-yellow-50";
      } else if (task.completionPercentage >= 75) {
        return "border-yellow-100 bg-yellow-50/50";
      }
    }
    
    if (task.priority === "high") {
      return "border-blue-300 bg-blue-50";
    }
    
    return "border-gray-200";
  };

  // Function to format the absolute due information
  const getAbsoluteDueInfo = () => {
    if (!task.dueMileage && !task.dueDate) {
      return "No due date or mileage set";
    }
    
    let dueInfo = "";
    
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      if (isToday(dueDate)) {
        dueInfo += "Due today";
      } else {
        const daysDiff = differenceInDays(dueDate, new Date());
        if (daysDiff < 0) {
          dueInfo += `Overdue by ${Math.abs(daysDiff)} days`;
        } else if (daysDiff === 1) {
          dueInfo += "Due tomorrow";
        } else if (daysDiff < 7) {
          dueInfo += `Due in ${daysDiff} days`;
        } else {
          dueInfo += `Due on ${format(dueDate, 'MMM d, yyyy')}`;
        }
      }
    }
    
    if (task.dueMileage) {
      if (dueInfo) dueInfo += " or ";
      
      if (task.currentMileage && task.dueMileage > task.currentMileage) {
        const remaining = task.dueMileage - task.currentMileage;
        dueInfo += `Due in ${formatDistance(remaining)}`;
      } else if (task.currentMileage && task.dueMileage <= task.currentMileage) {
        dueInfo += `Overdue by ${formatDistance(task.currentMileage - task.dueMileage)}`;
      } else {
        dueInfo += `Due at ${formatDistance(task.dueMileage)}`;
      }
    }
    
    return dueInfo;
  };
  
  // Function to format the relative progress information
  const getRelativeInfo = () => {
    if (task.remainingMiles === null) {
      return null;
    }
    
    if (task.remainingMiles <= 0) {
      return "Overdue";
    }
    
    return `${formatDistance(task.remainingMiles)} remaining`;
  };

  if (compact) {
    // Compact version for dashboard or quick view
    return (
      <div className={`p-3 border rounded-lg flex items-center justify-between ${getCardStyle()}`}>
        <div className="flex-grow">
          <h3 className="font-medium text-sm">{task.task}</h3>
          <p className="text-xs text-gray-600 truncate">{task.motorcycle}</p>
          <p className="text-xs mt-1 flex items-center">
            {task.isDue ? (
              <span className="flex items-center text-red-600">
                <AlertTriangle size={12} className="mr-1" />
                {getAbsoluteDueInfo()}
              </span>
            ) : (
              <span className="flex items-center text-gray-600">
                {task.dueDate ? (
                  <Calendar size={12} className="mr-1" />
                ) : (
                  <Gauge size={12} className="mr-1" />
                )}
                {getAbsoluteDueInfo()}
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/maintenance/${task.id}/complete`}
          className={`ml-2 px-3 py-1 rounded text-xs font-medium ${
            task.isDue 
              ? "bg-red-600 text-white hover:bg-red-700" 
              : "bg-blue-600 text-white hover:bg-blue-700"
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
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-md">{task.task}</h3>
          <p className="text-sm text-gray-500">{task.motorcycle}</p>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            task.isDue
              ? "bg-red-100 text-red-800"
              : task.priority === "high"
                ? "bg-red-100 text-red-800"
                : task.priority === "medium"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
          }`}
        >
          {task.isDue ? "Overdue" : task.priority}
        </span>
      </div>
      
      {task.description && (
        <p className="text-sm mb-3 text-gray-700">{task.description}</p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        {/* Due information */}
        <div className={`p-2 rounded-md ${task.isDue ? 'bg-red-100' : 'bg-gray-100'}`}>
          <div className="flex items-center text-sm">
            {task.isDue ? (
              <AlertTriangle size={14} className="mr-1.5 text-red-600" />
            ) : (
              <Clock size={14} className="mr-1.5 text-gray-600" />
            )}
            <span className={task.isDue ? "text-red-700 font-medium" : "text-gray-700"}>
              {getAbsoluteDueInfo()}
            </span>
          </div>
        </div>
        
        {/* Intervals display */}
        <div className="p-2 rounded-md bg-gray-100">
          <div className="flex items-center text-sm text-gray-700">
            <Wrench size={14} className="mr-1.5 text-gray-600" />
            <span>
              {task.intervalMiles ? `Every ${formatDistance(task.intervalMiles)}` : ''}
              {task.intervalMiles && task.intervalDays ? ' or ' : ''}
              {task.intervalDays ? `${task.intervalDays} days` : ''}
            </span>
          </div>
        </div>
      </div>
      
      {/* Progress visualization */}
      {(task.completionPercentage !== null && task.completionPercentage >= 0) && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center">
              <Gauge size={12} className="mr-1 text-gray-500" />
              Progress toward next service
            </span>
            <span className="font-medium">
              {Math.floor(task.completionPercentage)}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
            {/* Progress bar */}
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                task.isDue ? 'bg-red-500' : 
                task.completionPercentage >= 90 ? 'bg-red-500' :
                task.completionPercentage >= 75 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, task.completionPercentage)}%` }}
            ></div>
            
            {/* Thresholds markers */}
            <div className="absolute top-0 bottom-0 left-3/4 w-px bg-gray-400/50"></div>
            <div className="absolute top-0 bottom-0 left-9/12 w-px bg-gray-400/50"></div>
          </div>
          
          {/* Duration estimate */}
          {task.remainingMiles !== null && task.remainingMiles > 0 && (
            <div className="mt-1 text-xs text-blue-600">
              <span className="flex items-center">
                <Clock size={12} className="mr-1" />
                Approximately {Math.floor(task.remainingMiles / 20)} day{Math.floor(task.remainingMiles / 20) !== 1 ? 's' : ''} remaining
                <span className="ml-1 text-gray-500">(at 20 miles/day)</span>
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 flex justify-end space-x-2">
        <Link
          href={`/maintenance/${task.id}/edit`}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        >
          Edit
        </Link>
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