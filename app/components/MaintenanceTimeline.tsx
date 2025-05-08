// app/components/MaintenanceTimeline.tsx
import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { 
  format, 
  differenceInDays, 
  addDays, 
  isSameMonth, 
  startOfMonth, 
  endOfMonth,
  isWithinInterval,
  isToday,
  eachDayOfInterval
} from 'date-fns';
import { Calendar, AlertCircle, Clock, Wrench, Gauge } from 'lucide-react';
import Link from 'next/link';
import { DistanceUtil } from '../lib/utils/distance';

interface MaintenanceTask {
  id: string;
  task: string;
  description: string | null;
  dueDate: string | null;
  dueMileage: number | null;
  priority: string;
  isDue: boolean;
  currentMileage: number | null;
  estimatedDueDate?: string; // Optional estimated due date
}

interface MaintenanceTimelineProps {
  motorcycleId: string;
  tasks: MaintenanceTask[];
  currentMileage: number | null;
  milesPerDay?: number; // Optional estimated miles per day
}

export default function MaintenanceTimeline({ motorcycleId, tasks, currentMileage, milesPerDay = 20 }: MaintenanceTimelineProps) {
  const { formatDistance, settings } = useSettings();
  const [viewMode, setViewMode] = React.useState<'timeline' | 'calendar'>('timeline');
  const [currentMonthDate, setCurrentMonthDate] = React.useState(new Date());
  
  // Process tasks to include estimated due dates for mileage-based tasks
  const processedTasks = tasks.map(task => {
    // Make a copy to avoid mutating the original
    const processedTask = { ...task };
    
    // If task has a mileage trigger but no date trigger, estimate the date
    if (!processedTask.dueDate && processedTask.dueMileage && currentMileage) {
      // Use our enhanced DistanceUtil for time calculation
      const daysUntilDue = DistanceUtil.daysUntilMileage(currentMileage, processedTask.dueMileage, milesPerDay);
      
      if (daysUntilDue !== null && daysUntilDue > 0) {
        const estimatedDueDate = addDays(new Date(), daysUntilDue);
        processedTask.estimatedDueDate = estimatedDueDate.toISOString();
      }
    }
    
    return processedTask;
  });
  
  // Sort tasks by due date (actual or estimated)
  const sortedTasks = [...processedTasks].sort((a, b) => {
    // First put overdue tasks
    if (a.isDue && !b.isDue) return -1;
    if (!a.isDue && b.isDue) return 1;
    
    // Then sort by due date (actual or estimated)
    const aDate = a.dueDate ? new Date(a.dueDate) : 
                  (a.estimatedDueDate ? new Date(a.estimatedDueDate) : new Date(9999, 0, 1));
    const bDate = b.dueDate ? new Date(b.dueDate) : 
                  (b.estimatedDueDate ? new Date(b.estimatedDueDate) : new Date(9999, 0, 1));
    
    return aDate.getTime() - bDate.getTime();
  });
  
  // Calculate mileage remaining, with improved formatting
  const getMileageRemaining = (task: MaintenanceTask) => {
    if (currentMileage === null || task.dueMileage === null) return null;
    
    const remaining = task.dueMileage - currentMileage;
    if (remaining <= 0) return 'Due now';
    
    return `${formatDistance(remaining)} remaining`;
  };
  
  // Format the estimated time in a more human-readable way
  const formatEstimatedTimeRemaining = (task: MaintenanceTask) => {
    if (currentMileage === null || task.dueMileage === null) return null;
    
    const daysRemaining = DistanceUtil.daysUntilMileage(currentMileage, task.dueMileage, milesPerDay);
    if (daysRemaining === null) return null;
    if (daysRemaining === 0) return 'Due now';
    
    if (daysRemaining < 7) return `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
    
    const weeksRemaining = Math.floor(daysRemaining / 7);
    if (weeksRemaining < 4) return `Due in ${weeksRemaining} week${weeksRemaining === 1 ? '' : 's'}`;
    
    const monthsRemaining = Math.floor(daysRemaining / 30);
    return `Due in ${monthsRemaining} month${monthsRemaining === 1 ? '' : 's'}`;
  };
  
  // Generate dots for calendar view
  const getDotColorForDate = (date: Date) => {
    const tasksForDate = sortedTasks.filter(task => {
      if (task.dueDate && isToday(new Date(task.dueDate))) {
        return true;
      }
      if (task.estimatedDueDate && isToday(new Date(task.estimatedDueDate))) {
        return true;
      }
      return false;
    });
    
    if (tasksForDate.length === 0) return null;
    
    // Check if any task for this date is overdue
    if (tasksForDate.some(task => task.isDue)) {
      return 'bg-red-500';
    }
    
    // Check priority for highest priority task
    const highestPriority = tasksForDate.reduce((highest, task) => {
      if (task.priority === 'high') return 'high';
      if (task.priority === 'medium' && highest !== 'high') return 'medium';
      return highest;
    }, 'low');
    
    if (highestPriority === 'high') return 'bg-red-500';
    if (highestPriority === 'medium') return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  // Calendar view helpers
  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Group tasks by month for timeline view
  const tasksByMonth: Record<string, typeof processedTasks> = {};
  
  sortedTasks.forEach(task => {
    let taskDate = null;
    if (task.dueDate) {
      taskDate = new Date(task.dueDate);
    } else if (task.estimatedDueDate) {
      taskDate = new Date(task.estimatedDueDate);
    }
    
    if (taskDate) {
      const monthKey = format(taskDate, 'yyyy-MM');
      if (!tasksByMonth[monthKey]) {
        tasksByMonth[monthKey] = [];
      }
      tasksByMonth[monthKey].push(task);
    }
  });
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold"></h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'timeline' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Timeline
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'calendar' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>
      
      {viewMode === 'timeline' ? (
        <div className="p-4">
          {Object.keys(tasksByMonth).length > 0 ? (
            <div className="relative">
              {/* Timeline vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {/* Timeline items */}
              <div className="space-y-6">
                {Object.entries(tasksByMonth).map(([monthKey, monthTasks]) => {
                  const [year, month] = monthKey.split('-');
                  const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                  
                  return (
                    <div key={monthKey} className="ml-7 relative">
                      {/* Month marker */}
                      <div className="absolute -left-7 mt-1">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-blue-500 bg-white">
                          <Calendar size={14} className="text-blue-500" />
                        </div>
                      </div>
                      
                      <h3 className="text-md font-medium text-gray-900 mb-3">
                        {format(monthDate, 'MMMM yyyy')}
                      </h3>
                      
                      <div className="space-y-3">
                        {monthTasks.map(task => {
                          // Determine if using actual or estimated date
                          const taskDate = task.dueDate ? new Date(task.dueDate) : 
                                          (task.estimatedDueDate ? new Date(task.estimatedDueDate) : null);
                          
                          // Skip tasks without dates
                          if (!taskDate) return null;
                          
                          // Calculate days from now
                          const daysFromNow = differenceInDays(taskDate, new Date());
                          
                          // Determine status color
                          let statusColor = "";
                          if (task.isDue) {
                            statusColor = "border-red-500 bg-red-50 text-red-700";
                          } else if (daysFromNow <= 7) {
                            statusColor = "border-yellow-500 bg-yellow-50 text-yellow-700";
                          } else {
                            statusColor = "border-blue-500 bg-blue-50 text-blue-700";
                          }
                          
                          return (
                            <div 
                              key={task.id}
                              className={`pl-4 pr-3 py-3 rounded-lg border-l-4 ${statusColor}`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{task.task}</h4>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
                                    {taskDate && (
                                      <span className="flex items-center">
                                        <Clock size={12} className="mr-1" />
                                        {task.dueDate ? 'Due' : 'Estimated'}: {format(taskDate, 'MMM d, yyyy')}
                                        {task.dueDate ? '' : ' (based on mileage)'}
                                      </span>
                                    )}
                                    
                                    {task.dueMileage && (
                                      <span className="flex items-center">
                                        <Gauge size={12} className="mr-1" />
                                        At: {formatDistance(task.dueMileage)}
                                      </span>
                                    )}
                                    
                                    {/* Add estimated time remaining for mileage-based tasks */}
                                    {!task.isDue && !task.dueDate && task.dueMileage && currentMileage && (
                                      <span className="flex items-center">
                                        <Wrench size={12} className="mr-1" />
                                        {formatEstimatedTimeRemaining(task)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <Link
                                  href={`/maintenance/${task.id}/complete`}
                                  className={`px-2.5 py-1 text-xs rounded ${
                                    task.isDue 
                                      ? 'bg-red-600 text-white hover:bg-red-700' 
                                      : 'border border-blue-500 text-blue-700 hover:bg-blue-50'
                                  }`}
                                >
                                  {task.isDue ? 'Overdue' : 'Complete'}
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No upcoming maintenance tasks found</p>
              <Link
                href={`/maintenance/add?motorcycle=${motorcycleId}`}
                className="inline-flex items-center mt-2 text-sm text-blue-600 hover:underline"
              >
                <Calendar size={14} className="mr-1" />
                Add Maintenance Task
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setCurrentMonthDate(prev => addDays(prev, -30))}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              &lt;
            </button>
            <h3 className="text-md font-medium">
              {format(currentMonthDate, 'MMMM yyyy')}
            </h3>
            <button 
              onClick={() => setCurrentMonthDate(prev => addDays(prev, 30))}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              &gt;
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
            
            {monthDays.map((day, i) => {
              const dotColor = getDotColorForDate(day);
              
              return (
                <div 
                  key={day.toString()}
                  className={`aspect-square flex flex-col items-center justify-center relative border rounded-md text-sm ${
                    isToday(day) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <span className="text-gray-700">{format(day, 'd')}</span>
                  {dotColor && (
                    <div className={`absolute bottom-1 h-2 w-2 rounded-full ${dotColor}`}></div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h3 className="text-sm font-medium mb-2">Tasks This Month</h3>
            <div className="space-y-2">
              {sortedTasks.filter(task => {
                const taskDate = task.dueDate ? new Date(task.dueDate) : 
                                (task.estimatedDueDate ? new Date(task.estimatedDueDate) : null);
                                
                return taskDate && isSameMonth(taskDate, currentMonthDate);
              }).map(task => {
                const taskDate = task.dueDate ? new Date(task.dueDate) : 
                                (task.estimatedDueDate ? new Date(task.estimatedDueDate) : null);
                
                return (
                  <div key={task.id} className={`flex justify-between items-center py-2 px-3 rounded-md ${
                    task.isDue ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <div>
                      <span className="font-medium text-sm">{task.task}</span>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-x-2">
                        <span>
                          {taskDate ? format(taskDate, 'MMM d, yyyy') : 'No date'}
                          {!task.dueDate && task.estimatedDueDate ? ' (est.)' : ''}
                        </span>
                        {task.dueMileage && (
                          <span>• {formatDistance(task.dueMileage)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Link
                        href={`/maintenance/${task.id}/complete`}
                        className={`text-xs px-2 py-1 rounded ${
                          task.isDue 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'border border-blue-500 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        {task.isDue ? 'Overdue' : 'Complete'}
                      </Link>
                      <Link
                        href={`/maintenance/${task.id}/edit`}
                        className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
              
              {sortedTasks.filter(task => {
                const taskDate = task.dueDate ? new Date(task.dueDate) : 
                                (task.estimatedDueDate ? new Date(task.estimatedDueDate) : null);
                                
                return taskDate && isSameMonth(taskDate, currentMonthDate);
              }).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No tasks scheduled for this month</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}