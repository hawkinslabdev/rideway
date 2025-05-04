// app/garage/page.tsx
"use client";

import { useState, useEffect } from "react";
import ClientLayout from "../components/ClientLayout";
import { Plus, MoreVertical, Search, Bike } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
  imageUrl: string | null;
}

export default function Garage() {
  const router = useRouter();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMake, setSelectedMake] = useState("");

  useEffect(() => {
    fetchMotorcycles();
  }, []);

  const fetchMotorcycles = async () => {
    try {
      const response = await fetch("/api/motorcycles");
      if (!response.ok) {
        throw new Error("Failed to fetch motorcycles");
      }
      const data = await response.json();
      setMotorcycles(data.motorcycles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Filter motorcycles based on search and make
  const filteredMotorcycles = motorcycles.filter(motorcycle => {
    const matchesSearch = motorcycle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         motorcycle.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMake = !selectedMake || motorcycle.make.toLowerCase() === selectedMake.toLowerCase();
    return matchesSearch && matchesMake;
  });

  // Get unique makes for the filter dropdown
  const uniqueMakes = Array.from(new Set(motorcycles.map(m => m.make)));

  if (loading) {
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
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </main>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Garage</h1>
          <Link 
            href="/garage/add" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700"
          >
            <Plus size={18} className="mr-1" />
            Add Motorcycle
          </Link>
        </div>

        {/* Search and filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search motorcycles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select 
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="ml-4 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Makes</option>
            {uniqueMakes.map(make => (
              <option key={make} value={make.toLowerCase()}>{make}</option>
            ))}
          </select>
        </div>

        {/* Motorcycle List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motorcycle
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mileage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMotorcycles.map((motorcycle) => (
                <tr key={motorcycle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {motorcycle.imageUrl ? (
                          <img 
                            src={motorcycle.imageUrl} 
                            alt={motorcycle.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 font-medium">{motorcycle.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{motorcycle.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{motorcycle.make} {motorcycle.model}</div>
                    <div className="text-sm text-gray-500">{motorcycle.year}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {motorcycle.currentMileage ? `${motorcycle.currentMileage} mi` : "Not set"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => router.push(`/garage/${motorcycle.id}`)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => router.push(`/garage/${motorcycle.id}/edit`)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMotorcycles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="py-8">
                      <Bike size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {motorcycles.length === 0 
                          ? "No motorcycles in your garage yet" 
                          : "No motorcycles match your search criteria"}
                      </p>
                      {motorcycles.length === 0 && (
                        <Link
                          href="/garage/add"
                          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <Plus size={18} className="mr-1" />
                          Add Your First Motorcycle
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </ClientLayout>
  );
}