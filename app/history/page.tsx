"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Filter, Download, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ServiceHistoryPage() {
  const [selectedMotorcycle, setSelectedMotorcycle] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  // Mock data
  const motorcycles = [
    { id: 1, name: "Ducati Monster" },
    { id: 2, name: "Triumph Bonneville" },
  ];

  const serviceHistory = [
    {
      id: 1,
      motorcycle: "Ducati Monster",
      date: new Date(2025, 2, 15),
      mileage: 5000,
      task: "Oil Change",
      cost: 85.00,
      location: "Joe's Motorcycle Service",
      notes: "Used Motul 7100 synthetic oil",
    },
    {
      id: 2,
      motorcycle: "Ducati Monster",
      date: new Date(2025, 2, 15),
      mileage: 5000,
      task: "Air Filter Replacement",
      cost: 45.00,
      location: "Joe's Motorcycle Service",
      notes: "K&N performance filter installed",
    },
    {
      id: 3,
      motorcycle: "Triumph Bonneville",
      date: new Date(2025, 1, 20),
      mileage: 12300,
      task: "Chain and Sprocket Replacement",
      cost: 280.00,
      location: "British Motorcycle Works",
      notes: "DID Gold chain with OEM sprockets",
    },
  ];

  // Chart data
  const costChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Maintenance Costs",
        data: [0, 280, 130, 0, 0, 0],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Maintenance Cost Trend",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Cost ($)",
        },
      },
    },
  };

  const totalCost = serviceHistory.reduce((sum, record) => sum + record.cost, 0);

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Service History</h1>
          <p className="text-gray-600">View and analyze your maintenance records</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Services</h3>
            <p className="text-2xl font-bold mt-2">{serviceHistory.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
            <p className="text-2xl font-bold mt-2">${totalCost.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Average Cost</h3>
            <p className="text-2xl font-bold mt-2">
              ${(totalCost / serviceHistory.length).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Last Service</h3>
            <p className="text-2xl font-bold mt-2">
              {format(new Date(2025, 2, 15), "MMM d")}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <Line options={chartOptions} data={costChartData} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search service records..."
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
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>

            <button className="flex items-center px-3 py-2 border rounded-md hover:bg-gray-50">
              <Filter size={20} className="mr-2" />
              More Filters
            </button>

            <button className="flex items-center px-3 py-2 border rounded-md hover:bg-gray-50">
              <Download size={20} className="mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Service History Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
              {serviceHistory.map(record => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(record.date, "MMM d, yyyy")}
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
                    {record.mileage.toLocaleString()} mi
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${record.cost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.location}
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
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}