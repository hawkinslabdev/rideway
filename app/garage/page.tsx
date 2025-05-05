// app/garage/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import ClientLayout from "../components/ClientLayout";
import { Plus, MoreVertical, Search, Bike, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useSettings } from "../contexts/SettingsContext";

interface Motorcycle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number | null;
  imageUrl: string | null;
}

const DropdownMenu = ({ children, isOpen, onClose, triggerRef }: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 150, // 150px is roughly the width of the dropdown
      });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div
        className="absolute w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default function Garage() {
  const router = useRouter();
  // Import the settings and formatDistance function
  const { formatDistance } = useSettings();
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownTriggerRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

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

  const handleDeleteMotorcycle = async (motorcycleId: string) => {
    if (!confirm('Are you sure you want to delete this motorcycle? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/motorcycles/${motorcycleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete motorcycle');
      }

      // Remove the motorcycle from the local state
      setMotorcycles(motorcycles.filter(m => m.id !== motorcycleId));
      setOpenDropdownId(null);
    } catch (err) {
      console.error('Error deleting motorcycle:', err);
      setError('Failed to delete motorcycle');
    }
  };

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
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
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
                {filteredMotorcycles.map((motorcycle, index) => (
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
                        {/* Use formatDistance instead of hardcoded units */}
                        {motorcycle.currentMileage ? formatDistance(motorcycle.currentMileage) : "Not set"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center">
                        <button 
                          onClick={() => router.push(`/garage/${motorcycle.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Details
                        </button>
                        <button
                          ref={(el) => dropdownTriggerRefs.current[motorcycle.id] = el}
                          onClick={() => setOpenDropdownId(openDropdownId === motorcycle.id ? null : motorcycle.id)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                        >
                          <MoreVertical size={16} />
                        </button>
                        <DropdownMenu
                          isOpen={openDropdownId === motorcycle.id}
                          onClose={() => setOpenDropdownId(null)}
                          triggerRef={{ current: dropdownTriggerRefs.current[motorcycle.id] }}
                        >
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            <button
                              onClick={() => {
                                router.push(`/garage/${motorcycle.id}/edit`);
                                setOpenDropdownId(null);
                              }}
                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              <Edit size={16} className="mr-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMotorcycle(motorcycle.id)}
                              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              role="menuitem"
                            >
                              <Trash2 size={16} className="mr-3" />
                              Delete
                            </button>
                          </div>
                        </DropdownMenu>
                      </div>
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
        </div>
      </main>
    </ClientLayout>
  );
}