// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import ClientLayout from "./components/ClientLayout";
import { 
  Bike, Wrench, Check, Clock, AlertTriangle, 
  Plus, Calendar, Gauge, ChevronRight,
  Settings, Shield, X, Info
} from "lucide-react";
import { format, isToday, isPast, addDays } from "date-fns";
import { useSettings } from "./contexts/SettingsContext";
import WelcomeModal from "./components/WelcomeModal";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams.get('welcome') === 'true';
  const setupSuccess = searchParams.get('setup') === 'success';
  const { formatDistance } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [stats, setStats] = useState({
    motorcyclesCount: 0,
    maintenanceCount: 0,
    distanceUntilNextMaint: null as number | null,
    daysUntilNextMaint: null as number | null,
    nextMaintenanceByDistance: null as any,
    nextMaintenanceByTime: null as any
  });
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<any>(null);
  const [newMileage, setNewMileage] = useState("");
  const [updatingMileage, setUpdatingMileage] = useState(false);
  
  useEffect(() => {
    // Check if this is the user's first visit
    const firstVisit = localStorage.getItem('rideway-first-visit') !== 'false';
    setIsFirstVisit(firstVisit);
    
    // After showing welcome, mark as visited
    if (showWelcome) {
      localStorage.setItem('rideway-first-visit', 'false');
    }
  }, [showWelcome]);
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    
    if (status !== "authenticated") return;
    
    fetchDashboardData();
  }, [status, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      
      const data = await response.json();
      setDashboardData(data);
      
      // Calculate stats
      if (data.motorcycles && data.motorcycles.length > 0) {
        // Count non-archived motorcycles
        const activeMotorcyclesCount = data.motorcycles.filter((m: any) => m.isOwned !== false).length;
        
        // Maintenance due count from the API
        const maintenanceDueCount = data.overdueCount || 0;
        
        // Find next maintenance task by distance
        let nextMaintenanceByDistance = null;
        let distanceUntilNextMaint = Infinity;
        
        // Find next maintenance task by time
        let nextMaintenanceByTime = null;
        let daysUntilNextMaint = Infinity;
        
        // Get today's date for calculations
        const today = new Date();
        
        // Process upcoming maintenance tasks
        if (data.upcomingMaintenance && data.upcomingMaintenance.length > 0) {
          data.upcomingMaintenance.forEach((task: any) => {
            // Find the motorcycle for this task
            const taskMotorcycle = data.motorcycles.find((m: any) => m.id === task.motorcycleId);
            
            // Skip if motorcycle not found or not owned
            if (!taskMotorcycle || taskMotorcycle.isOwned === false) return;
            
            // Calculate distance until next maintenance
            if (task.dueMileage && taskMotorcycle.currentMileage) {
              const remainingDistance = task.dueMileage - taskMotorcycle.currentMileage;
              if (remainingDistance > 0 && remainingDistance < distanceUntilNextMaint) {
                distanceUntilNextMaint = remainingDistance;
                nextMaintenanceByDistance = task;
              }
            }
            
            // Calculate time until next maintenance
            if (task.dueDate) {
              const dueDate = new Date(task.dueDate);
              const diffTime = Math.max(0, dueDate.getTime() - today.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays < daysUntilNextMaint) {
                daysUntilNextMaint = diffDays;
                nextMaintenanceByTime = task;
              }
            }
          });
        }
        
        // Set the stats with the new values
        setStats({
          motorcyclesCount: activeMotorcyclesCount,
          maintenanceCount: maintenanceDueCount,
          distanceUntilNextMaint: distanceUntilNextMaint === Infinity ? null : distanceUntilNextMaint,
          daysUntilNextMaint: daysUntilNextMaint === Infinity ? null : daysUntilNextMaint,
          nextMaintenanceByDistance,
          nextMaintenanceByTime
        });
        
        // Find the default motorcycle for the mileage update feature
        const defaultMotorcycle = data.motorcycles.find((m: any) => m.isDefault) || 
                                  data.motorcycles[0];
        setSelectedMotorcycle(defaultMotorcycle);
        
        if (defaultMotorcycle?.currentMileage) {
          setNewMileage(defaultMotorcycle.currentMileage.toString());
        }
      }      
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleMileageUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMotorcycle || !newMileage) return;
    
    try {
      setUpdatingMileage(true);
      
      // Validate mileage (should be greater than current)
      const mileageValue = parseInt(newMileage);
      if (isNaN(mileageValue) || mileageValue < 0) {
        throw new Error("Please enter a valid mileage value");
      }
      
      if (selectedMotorcycle.currentMileage && mileageValue < selectedMotorcycle.currentMileage) {
        throw new Error("New mileage cannot be less than current mileage");
      }
      
      // Update mileage
      const response = await fetch(`/api/motorcycles/${selectedMotorcycle.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentMileage: mileageValue,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update mileage");
      }
      
      // Close modal and refresh data
      setShowMileageModal(false);
      toast.success(`Updated mileage for ${selectedMotorcycle.name}`, {
        position: "bottom-center",
      });
      
      // Refresh dashboard data
      await fetchDashboardData();
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update mileage");
    } finally {
      setUpdatingMileage(false);
    }
  };
  
  const openMileageModal = (motorcycle: any) => {
    setSelectedMotorcycle(motorcycle);
    setNewMileage(motorcycle.currentMileage?.toString() || "");
    setShowMileageModal(true);
  };
  
  if (status === "loading" || loading) {
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </main>
      </ClientLayout>
    );
  }
  
  const getFormattedDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isPast(date)) return `${format(date, 'MMM d')} (Overdue)`;
    
    const daysUntil = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return `In ${daysUntil} days`;
    return format(date, 'MMM d');
  };
  
  // Get default motorcycle
  const defaultMotorcycle = dashboardData?.motorcycles?.find((m: any) => m.isDefault) || 
                            dashboardData?.motorcycles?.[0];

  // Calculate maintenance health percentage
  const calculateMaintenanceHealth = () => {
    if (!dashboardData) return 100;
    
    const totalTasks = dashboardData.upcomingMaintenance?.length || 0;
    if (totalTasks === 0) return 100;
    
    const overdueTasks = dashboardData.overdueCount || 0;
    return Math.max(0, Math.min(100, 100 - (overdueTasks / totalTasks) * 100));
  };
  
  const maintenanceHealth = calculateMaintenanceHealth();
  
  // Get priority classes for badges
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };
  
  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome header with action buttons */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-gray-600 mt-1">
                Here's your motorcycle maintenance overview
              </p>
            </div>
            
            {dashboardData?.motorcycles && dashboardData.motorcycles.length > 0 && (
              <div className="mt-4 sm:mt-0 flex space-x-2">
                <Link 
                  href="/maintenance/add"
                  className="px-3 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 text-sm"
                >
                  <Wrench size={15} className="mr-1.5" />
                  Log Maintenance
                </Link>
                <button
                  onClick={() => openMileageModal(defaultMotorcycle)}
                  className="px-3 py-2 border border-gray-300 rounded-md flex items-center hover:bg-gray-50 text-sm"
                >
                  <Gauge size={15} className="mr-1.5" />
                  Update Mileage
                </button>
              </div>
            )}
          </div>
          
          {/* Setup success message */}
          {setupSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
              <div className="bg-green-100 rounded-full p-1 mr-3">
                <Check size={18} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">Maintenance plan created!</h3>
                <p className="text-green-600 text-sm">
                  You've successfully set up your maintenance schedule. We'll remind you when tasks are due.
                </p>
              </div>
            </div>
          )}
          
          {/* No motorcycles message */}
          {(!dashboardData?.motorcycles || dashboardData.motorcycles.length === 0) && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6 sm:p-8 text-center">
                <div className="bg-blue-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Bike size={32} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-medium mb-2">Welcome to Rideway!</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Add your first motorcycle to start tracking maintenance and mileage.
                </p>
                <Link
                  href="/garage/add?initial=true"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
                >
                  <Plus size={18} className="mr-2" />
                  Add Your First Motorcycle
                </Link>
              </div>
              
              {/* Feature highlights */}
              <div className="border-t">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4 text-center">What Rideway can do for you</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 rounded-full p-3 mb-3">
                        <Wrench size={20} className="text-blue-600" />
                      </div>
                      <h4 className="font-medium mb-2">Track Maintenance</h4>
                      <p className="text-sm text-gray-600">Keep all your service records in one place and get timely maintenance reminders.</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                      <div className="bg-green-100 rounded-full p-3 mb-3">
                        <Gauge size={20} className="text-green-600" />
                      </div>
                      <h4 className="font-medium mb-2">Log Mileage</h4>
                      <p className="text-sm text-gray-600">Record your motorcycle's mileage and track how much you ride.</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                      <div className="bg-purple-100 rounded-full p-3 mb-3">
                        <Calendar size={20} className="text-purple-600" />
                      </div>
                      <h4 className="font-medium mb-2">Schedule Maintenance</h4>
                      <p className="text-sm text-gray-600">Plan and schedule maintenance tasks to keep your bikes in top condition.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {dashboardData?.motorcycles && dashboardData.motorcycles.length > 0 && (
            <>
              {/* Main dashboard layout */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Left column - Motorcycles & Action items */}
                <div className="lg:col-span-1">
                  {/* Maintenance Status Card */}
                  <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
                    <div className="p-4 border-b">
                      <h2 className="font-medium flex items-center">
                        <Shield size={18} className="mr-2 text-gray-500" />
                        Maintenance Status
                      </h2>
                    </div>
                    
                    <div className="p-4">
                      {/* Maintenance health indicator */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Overall Status</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            maintenanceHealth === 100 
                              ? 'bg-green-100 text-green-800'
                              : maintenanceHealth >= 75
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {maintenanceHealth === 100 
                              ? 'Excellent' 
                              : maintenanceHealth >= 75 
                                ? 'Good' 
                                : 'Needs Attention'}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              maintenanceHealth === 100 
                                ? 'bg-green-500' 
                                : maintenanceHealth >= 75
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${maintenanceHealth}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Stats summary */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-md p-3">
                          <p className="text-xs text-gray-500 mb-1">Motorcycles</p>
                          <p className="text-xl font-bold">{stats.motorcyclesCount}</p>
                        </div>
                        
                        <div className={`bg-gray-50 rounded-md p-3 ${dashboardData.overdueCount > 0 ? 'bg-red-50' : ''}`}>
                          <p className="text-xs text-gray-500 mb-1">Tasks Due</p>
                          <p className={`text-xl font-bold ${dashboardData.overdueCount > 0 ? 'text-red-600' : ''}`}>
                            {stats.maintenanceCount}
                          </p>
                        </div>
                      </div>
                      
                      {/* Next maintenance metrics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-md p-3">
                          <p className="text-xs text-gray-500 mb-1">Next Distance</p>
                          {stats.distanceUntilNextMaint ? (
                            <p className="text-base font-medium">{formatDistance(stats.distanceUntilNextMaint)}</p>
                          ) : (
                            <p className="text-sm text-gray-400">Not set</p>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 rounded-md p-3">
                          <p className="text-xs text-gray-500 mb-1">Next Time</p>
                          {stats.daysUntilNextMaint !== null ? (
                            <p className="text-base font-medium">{stats.daysUntilNextMaint} {stats.daysUntilNextMaint === 1 ? 'day' : 'days'}</p>
                          ) : (
                            <p className="text-sm text-gray-400">Not scheduled</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="mt-4">
                        <Link 
                          href="/maintenance"
                          className="w-full block text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          View Maintenance Schedule
                        </Link>
                      </div>
                    </div>
                  </div>
                  
                  {/* Primary Motorcycle Card */}
                  {defaultMotorcycle && (
                    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
                        <div className="flex items-center">
                          {defaultMotorcycle.imageUrl ? (
                            <img 
                              src={defaultMotorcycle.imageUrl} 
                              alt={defaultMotorcycle.name}
                              className="h-16 w-16 rounded-lg object-cover border-2 border-white/30"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-white/10 flex items-center justify-center border-2 border-white/30">
                              <Bike size={30} className="text-white" />
                            </div>
                          )}
                          <div className="ml-3">
                            <h3 className="text-white font-bold text-lg">{defaultMotorcycle.name}</h3>
                            <p className="text-blue-100 text-sm">
                              {defaultMotorcycle.year} {defaultMotorcycle.make} {defaultMotorcycle.model}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                          <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-md text-sm">
                            <Gauge size={14} className="mr-1.5 text-gray-600" />
                            {defaultMotorcycle.currentMileage 
                              ? formatDistance(defaultMotorcycle.currentMileage) 
                              : "No mileage"}
                          </div>
                          
                          {dashboardData.upcomingMaintenance && dashboardData.upcomingMaintenance.filter(
                            (t: any) => t.motorcycleId === defaultMotorcycle.id && t.isDue
                          ).length > 0 && (
                            <div className="flex items-center bg-red-100 text-red-700 px-3 py-1.5 rounded-md text-sm">
                              <AlertTriangle size={14} className="mr-1.5" />
                              Maintenance Due
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Link 
                            href={`/garage/${defaultMotorcycle.id}`}
                            className="flex-1 px-3 py-2 text-sm text-center bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => openMileageModal(defaultMotorcycle)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
                          >
                            <Gauge size={14} className="mr-1" />
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Other Motorcycles */}
                  {dashboardData.motorcycles.length > 1 && (
                    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="font-medium flex items-center">
                          <Bike size={18} className="mr-2 text-gray-500" />
                          Other Motorcycles
                        </h2>
                        <Link 
                          href="/garage" 
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View All
                        </Link>
                      </div>
                      
                      <div className="divide-y">
                        {dashboardData.motorcycles
                          .filter((m: any) => m.id !== defaultMotorcycle?.id && m.isOwned !== false)
                          .slice(0, 3)
                          .map((motorcycle: any) => (
                            <div
                              key={motorcycle.id}
                              className="flex items-center justify-between p-3 hover:bg-gray-50 transition"
                            >
                              <Link
                                href={`/garage/${motorcycle.id}`}
                                className="flex items-center flex-1"
                              >
                                <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                  {motorcycle.imageUrl ? (
                                    <img 
                                      src={motorcycle.imageUrl} 
                                      alt={motorcycle.name}
                                      className="h-10 w-10 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <Bike size={20} className="text-gray-500" />
                                  )}
                                </div>
                                <div className="ml-3">
                                  <p className="font-medium">{motorcycle.name}</p>
                                  <div className="flex items-center text-xs text-gray-500">
                                    {motorcycle.currentMileage && (
                                      <span>
                                        {formatDistance(motorcycle.currentMileage)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                              
                              <button
                                onClick={() => openMileageModal(motorcycle)}
                                className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"
                                title="Update Mileage"
                              >
                                <Gauge size={16} />
                              </button>
                            </div>
                          ))}
                      </div>
                      
                      <div className="p-4 border-t">
                        <Link
                          href="/garage/add"
                          className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                        >
                          <Plus size={16} className="mr-2" />
                          Add Motorcycle
                        </Link>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg shadow overflow-hidden hidden md:block">
                    <div className="p-4 border-b">
                      <h2 className="font-medium flex items-center">
                        <Settings size={18} className="mr-2 text-gray-500" />
                        Quick Actions
                      </h2>
                    </div>
                    
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Link 
                        href="/maintenance/add"
                        className="flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        <Wrench size={16} className="mr-2" />
                        Log Maintenance
                      </Link>
                      
                      <Link 
                        href="/garage"
                        className="flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        <Bike size={16} className="mr-2" />
                        Garage
                      </Link>
                      
                      <Link 
                        href="/maintenance"
                        className="flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        <Calendar size={16} className="mr-2" />
                        Schedule
                      </Link>
                      
                      <Link 
                        href="/settings"
                        className="flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                      >
                        <Settings size={16} className="mr-2" />
                        Settings
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Right column - Maintenance */}
                <div className="lg:col-span-2">
                  {/* Maintenance Alert Card */}
                  {dashboardData.overdueCount > 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <div className="bg-red-100 rounded-full p-2 flex-shrink-0 mr-4">
                          <AlertTriangle size={22} className="text-red-600" />
                        </div>
                        <div>
                          <div className="flex items-center text-red-800 font-medium text-lg">
                            <span>{dashboardData.overdueCount} maintenance {dashboardData.overdueCount === 1 ? 'task' : 'tasks'} due</span>
                          </div>
                          <p className="text-red-700 mt-1">
                            You have maintenance items that require attention. Take care of these tasks to ensure your ride is safe and reliable.
                          </p>
                          <Link
                            href="/maintenance"
                            className="mt-3 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            View Overdue Tasks
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex">
                        <div className="bg-green-100 rounded-full p-2 flex-shrink-0 mr-4">
                          <Shield size={22} className="text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center text-green-800 font-medium text-lg">
                            <span>All maintenance up to date</span>
                          </div>
                          <p className="text-green-700 mt-1">
                            Great job! All your maintenance tasks are up to date. Keep an eye on upcoming tasks to stay on schedule.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Upcoming Maintenance Tasks */}
                  <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h2 className="font-medium flex items-center">
                        <Calendar size={18} className="mr-2 text-gray-500" />
                        Upcoming Maintenance
                      </h2>
                      <Link 
                        href="/maintenance" 
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View All
                      </Link>
                    </div>
                    
                    {dashboardData.upcomingMaintenance && dashboardData.upcomingMaintenance.length > 0 ? (
                      <div className="divide-y">
                        {dashboardData.upcomingMaintenance.slice(0, 3).map((task: any) => (
                          <div key={task.id} className="p-4 hover:bg-gray-50 transition">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">{task.task}</h3>
                                <p className="text-sm text-gray-500">{task.motorcycle}</p>
                                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                  {task.dueDate && (
                                    <span className={`flex items-center px-2 py-1 rounded-full border ${
                                      task.isDue ? 'text-red-600 bg-red-50 border-red-200' : 'text-blue-600 bg-blue-50 border-blue-200'
                                    }`}>
                                      <Calendar size={12} className="mr-1" />
                                      {getFormattedDueDate(task.dueDate)}
                                    </span>
                                  )}
                                  
                                  {task.dueMileage && (
                                    <span className={`flex items-center px-2 py-1 rounded-full border ${
                                      task.isDue ? 'text-red-600 bg-red-50 border-red-200' : 'text-blue-600 bg-blue-50 border-blue-200'
                                    }`}>
                                      <Gauge size={12} className="mr-1" />
                                      {formatDistance(task.dueMileage)}
                                    </span>
                                  )}
                                  
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full border ${getPriorityClass(task.priority)}`}>
                                    <span className="capitalize">{task.priority}</span>
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex-shrink-0">
                                <Link 
                                  href={`/maintenance/${task.id}/complete`}
                                  className={`px-3 py-1.5 text-sm rounded-md flex items-center ${
                                    task.isDue 
                                      ? 'bg-red-600 text-white hover:bg-red-700' 
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  <Check size={14} className="mr-1" />
                                  Complete
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Wrench size={22} className="text-gray-400" />
                        </div>
                        <h3 className="text-gray-600 font-medium mb-2">No upcoming maintenance</h3>
                        <p className="text-gray-500 text-sm mb-4">
                          Add maintenance tasks to keep track of your motorcycle's service needs.
                        </p>
                        <Link
                          href={defaultMotorcycle ? `/maintenance/add?motorcycle=${defaultMotorcycle.id}` : "/maintenance/add"}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          <Plus size={16} className="mr-2" />
                          Add Maintenance Task
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {/* Next Up Maintenance Summary */}
                  {dashboardData.upcomingMaintenance && dashboardData.upcomingMaintenance.length > 0 && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="p-4 border-b">
                        <h2 className="font-medium flex items-center">
                          <Info size={18} className="mr-2 text-gray-500" />
                          Maintenance Insights
                        </h2>
                      </div>
                      
                      <div className="p-4">
                        {/* Next maintenance by time */}
                        {stats.nextMaintenanceByTime && (
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Next Due by Time</h3>
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-blue-800">
                                  {stats.nextMaintenanceByTime.task} for {stats.nextMaintenanceByTime.motorcycle}
                                </p>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center">
                                  <Clock size={12} className="mr-1" />
                                  {stats.daysUntilNextMaint} {stats.daysUntilNextMaint === 1 ? 'day' : 'days'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Next maintenance by distance */}
                        {stats.nextMaintenanceByDistance && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Next Due by Distance</h3>
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-green-800">
                                  {stats.nextMaintenanceByDistance.task} for {stats.nextMaintenanceByDistance.motorcycle}
                                </p>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                                  <Gauge size={12} className="mr-1" />
                                  {formatDistance(stats.distanceUntilNextMaint || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Schedule button */}
                        <div className="mt-4 flex space-x-2">
                          <Link
                            href="/maintenance"
                            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                          >
                            <Calendar size={16} className="mr-2" />
                            View Schedule
                          </Link>
                          <Link
                            href="/maintenance/add"
                            className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                          >
                            <Wrench size={16} className="mr-2" />
                            Log Maintenance
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Welcome modal */}
        {showWelcome && isFirstVisit && dashboardData?.motorcycles?.length > 0 && (
          <WelcomeModal 
            motorcycleName={dashboardData.motorcycles[0].name} 
            motorcycleId={dashboardData.motorcycles[0].id} 
          />
        )}
        
        {/* Mileage Update Modal */}
        {showMileageModal && selectedMotorcycle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Update Mileage</h3>
                <button 
                  onClick={() => setShowMileageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleMileageUpdate}>
                <div className="mb-4">
                  <div className="flex items-center mb-4">
                    {selectedMotorcycle.imageUrl ? (
                      <img 
                        src={selectedMotorcycle.imageUrl} 
                        alt={selectedMotorcycle.name}
                        className="h-12 w-12 rounded-lg object-cover mr-3"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
                        <Bike size={24} className="text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{selectedMotorcycle.name}</h4>
                      <p className="text-sm text-gray-500">{selectedMotorcycle.year} {selectedMotorcycle.make} {selectedMotorcycle.model}</p>
                    </div>
                  </div>
                  
                  <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Mileage
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="mileage"
                      id="mileage"
                      required
                      min={selectedMotorcycle.currentMileage || 0}
                      value={newMileage}
                      onChange={(e) => setNewMileage(e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-16 sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter current mileage"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">
                        {formatDistance(1).split(' ')[1]}
                      </span>
                    </div>
                  </div>
                  {selectedMotorcycle.currentMileage && (
                    <p className="mt-1 text-xs text-gray-500">
                      Current reading: {formatDistance(selectedMotorcycle.currentMileage)}
                    </p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowMileageModal(false)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingMileage}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {updatingMileage ? (
                      <>
                        <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                        Updating...
                      </>
                    ) : (
                      'Update Mileage'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </ClientLayout>
  );
}