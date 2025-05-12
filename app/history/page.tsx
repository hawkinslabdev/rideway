// app/history/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import ClientLayout from "../components/ClientLayout";
import { 
  Plus, MoreVertical, Search, Bike, Calendar, 
  Download, Filter, ChevronDown, AlertTriangle,
  BarChart3, PieChart, ArrowDownToLine, DollarSign,
  Info, FileText, CheckCircle,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO, isAfter, isBefore, startOfYear, endOfYear, subMonths } from "date-fns";
import { useSettings } from "../contexts/SettingsContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";
import { CSVLink } from "react-csv";
import ServiceRecordForm from "../components/ServiceRecordForm";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ServiceRecord {
  id: string;
  motorcycleId: string;
  taskId: string | null;
  motorcycle: string;
  motorcycleMake?: string;
  motorcycleModel?: string;
  motorcycleYear?: number;
  date: string;
  mileage: number | null;
  task: string;
  cost: number | null;
  location: string | null;
  notes: string | null;
}

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
}

interface CategoryStat {
  name: string;
  count: number;
  totalCost: number;
}

interface MotorcycleStat {
  id: string;
  name: string;
  count: number;
  totalCost: number;
}

interface Stats {
  totalRecords: number;
  totalCost: number;
  avgCost: number;
  categories: CategoryStat[];
  motorcycles: MotorcycleStat[];
}

export default function ServiceHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatDistance, formatCurrency } = useSettings();
  
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("12months");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [selectedView, setSelectedView] = useState<'table' | 'cost' | 'stats'>('table');
  
  const filterRef = useRef<HTMLDivElement>(null);
  const csvLink = useRef<any>(null);
  
  // Check URL params for any initial filters or success messages
  useEffect(() => {
    // Check for created flag (coming from add page)
    const created = searchParams.get('created');
    if (created === 'true') {
      // Show success message
      // You could implement a toast notification here
    }
    
    // Check for motorcycle filter
    const motoFilter = searchParams.get('motorcycle');
    if (motoFilter) {
      setSelectedMotorcycle(motoFilter);
    }
    
    // Check for other filters
    const taskFilter = searchParams.get('task');
    if (taskFilter) {
      setSelectedTask(taskFilter);
    }
  }, [searchParams]);

  // Fetch service history data
  useEffect(() => {
    fetchServiceRecords();
    fetchMotorcycles();
  }, []);

  // Update chart data when filters change
  useEffect(() => {
    if (serviceRecords.length > 0) {
      generateChartData(serviceRecords);
    }
  }, [serviceRecords, selectedMotorcycle, dateRange, startDate, endDate, selectedTask]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setOpenFilter(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchServiceRecords = async () => {
    try {
      setLoading(true);
      
      // Build the query URL with any filters
      let url = "/api/service-history";
      const queryParams = [];
      
      if (selectedMotorcycle !== "all") {
        queryParams.push(`motorcycleId=${selectedMotorcycle}`);
      }
      
      // Add date range filter
      if (dateRange === "custom" && startDate && endDate) {
        queryParams.push(`startDate=${startDate}`);
        queryParams.push(`endDate=${endDate}`);
      }
      
      // Add task type filter
      if (selectedTask !== "all") {
        queryParams.push(`taskType=${selectedTask}`);
      }
      
      // Add the query params to the URL
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch service history");
      }
      
      const data = await response.json();
      setServiceRecords(data.records || []);
      setStats(data.stats || null);
      
    } catch (err) {
      console.error("Error fetching service history:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchMotorcycles = async () => {
    try {
      const response = await fetch("/api/motorcycles");
      if (!response.ok) {
        throw new Error("Failed to fetch motorcycles");
      }
      
      const data = await response.json();
      setMotorcycles(data.motorcycles || []);
    } catch (err) {
      console.error("Error fetching motorcycles:", err);
    }
  };

  // Generate chart data based on filtered records
  const generateChartData = (records: ServiceRecord[]) => {
    // Apply filters
    const filteredRecords = applyFilters(records);
    
    // Group by month for cost trend
    const costsByMonth: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    
    // Initialize with zero values for the last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = format(date, "MMM yyyy");
      costsByMonth[monthKey] = 0;
    }
    
    // Sum costs by month
    filteredRecords.forEach(record => {
      if (record.cost === null) return;
      
      const recordDate = parseISO(record.date);
      const monthKey = format(recordDate, "MMM yyyy");
      if (costsByMonth[monthKey] !== undefined) {
        costsByMonth[monthKey] += record.cost;
      }
    });
    
    // Create cost trend chart data
    const costTrendData = {
      labels: Object.keys(costsByMonth),
      datasets: [
        {
          label: "Maintenance Costs",
          data: Object.values(costsByMonth),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          tension: 0.3,
        },
      ],
    };
    
    // Group by service type for pie chart
    const costsByType: Record<string, number> = {};
    filteredRecords.forEach(record => {
      if (record.cost === null) return;
      
      if (!costsByType[record.task]) {
        costsByType[record.task] = 0;
      }
      costsByType[record.task] += record.cost;
    });
    
    // Only keep top 5 categories for pie chart
    const sortedTypes = Object.entries(costsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Create pie chart data for cost by type
    const costByTypeData = {
      labels: sortedTypes.map(([type]) => type),
      datasets: [
        {
          data: sortedTypes.map(([_, value]) => value),
          backgroundColor: [
            "rgba(59, 130, 246, 0.7)",
            "rgba(16, 185, 129, 0.7)",
            "rgba(245, 158, 11, 0.7)",
            "rgba(239, 68, 68, 0.7)",
            "rgba(168, 85, 247, 0.7)",
          ],
          borderWidth: 1,
        },
      ],
    };
    
    // Group by motorcycle for motorcycle costs chart
    const costsByMotorcycle: Record<string, number> = {};
    filteredRecords.forEach(record => {
      if (record.cost === null) return;
      
      if (!costsByMotorcycle[record.motorcycle]) {
        costsByMotorcycle[record.motorcycle] = 0;
      }
      costsByMotorcycle[record.motorcycle] += record.cost;
    });
    
    // Sort motorcycles by cost for bar chart
    const sortedMotorcycles = Object.entries(costsByMotorcycle)
      .sort((a, b) => b[1] - a[1]);
    
    // Create bar chart data for cost by motorcycle
    const costByMotorcycleData = {
      labels: sortedMotorcycles.map(([name]) => name),
      datasets: [
        {
          label: "Total Cost",
          data: sortedMotorcycles.map(([_, value]) => value),
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 1,
        },
      ],
    };
    
    // Set all chart data
    setChartData({
      costTrend: costTrendData,
      costByType: costByTypeData,
      costByMotorcycle: costByMotorcycleData
    });
  };

  // Apply filters to service records
  const applyFilters = (records: ServiceRecord[]): ServiceRecord[] => {
    return records.filter(record => {
      // Filter by motorcycle
      if (selectedMotorcycle !== "all" && record.motorcycleId !== selectedMotorcycle) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm && 
          !record.task.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !record.motorcycle.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(record.notes && record.notes.toLowerCase().includes(searchTerm.toLowerCase())) &&
          !(record.location && record.location.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false;
      }
      
      // Filter by service type
      if (selectedTask !== "all" && record.task !== selectedTask) {
        return false;
      }
      
      // Filter by date range
      const recordDate = parseISO(record.date);
      
      if (dateRange === "custom") {
        if (startDate && endDate) {
          return isAfter(recordDate, parseISO(startDate)) && 
                 isBefore(recordDate, parseISO(endDate));
        }
        return true;
      } else if (dateRange === "12months") {
        return isAfter(recordDate, subMonths(new Date(), 12));
      } else if (dateRange === "6months") {
        return isAfter(recordDate, subMonths(new Date(), 6));
      } else if (dateRange === "3months") {
        return isAfter(recordDate, subMonths(new Date(), 3));
      } else if (dateRange === "thisyear") {
        return isAfter(recordDate, startOfYear(new Date())) && 
               isBefore(recordDate, endOfYear(new Date()));
      }
      
      return true;
    });
  };

  // Get unique task types for filter
  const getUniqueTasks = (): string[] => {
    const tasks = new Set<string>();
    serviceRecords.forEach(record => {
      tasks.add(record.task);
    });
    return Array.from(tasks).sort();
  };

  // Calculate statistics from filtered records
  const getFilteredStats = () => {
    const filteredRecords = applyFilters(serviceRecords);
    
    const totalCost = filteredRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
    const avgCost = filteredRecords.length > 0 ? totalCost / filteredRecords.length : 0;
    
    // Find most recent service date
    let latestDate = new Date(0);
    filteredRecords.forEach(record => {
      const recordDate = parseISO(record.date);
      if (isAfter(recordDate, latestDate)) {
        latestDate = recordDate;
      }
    });
    
    // Group by service type
    const categories: Record<string, { count: number, cost: number }> = {};
    filteredRecords.forEach(record => {
      if (!categories[record.task]) {
        categories[record.task] = { count: 0, cost: 0 };
      }
      categories[record.task].count++;
      categories[record.task].cost += record.cost || 0;
    });
    
    // Convert to array for easier consumption
    const categoryStats = Object.entries(categories).map(([name, data]) => ({
      name,
      count: data.count,
      totalCost: data.cost
    }));
    
    // Group by motorcycle
    const motorcycleStats: Record<string, { count: number, cost: number }> = {};
    filteredRecords.forEach(record => {
      if (!motorcycleStats[record.motorcycleId]) {
        motorcycleStats[record.motorcycleId] = { count: 0, cost: 0 };
      }
      motorcycleStats[record.motorcycleId].count++;
      motorcycleStats[record.motorcycleId].cost += record.cost || 0;
    });
    
    return {
      totalRecords: filteredRecords.length,
      totalCost,
      avgCost,
      lastServiceDate: filteredRecords.length > 0 ? latestDate : null,
      categories: categoryStats,
      motorcycles: Object.entries(motorcycleStats).map(([id, data]) => ({
        id,
        name: motorcycles.find(m => m.id === id)?.name || "Unknown",
        count: data.count,
        totalCost: data.cost
      }))
    };
  };

  // Export service records to CSV
  const handleExport = () => {
    if (csvLink.current) {
      csvLink.current.link.click();
    }
  };

  // Format records for CSV export
  const getExportData = () => {
    const filteredRecords = applyFilters(serviceRecords);
    
    return filteredRecords.map(record => ({
      Date: format(parseISO(record.date), "yyyy-MM-dd"),
      Motorcycle: record.motorcycle,
      Service: record.task,
      Mileage: record.mileage,
      Cost: record.cost,
      Location: record.location || "",
      Notes: record.notes || ""
    }));
  };

  // Apply all the filters and get filtered records
  const filteredRecords = applyFilters(serviceRecords);
  // Get filtered statistics based on the current filters
  const filteredStats = getFilteredStats();

  // Handle filtering changes
  const applyDateRange = (range: string) => {
    setDateRange(range);
    if (range !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <>
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Service History</h1>
                <p className="text-gray-600">Track and analyze your maintenance costs and activities</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedView('table')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    selectedView === 'table' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Records
                </button>
                <button
                  onClick={() => setSelectedView('cost')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    selectedView === 'cost' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cost Analysis
                </button>
                <button
                  onClick={() => setSelectedView('stats')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    selectedView === 'stats' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Statistics
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertTriangle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total Services</h3>
                    <p className="text-2xl font-bold">{filteredStats.totalRecords}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total Cost</h3>
                    <p className="text-2xl font-bold">{formatCurrency(filteredStats.totalCost)}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Average Cost</h3>
                    <p className="text-2xl font-bold">
                      {formatCurrency(filteredStats.avgCost)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Last Service</h3>
                    <p className="text-2xl font-bold">
                      {filteredStats.lastServiceDate ? format(filteredStats.lastServiceDate, "MMM d") : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Search service records..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 border rounded-md w-full"
                        />
                      </div>
                    </div>
                    
                    <select
                      value={selectedMotorcycle}
                      onChange={(e) => setSelectedMotorcycle(e.target.value)}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="all">All Motorcycles</option>
                      {motorcycles.map(moto => (
                        <option key={moto.id} value={moto.id}>
                          {moto.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={dateRange}
                      onChange={(e) => applyDateRange(e.target.value)}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="all">All Time</option>
                      <option value="3months">Last 3 Months</option>
                      <option value="6months">Last 6 Months</option>
                      <option value="12months">Last 12 Months</option>
                      <option value="thisyear">This Year</option>
                      <option value="custom">Custom Range</option>
                    </select>

                    <div className="relative" ref={filterRef}>
                      <button 
                        className="flex items-center px-3 py-2 border rounded-md hover:bg-gray-50"
                        onClick={() => setOpenFilter(!openFilter)}
                      >
                        <Filter size={18} className="mr-2" />
                        More Filters
                        <ChevronDown size={16} className={`ml-2 transition-transform ${openFilter ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {openFilter && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 p-4 border">
                          <h4 className="font-medium text-sm mb-2">Service Type</h4>
                          <select
                            value={selectedTask}
                            onChange={(e) => setSelectedTask(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md mb-3"
                          >
                            <option value="all">All Types</option>
                            {getUniqueTasks().map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          
                          {dateRange === "custom" && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm mb-2">Date Range</h4>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                                <input
                                  type="date"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="w-full px-3 py-2 border rounded-md"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                                <input
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  className="w-full px-3 py-2 border rounded-md"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button 
                      className="flex items-center px-3 py-2 border rounded-md hover:bg-gray-50"
                      onClick={handleExport}
                    >
                      <Download size={18} className="mr-2" />
                      Export
                    </button>
                    
                    <button 
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus size={18} className="mr-2" />
                      Log Service
                    </button>
                    
                    {/* Hidden CSV link for export */}
                    <CSVLink
                      data={getExportData()}
                      filename={"service-history.csv"}
                      className="hidden"
                      ref={csvLink}
                      target="_blank"
                    />
                  </div>
                </div>

                {/* Different Views */}
                {selectedView === 'table' && (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Motorcycle
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Service
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mileage
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Location
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredRecords.length > 0 ? (
                            filteredRecords.map(record => (
                              <tr key={record.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {format(parseISO(record.date), "MMM d, yyyy")}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.motorcycle}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{record.task}</div>
                                  {record.notes && (
                                    <div className="text-xs text-gray-500 truncate max-w-xs">{record.notes}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.mileage !== null ? formatDistance(record.mileage) : "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.cost !== null ? formatCurrency(record.cost) : "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {record.location || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <Link 
                                    href={`/history/${record.id}`}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                  >
                                    View
                                  </Link>
                                  <Link
                                    href={`/history/${record.id}/edit`}
                                    className="text-gray-600 hover:text-gray-900"
                                  >
                                    Edit
                                  </Link>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                                  <p className="font-medium mb-1">No service records found</p>
                                  <p className="text-sm mb-4">Try adjusting your filters or add new service records</p>
                                  <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                  >
                                    <Plus size={16} className="mr-1.5" />
                                    Add Service Record
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Cost Analysis View */}
                {selectedView === 'cost' && chartData && (
                  <div className="space-y-6">
                    {/* Cost Trend Chart */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-medium mb-4">Maintenance Cost Trend</h3>
                      <div className="h-80">
                        <Line 
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Cost',
                                },
                              },
                            },
                          }} 
                          data={chartData.costTrend} 
                        />
                      </div>
                    </div>
                    
                    {/* Cost Distribution by Category and Motorcycle */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Cost by Service Type */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium mb-4">Cost by Service Type</h3>
                        <div className="h-80 flex items-center justify-center">
                          {chartData.costByType.labels.length > 0 ? (
                            <Pie 
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                  },
                                },
                              }}
                              data={chartData.costByType}
                            />
                          ) : (
                            <div className="text-gray-500 text-center">
                              <DollarSign size={48} className="mx-auto text-gray-300 mb-2" />
                              <p>Not enough cost data to display</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Cost by Motorcycle */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium mb-4">Cost by Motorcycle</h3>
                        <div className="h-80">
                          {chartData.costByMotorcycle.labels.length > 0 ? (
                            <Bar 
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                  },
                                },
                                indexAxis: 'y',
                              }}
                              data={chartData.costByMotorcycle}
                            />
                          ) : (
                            <div className="text-gray-500 text-center h-full flex flex-col items-center justify-center">
                              <DollarSign size={48} className="text-gray-300 mb-2" />
                              <p>Not enough data to display</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Cost Summary Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="p-4 border-b">
                        <h3 className="text-lg font-medium">Cost Summary by Category</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Service Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Count
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Cost
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Average Cost
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                % of Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStats.categories.length > 0 ? (
                              filteredStats.categories
                                .sort((a, b) => b.totalCost - a.totalCost)
                                .map(category => (
                                  <tr key={category.name} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {category.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {category.count}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {formatCurrency(category.totalCost)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {formatCurrency(category.totalCost / category.count)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {filteredStats.totalCost > 0 
                                        ? `${((category.totalCost / filteredStats.totalCost) * 100).toFixed(1)}%` 
                                        : '0%'
                                      }
                                    </td>
                                  </tr>
                                ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                  No cost data available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Statistics View */}
                {selectedView === 'stats' && (
                  <div className="space-y-6">
                    {/* Motorcycle Service Summary */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="p-4 border-b">
                        <h3 className="text-lg font-medium">Service Summary by Motorcycle</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Motorcycle
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Service Count
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Cost
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Average Cost
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                % of Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStats.motorcycles.length > 0 ? (
                              filteredStats.motorcycles
                                .sort((a, b) => b.totalCost - a.totalCost)
                                .map(moto => (
                                  <tr key={moto.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {moto.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {moto.count}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {formatCurrency(moto.totalCost)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {formatCurrency(moto.totalCost / moto.count)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {filteredStats.totalCost > 0 
                                        ? `${((moto.totalCost / filteredStats.totalCost) * 100).toFixed(1)}%` 
                                        : '0%'
                                      }
                                    </td>
                                  </tr>
                                ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                  No service data available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Most Common Services */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-medium mb-4">Most Common Services</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredStats.categories
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 6)
                          .map(category => (
                            <div key={category.name} className="border rounded-lg p-4 hover:shadow-sm transition">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900">{category.name}</h4>
                                <span className="text-sm px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                  {category.count}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Total: {formatCurrency(category.totalCost)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Avg: {formatCurrency(category.totalCost / category.count)}
                              </p>
                            </div>
                          ))}
                      </div>
                      
                      {filteredStats.categories.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-6">
                          <Info size={48} className="text-gray-300 mb-2" />
                          <p className="text-gray-500">No service categories available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </ClientLayout>
      
      {/* Add Service Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-medium pl-2 pr-2">Add Service Record</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <ServiceRecordForm 
                motorcycleId={selectedMotorcycle !== "all" ? selectedMotorcycle : undefined}
                isModal={true}
                onClose={() => {
                  setShowAddModal(false);
                  // Refresh data after adding
                  fetchServiceRecords();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}