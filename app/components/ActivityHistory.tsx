// app/components/ActivityHistory.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { format, differenceInDays, formatDistanceToNow } from 'date-fns';
import { Bike, Wrench, Gauge, Calendar, AlertCircle, Info } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

// Define a local formatCurrency function to use instead of relying on the context
const formatCurrency = (value: number | null): string => {
  if (value === null) return '';
  
  // Use German/Euro formatting
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

interface ActivityItem {
  id: string;
  type: 'maintenance' | 'mileage_update' | 'motorcycle_added' | 'note';
  title: string;
  description?: string;
  date: string | Date;
  motorcycleId: string;
  motorcycleName?: string;
  mileage?: number | null;
  previousMileage?: number | null;
  maintenanceType?: string;
  cost?: number | null;
  notes?: string | null;
}

interface ActivityHistoryProps {
  motorcycleId: string;
  initialActivity?: ActivityItem[];
  limit?: number;
  showMotorcycleName?: boolean;
  className?: string;
  onRefresh?: (refreshFn: () => Promise<void>) => void;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ 
  motorcycleId, 
  initialActivity, 
  limit = 10,
  showMotorcycleName = false,
  className = "",
  onRefresh
}) => {
  // Only use formatDistance from settings context, not formatCurrency
  const { formatDistance, formatCurrency } = useSettings();
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity || []);
  const [isLoading, setIsLoading] = useState(!initialActivity);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  const fetchActivity = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch activity for the motorcycle
      const response = await fetch(`/api/motorcycles/${motorcycleId}/activity?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity history');
      }
      
      const data = await response.json();
      setActivity(data.activity || []);
    } catch (err) {
      console.error('Failed to load activity history:', err);
      setError('Could not load activity history');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (!initialActivity) {
      fetchActivity();
    }
  }, [motorcycleId, initialActivity]);
  
  // Register the refresh function with the parent component if needed
  useEffect(() => {
    if (onRefresh) {
      onRefresh(fetchActivity);
    }
  }, [onRefresh]);
  
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Group activity by date
  const groupedActivity: Record<string, ActivityItem[]> = {};
  
  activity.forEach(item => {
    const dateObj = new Date(item.date);
    const dateKey = format(dateObj, 'yyyy-MM-dd');
    
    if (!groupedActivity[dateKey]) {
      groupedActivity[dateKey] = [];
    }
    
    groupedActivity[dateKey].push(item);
  });
  
  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return <Wrench size={18} className="text-blue-500" />;
      case 'mileage_update':
        return <Gauge size={18} className="text-green-500" />;
      case 'motorcycle_added':
        return <Bike size={18} className="text-purple-500" />;
      case 'note':
        return <Info size={18} className="text-gray-500" />;
      default:
        return <Calendar size={18} className="text-gray-500" />;
    }
  };
  
  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center text-red-500">
          <AlertCircle size={16} className="mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }
  
  if (activity.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <p>No activity yet</p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(groupedActivity).map(([dateKey, items]) => {
        const date = new Date(dateKey);
        const daysSinceToday = differenceInDays(new Date(), date);
        
        let dateDisplay = format(date, 'MMMM d, yyyy');
        if (daysSinceToday === 0) {
          dateDisplay = 'Today';
        } else if (daysSinceToday === 1) {
          dateDisplay = 'Yesterday';
        } else if (daysSinceToday < 7) {
          dateDisplay = formatDistanceToNow(date, { addSuffix: true });
        }
        
        return (
          <div key={dateKey}>
            <h3 className="font-medium text-gray-900 mb-3">{dateDisplay}</h3>
            <div className="space-y-3">
              {items.map(item => (
                <div 
                  key={item.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow"
                >
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div className="flex items-start">
                      <div className="p-2 bg-gray-100 rounded-lg mr-3 flex-shrink-0">
                        {getActivityIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          <span className="text-xs text-gray-500">
                            {format(new Date(item.date), 'h:mm a')}
                          </span>
                        </div>
                        
                        {showMotorcycleName && item.motorcycleName && (
                          <p className="text-sm text-gray-500 mt-1">{item.motorcycleName}</p>
                        )}
                        
                        {item.description && (
                          <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                        )}
                        
                        {item.type === 'mileage_update' && item.mileage !== undefined && item.previousMileage !== undefined && (
                          <div className="flex items-center mt-1 text-sm">
                            <span className="text-gray-700">
                              {formatDistance(item.previousMileage || 0)} → {formatDistance(item.mileage || 0)}
                            </span>
                            {item.mileage !== null && item.previousMileage !== null && (
                              <span className="ml-2 text-green-600">
                                (+{formatDistance(item.mileage - item.previousMileage, 0)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Extra details when expanded */}
                    {expandedItems[item.id] && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-700">
                        {item.type === 'maintenance' && (
                          <>
                            {item.maintenanceType && (
                              <p className="mb-1">Task: {item.maintenanceType}</p>
                            )}
                            {item.mileage !== undefined && item.mileage !== null && (
                              <p className="mb-1">Mileage: {formatDistance(item.mileage)}</p>
                            )}
                            {item.cost !== undefined && item.cost !== null && (
                              <p className="mb-1">Cost: {formatCurrency(item.cost)}</p>
                            )}
                          </>
                        )}
                        
                        {item.notes && (
                          <div className="mt-2">
                            <p className="text-gray-600">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityHistory;