// app/history/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import ClientLayout from "../components/ClientLayout";
import { Filter, Download, Search, ChevronDown, Calendar, ArrowDownToLine, Bike, AlertCircle } from "lucide-react";
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
  motorcycle: string;
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

interface MaintenanceCategory {
  name: string;
  count: number;
  totalCost: number;
}

export default function ServiceHistoryPage() {
  const { formatDistance, formatCurrency } = useSettings();
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("12months");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [maintenanceCategories, setMaintenanceCategories] = useState<MaintenanceCategory[]>([]);
  const csvLink = useRef<any>(null);

  // Fetch service history data
  useEffect(() => {
    const fetchServiceHistory = async () => {
      try {
        setIsLoading(true);
        
        // Fetch service records
        const response = await fetch("/api/service-history");
        if (!response.ok) {
          throw new Error("Failed to fetch service history");
        }
        
        const data = await response.json();
        setServiceRecords(data.records || []);
        
        // Fetch motorcycles for the filter
        const motorcyclesResponse = await fetch("/api/motorcycles");
        if (!motorcyclesResponse.ok) {
          throw new Error("Failed to fetch motorcycles");
        }
        
        const motorcyclesData = await motorcyclesResponse.json();
        setMotorcycles(motorcyclesData.motorcycles || []);
        
        // Process service categories
        processMaintenanceCategories(data.records || []);
      } catch (err) {
        console.error("Error fetching service history:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchServiceHistory();
  }, []);

  // Process maintenance categories for charts
  const processMaintenanceCategories = (records: ServiceRecord[]) => {
    const categories: Record<string, { count: number; totalCost: number }> = {};
    
    records.forEach(record => {
      if (!categories[record.task]) {
        categories[record.task] = { count: 0, totalCost: 0 };
      }
      categories[record.task].count += 1;
      categories[record.task].totalCost += record.cost || 0;
    });
    
    const categoriesArray = Object.entries(categories).map(([name, data]) => ({
      name,
      count: data.count,
      totalCost: data.totalCost
    }));
    
    // Sort by count
    categoriesArray.sort((a, b) => b.count - a.count);
    
    setMaintenanceCategories(categoriesArray);
  };

  // Update chart data when filters change
  useEffect(() => {
    if (serviceRecords.length > 0) {
      generateChartData(serviceRecords);
    }
  }, [serviceRecords, selectedMotorcycle, dateRange, startDate, endDate]);

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
      const recordDate = parseISO(record.date);
      const monthKey = format(recordDate, "MMM yyyy");
      if (costsByMonth[monthKey] !== undefined) {
        costsByMonth[monthKey] += record.cost || 0;
      }
    });
    
    // Create chart data
    const costChartData = {
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
      if (!costsByType[record.task]) {
        costsByType[record.task] = 0;
      }
      costsByType[record.task] += record.cost || 0;
    });
    
    // Only keep top 5 categories for pie chart
    const sortedTypes = Object.entries(costsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Create pie chart data
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
    
    setChartData({
      costTrend: costChartData,
      costByType: costByTypeData
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

  // Get unique maintenance types
  const getMaintenanceTypes = (): string[] => {
    const types = new Set<string>();
    serviceRecords.forEach(record => {
      types.add(record.task);
    });
    return Array.from(types).sort();
  };

  // Calculate statistics
  const getStatistics = () => {
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
    
    return {
      totalServices: filteredRecords.length,
      totalCost,
      avgCost,
      lastServiceDate: filteredRecords.length > 0 ? latestDate : null
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

  const stats = getStatistics();

  return (
    <>
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Service History</h1>
            <p className="text-gray-600">View and analyze your maintenance records</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Total Services</h3>
                  <p className="text-2xl font-bold mt-2">{stats.totalServices}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalCost)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Average Cost</h3>
                  <p className="text-2xl font-bold mt-2">
                    {formatCurrency(stats.avgCost)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">Last Service</h3>
                  <p className="text-2xl font-bold mt-2">
                    {stats.lastServiceDate ? format(stats.lastServiceDate, "MMM d") : "N/A"}
                  </p>
                </div>
              </div>

              {/* Charts */}
              {chartData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Cost trend chart */}
                  <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium mb-4">Maintenance Cost Trend</h3>
                    <div className="h-80">
                      <Line options={{
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
                      }} data={chartData.costTrend} />
                    </div>
                  </div>
                  
                  {/* Cost by service type */}
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
                        <p className="text-gray-500 text-center">Not enough data to display</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
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
                    onChange={(e) => setDateRange(e.target.value)}
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
                      <Filter size={20} className="mr-2" />
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
                          {getMaintenanceTypes().map(type => (
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
                    <Download size={20} className="mr-2" />
                    Export
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

              {/* Maintenance Categories */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Service Categories</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {maintenanceCategories.slice(0, 6).map(category => (
                    <div key={category.name} className="border rounded-lg p-3 hover:bg-gray-50">
                      <h4 className="font-medium truncate">{category.name}</h4>
                      <div className="flex justify-between mt-2 text-sm">
                        <span className="text-gray-500">{category.count} service{category.count !== 1 ? 's' : ''}</span>
                        <span className="font-medium">{formatCurrency(category.totalCost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service History Table */}
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
                      {applyFilters(serviceRecords).map(record => (
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
                              <div className="text-sm text-gray-500">{record.notes}</div>
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
                            <button className="text-blue-600 hover:text-blue-900 mr-4">
                              View
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      
                      {applyFilters(serviceRecords).length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                              <p className="font-medium mb-1">No service records found</p>
                              <p className="text-sm">Try adjusting your filters or add new service records</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </ClientLayout>
    </>
  );
}