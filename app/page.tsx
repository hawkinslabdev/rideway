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
  Settings, Shield, X, Info, CheckCircle, 
  ChevronDown, Zap, BarChart3
} from "lucide-react";
import { format, isToday, isPast, addDays, formatDistanceToNow } from "date-fns";
import { useSettings } from "./contexts/SettingsContext";
import WelcomeModal from "./components/WelcomeModal";
import MileageUpdateModal from "./components/MileageUpdateModal";

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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };
  
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
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
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
      }      
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const openMileageModal = (motorcycle: any) => {
    setSelectedMotorcycle(motorcycle);
    setShowMileageModal(true);
  };
  
  const calculateMaintenanceHealth = () => {
    if (!dashboardData) return 100;
    
    const totalTasks = dashboardData.upcomingMaintenance?.length || 0;
    if (totalTasks === 0) return 100;
    
    const overdueTasks = dashboardData.overdueCount || 0;
    return Math.max(0, Math.min(100, 100 - (overdueTasks / totalTasks) * 100));
  };
  
  // For date formatting on the timeline
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isPast(date)) return formatDistanceToNow(date) + ' ago';
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  const maintenanceHealth = calculateMaintenanceHealth();
  
  // Get default motorcycle
  const defaultMotorcycle = dashboardData?.motorcycles?.find((m: any) => m.isDefault) || 
                            dashboardData?.motorcycles?.[0];
                            
  // Get overdue and upcoming tasks
  const overdueTasks = dashboardData?.upcomingMaintenance?.filter((t: any) => t.isDue) || [];
  const upcomingTasks = dashboardData?.upcomingMaintenance?.filter((t: any) => !t.isDue) || [];

  if (status === "loading" || loading) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
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
  
  // Show empty state if no motorcycles
  if (!dashboardData?.motorcycles || dashboardData.motorcycles.length === 0) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bike size={36} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-medium mb-2">Welcome to Rideway!</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Track maintenance, log mileage, and keep your motorcycles in top condition
                </p>
                <Link
                  href="/garage/add?initial=true"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition"
                >
                  <Plus size={18} className="mr-2" />
                  Add Your First Motorcycle
                </Link>
              </div>
              
              {/* Feature highlights */}
              <div className="border-t">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-6 text-center">What you can do with Rideway</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg transition hover:shadow-md">
                      <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Wrench size={24} className="text-blue-600" />
                      </div>
                      <h4 className="font-medium mb-2">Track Maintenance</h4>
                      <p className="text-sm text-gray-600">Keep all your service records in one place and get timely maintenance reminders</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg transition hover:shadow-md">
                      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Gauge size={24} className="text-green-600" />
                      </div>
                      <h4 className="font-medium mb-2">Log Mileage</h4>
                      <p className="text-sm text-gray-600">Record your motorcycle's mileage and track how much you ride</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg transition hover:shadow-md">
                      <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <Calendar size={24} className="text-purple-600" />
                      </div>
                      <h4 className="font-medium mb-2">Schedule Service</h4>
                      <p className="text-sm text-gray-600">Plan and schedule maintenance tasks to keep your bikes in top condition</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Welcome header with greeting */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-gray-600 mt-1">
              Your ride management headquarters
            </p>
          </div>

          {/* Setup success message */}
          {setupSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 animate-fadeIn">
              <div className="flex items-start">
                <div className="bg-green-100 rounded-full p-1 mr-3 flex-shrink-0">
                  <Check size={18} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-800">Maintenance plan created!</h3>
                  <p className="text-green-600 text-sm">
                    You've successfully set up your maintenance schedule. We'll remind you when tasks are due.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Actions Bar */}
          <div className="bg-white rounded-lg shadow-sm mb-6 p-4 sticky top-0 z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center">
                <div className="sm:hidden mr-3">
                  <Link href="/garage" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Bike size={18} className="text-gray-700" />
                  </Link>
                </div>
                <div className="hidden sm:block mr-4">
                  <Link href="/garage" className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition">
                    <Bike size={16} className="text-gray-700" />
                    <span className="text-sm font-medium">Garage</span>
                  </Link>
                </div>
                
                <div className="hidden sm:flex items-center gap-2 sm:mr-4">
                  <Link href="/maintenance" className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition">
                    <Calendar size={16} className="text-gray-700" />
                    <span className="text-sm font-medium">Maintenance</span>
                  </Link>
                </div>
                
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/history" className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition">
                    <BarChart3 size={16} className="text-gray-700" />
                    <span className="text-sm font-medium">History</span>
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openMileageModal(defaultMotorcycle)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition"
                >
                  <Gauge size={16} />
                  <span className="hidden sm:inline">Update Mileage</span>
                </button>
                
                <Link
                  href="/maintenance/add"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-md shadow-sm transition"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Log Service</span>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Dashboard Grid - Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Info Column */}
            <div className="lg:col-span-2">
              {/* Main motorcycle showcase */}
              {defaultMotorcycle && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 transition hover:shadow-md">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/3 aspect-square md:aspect-auto md:h-auto relative bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                      {defaultMotorcycle.imageUrl ? (
                        <img 
                          src={defaultMotorcycle.imageUrl} 
                          alt={defaultMotorcycle.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Bike size={64} className="text-white/60" />
                        </div>
                      )}
                      {/* Status badge */}
                      {dashboardData.upcomingMaintenance && dashboardData.upcomingMaintenance.filter(
                        (t: any) => t.motorcycleId === defaultMotorcycle.id && t.isDue
                      ).length > 0 ? (
                        <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                          Needs Attention
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                          Ready to Ride
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5 md:w-2/3 flex flex-col">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-xl font-bold text-gray-900">{defaultMotorcycle.name}</h3>
                          {defaultMotorcycle.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">
                          {defaultMotorcycle.year} {defaultMotorcycle.make} {defaultMotorcycle.model}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-md p-3">
                          <p className="text-xs text-gray-500 mb-1">Current Mileage</p>
                          <p className="font-medium">
                            {defaultMotorcycle.currentMileage 
                              ? formatDistance(defaultMotorcycle.currentMileage) 
                              : "Not set"}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-md p-3">
                          <p className="text-xs text-gray-500 mb-1">Maintenance Due</p>
                          <p className="font-medium">
                            {dashboardData.upcomingMaintenance.filter(
                              (t: any) => t.motorcycleId === defaultMotorcycle.id && t.isDue
                            ).length} items
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-auto flex space-x-3">
                        <Link
                          href={`/garage/${defaultMotorcycle.id}`}
                          className="flex items-center justify-center gap-2 px-4 py-2 flex-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => openMileageModal(defaultMotorcycle)}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-md transition"
                        >
                          <Gauge size={16} />
                          Update
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Maintenance Alert Card - High visibility for overdue */}
              {dashboardData.overdueCount > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-lg mb-6 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-red-200">
                    <div className="flex items-center">
                      <div className="bg-red-100 rounded-full p-2 flex-shrink-0 mr-4">
                        <AlertTriangle size={22} className="text-red-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-medium text-red-800">
                          Maintenance Tasks Need Attention
                        </h2>
                        <p className="text-red-700 text-sm">
                          {dashboardData.overdueCount} {dashboardData.overdueCount === 1 ? 'item' : 'items'} need attention to keep your ride safe and reliable
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* First 2 overdue items */}
                  <div className="divide-y divide-red-100">
                    {overdueTasks.slice(0, 2).map((task: any) => (
                      <div key={task.id} className="p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{task.task}</h3>
                          <div className="flex items-center mt-1 text-xs text-red-700">
                            <span className="pr-3 border-r border-red-200">{task.motorcycle}</span>
                            {task.dueDate && (
                              <span className="px-3">
                                Due {formatDueDate(task.dueDate)}
                              </span>
                            )}
                            {task.dueMileage && (
                              <span className="pl-3 border-l border-red-200">
                                At {formatDistance(task.dueMileage)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/maintenance/${task.id}/complete`}
                          className="flex whitespace-nowrap items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition"
                        >
                          <Check size={14} />
                          <span>Complete</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                  
                  {overdueTasks.length > 2 && (
                    <div className="p-3 bg-red-100/50 text-center">
                      <Link 
                        href="/maintenance?filter=overdue" 
                        className="text-sm font-medium text-red-800 hover:text-red-900 inline-flex items-center"
                      >
                        View all {overdueTasks.length} overdue tasks
                        <ChevronRight size={16} className="ml-1" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg mb-6 p-4 flex items-center shadow-sm">
                  <div className="bg-green-100 rounded-full p-2 flex-shrink-0 mr-4">
                    <CheckCircle size={22} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-green-800">Your Maintenance is Up to Date</h2>
                    <p className="text-green-700 text-sm">
                      Great job keeping up with your motorcycle maintenance!
                    </p>
                  </div>
                </div>
              )}
            
              {/* Upcoming Maintenance Timeline */}
              <div className="bg-white rounded-lg shadow-sm mb-6">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="font-medium flex items-center">
                    <Calendar size={18} className="mr-2 text-gray-500" />
                    Upcoming Maintenance
                  </h2>
                  <Link 
                    href="/maintenance" 
                    className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                  >
                    View Schedule <ChevronRight size={16} className="ml-1" />
                  </Link>
                </div>
                
                {upcomingTasks.length > 0 ? (
                  <div className="p-4">
                    {/* Time-based unified timeline */}
                    <div className="relative ml-4 pl-6 border-l-2 border-gray-200">
                      {upcomingTasks.slice(0, 4).map((task: { 
                        id: string; 
                        task: string; 
                        motorcycle: string; 
                        priority: string; 
                        dueDate?: string; 
                        dueMileage?: number 
                      }, index: number) => (
                        <div key={task.id} className="mb-6 last:mb-0">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[5px] w-3 h-3 rounded-full ${
                            task.priority === 'high' 
                              ? 'bg-red-500' 
                              : task.priority === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}></div>
                          
                          {/* Timeline card */}
                          <div className="bg-gray-50 rounded-lg p-3 hover:shadow-sm transition">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">{task.task}</h3>
                                <p className="text-xs text-gray-500 mb-1.5">{task.motorcycle}</p>
                                
                                {task.dueDate && (
                                  <div className="inline-flex items-center mr-4 text-xs text-gray-700">
                                    <Clock size={12} className="mr-1" />
                                    <span>{formatDueDate(task.dueDate)}</span>
                                  </div>
                                )}
                                
                                {task.dueMileage && (
                                  <div className="inline-flex items-center text-xs text-gray-700">
                                    <Gauge size={12} className="mr-1" />
                                    <span>At {formatDistance(task.dueMileage)}</span>
                                  </div>
                                )}
                              </div>
                              
                              <Link
                                href={`/maintenance/${task.id}/complete`}
                                className="px-2.5 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                              >
                                Complete
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {upcomingTasks.length > 4 && (
                        <div className="text-center mt-4">
                          <Link 
                            href="/maintenance" 
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            View all {upcomingTasks.length} upcoming tasks
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Wrench size={22} className="text-gray-400" />
                    </div>
                    <h3 className="text-gray-600 font-medium mb-2">No upcoming maintenance</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Add maintenance tasks to keep track of your motorcycle's service needs
                    </p>
                    <Link
                      href={defaultMotorcycle ? `/maintenance/add?motorcycle=${defaultMotorcycle.id}` : "/maintenance/add"}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Maintenance Task
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Other Motorcycles */}
              {dashboardData.motorcycles.length > 1 && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="font-medium flex items-center">
                      <Bike size={18} className="mr-2 text-gray-500" />
                      Your Motorcycles
                    </h2>
                    <Link 
                      href="/garage" 
                      className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                    >
                      Go to Garage <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 p-4">
                    {dashboardData.motorcycles
                      .filter((m: any) => m.id !== defaultMotorcycle?.id && m.isOwned !== false)
                      .slice(0, 4)
                      .map((motorcycle: any) => (
                        <div
                          key={motorcycle.id}
                          className="flex bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition"
                        >
                          <div className="w-16 h-16 bg-blue-100 flex-shrink-0 flex items-center justify-center">
                            {motorcycle.imageUrl ? (
                              <img 
                                src={motorcycle.imageUrl} 
                                alt={motorcycle.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Bike size={24} className="text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 p-3 flex flex-col">
                            <div>
                              <h3 className="font-medium text-sm">{motorcycle.name}</h3>
                              <p className="text-xs text-gray-500">
                                {motorcycle.currentMileage ? formatDistance(motorcycle.currentMileage) : "No mileage"}
                              </p>
                            </div>
                            <div className="mt-auto flex justify-between items-center">
                              <Link
                                href={`/garage/${motorcycle.id}`}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Details
                              </Link>
                              <button
                                onClick={() => openMileageModal(motorcycle)}
                                aria-label="Update Mileage"
                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                              >
                                <Gauge size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {dashboardData.motorcycles.length > 5 && (
                    <div className="text-center border-t p-3">
                      <Link
                        href="/garage"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View all {dashboardData.motorcycles.length} motorcycles
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Sidebar Column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Maintenance Status Card */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                  {(stats.nextMaintenanceByDistance || stats.nextMaintenanceByTime) && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Next Maintenance</h3>
                      
                      {stats.nextMaintenanceByTime && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-blue-800 mb-1">
                            {stats.nextMaintenanceByTime.task}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-blue-600">{stats.nextMaintenanceByTime.motorcycle}</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center">
                              <Clock size={12} className="mr-1" />
                              {stats.daysUntilNextMaint !== null 
                                ? `${stats.daysUntilNextMaint} ${stats.daysUntilNextMaint === 1 ? 'day' : 'days'}`
                                : "Not scheduled"}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {stats.nextMaintenanceByDistance && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-green-800 mb-1">
                            {stats.nextMaintenanceByDistance.task}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-600">{stats.nextMaintenanceByDistance.motorcycle}</span>
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                              <Gauge size={12} className="mr-1" />
                              {stats.distanceUntilNextMaint !== null
                                ? formatDistance(stats.distanceUntilNextMaint)
                                : "Not set"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <Link 
                    href="/maintenance"
                    className="w-full block text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition"
                  >
                    View Maintenance Schedule
                  </Link>
                </div>
              </div>
              
              {/* Quick Actions Card */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="font-medium flex items-center">
                    <Zap size={18} className="mr-2 text-gray-500" />
                    Quick Actions
                  </h2>
                </div>
                
                <div className="p-4">
                  <div className="space-y-2">
                    <Link 
                      href="/maintenance/add"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <Wrench size={16} className="text-blue-600" />
                        </div>
                        <span className="font-medium text-sm">Log Maintenance</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>
                    
                    <Link 
                      href="/garage"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <Bike size={16} className="text-green-600" />
                        </div>
                        <span className="font-medium text-sm">Manage Garage</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>
                    
                    <Link 
                      href="/history"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <BarChart3 size={16} className="text-purple-600" />
                        </div>
                        <span className="font-medium text-sm">View History</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>
                    
                    <Link 
                      href="/settings"
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                          <Settings size={16} className="text-gray-600" />
                        </div>
                        <span className="font-medium text-sm">Settings</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Mobile-specific Sections - will only show on mobile */}
              <div className="lg:hidden space-y-6">
                {/* Expandable overdue section */}
                {overdueTasks.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <button 
                      onClick={() => toggleSection('overdue')}
                      className="w-full flex items-center justify-between p-4 border-b text-left"
                    >
                      <div className="flex items-center">
                        <AlertTriangle size={18} className="text-red-500 mr-2" />
                        <span className="font-medium">Overdue Tasks</span>
                      </div>
                      <ChevronDown 
                        size={18} 
                        className={`text-gray-500 transition-transform ${
                          expandedSection === 'overdue' ? 'transform rotate-180' : ''
                        }`} 
                      />
                    </button>
                    
                    {expandedSection === 'overdue' && (
                        <div className="divide-y divide-gray-100">
                        {overdueTasks.map((task: { id: string; task: string; motorcycle: string }) => (
                          <div key={task.id} className="p-3 flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-sm">{task.task}</h3>
                            <p className="text-xs text-gray-500">{task.motorcycle}</p>
                          </div>
                          <Link
                            href={`/maintenance/${task.id}/complete`}
                            className="px-3 py-1 text-xs text-white bg-red-600 rounded-md"
                          >
                            Complete
                          </Link>
                          </div>
                        ))}
                        </div>
                    )}
                  </div>
                )}
                
                {/* Expandable motorcycles section - only on mobile when we have multiple */}
                {dashboardData.motorcycles.length > 1 && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <button 
                      onClick={() => toggleSection('motorcycles')}
                      className="w-full flex items-center justify-between p-4 border-b text-left"
                    >
                      <div className="flex items-center">
                        <Bike size={18} className="text-gray-500 mr-2" />
                        <span className="font-medium">Your Motorcycles</span>
                      </div>
                      <ChevronDown 
                        size={18} 
                        className={`text-gray-500 transition-transform ${
                          expandedSection === 'motorcycles' ? 'transform rotate-180' : ''
                        }`} 
                      />
                    </button>
                    
                    {expandedSection === 'motorcycles' && (
                      <div className="divide-y divide-gray-100">
                        {dashboardData.motorcycles
                          .filter((m: { id: string; isOwned: boolean }) => m.id !== defaultMotorcycle?.id && m.isOwned !== false)
                          .map((motorcycle: { id: string; name: string; currentMileage?: number; imageUrl?: string }) => (
                            <div key={motorcycle.id} className="p-3 flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 mr-3">
                                  {motorcycle.imageUrl ? (
                                    <img 
                                      src={motorcycle.imageUrl} 
                                      alt={motorcycle.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Bike size={16} className="text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-medium text-sm">{motorcycle.name}</h3>
                                  <p className="text-xs text-gray-500">
                                    {motorcycle.currentMileage 
                                      ? formatDistance(motorcycle.currentMileage) 
                                      : "No mileage"}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => openMileageModal(motorcycle)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                              >
                                <Gauge size={16} />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
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
          <MileageUpdateModal 
            onClose={() => setShowMileageModal(false)} 
            motorcycle={selectedMotorcycle}
          />
        )}
      </main>
    </ClientLayout>
  );
}