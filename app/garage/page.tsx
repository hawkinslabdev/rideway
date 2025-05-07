// app/garage/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import ClientLayout from "../components/ClientLayout";
import { 
  Plus, MoreVertical, Search, Bike, Edit, Trash2, 
  Star, Filter, Calendar, 
  Gauge, Wrench, AlertTriangle, CheckCircle
} from "lucide-react";
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
  isOwned: boolean;
  isDefault: boolean;
  color?: string;
  vin?: string; 
}

const DropdownMenu = ({ children, isOpen, onClose, triggerRef }: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
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
  const [showArchived, setShowArchived] = useState(false);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<Record<string, number>>({});
  const dropdownTriggerRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    fetchMotorcycles();
    fetchMaintenanceAlerts();
  }, []);

  const fetchMotorcycles = async () => {
    try {
      setLoading(true);
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

  const fetchMaintenanceAlerts = async () => {
    try {
      const response = await fetch("/api/maintenance");
      if (response.ok) {
        const data = await response.json();
        
        // Create a map of motorcycle IDs to alert counts
        const alerts: Record<string, number> = {};
        if (data.tasks) {
          data.tasks.forEach((task: any) => {
            if (task.isDue && !task.archived) {
              alerts[task.motorcycleId] = (alerts[task.motorcycleId] || 0) + 1;
            }
          });
        }
        setMaintenanceAlerts(alerts);
      }
    } catch (error) {
      console.error("Error fetching maintenance alerts:", error);
    }
  };

  // Filter motorcycles based on search, make, and ownership status
  const filteredMotorcycles = motorcycles.filter(motorcycle => {
    const matchesSearch = motorcycle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         motorcycle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         motorcycle.make.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMake = !selectedMake || motorcycle.make.toLowerCase() === selectedMake.toLowerCase();
    const matchesOwnership = showArchived ? true : motorcycle.isOwned !== false;
    
    return matchesSearch && matchesMake && matchesOwnership;
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

  const handleSetDefaultMotorcycle = async (motorcycleId: string) => {
    try {
      const response = await fetch("/api/motorcycles/default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ motorcycleId }),
      });

      if (!response.ok) {
        throw new Error("Failed to set default motorcycle");
      }

      // Update local state to reflect the new default
      setMotorcycles(prev => 
        prev.map(moto => ({
          ...moto,
          isDefault: moto.id === motorcycleId
        }))
      );
      
      // Close the dropdown
      setOpenDropdownId(null);
    } catch (err) {
      console.error("Error setting default motorcycle:", err);
      setError("Failed to set default motorcycle");
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

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800 flex items-center">
                <AlertTriangle size={18} className="mr-2 text-red-600" />
                {error}
              </p>
            </div>
          )}

          {/* Motorcycle Cards */}
          {motorcycles.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-10 text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Bike size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-medium mb-2">Your garage is empty</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Add your first motorcycle to start tracking maintenance and mileage.
              </p>
              <Link
                href="/garage/add?initial=true"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={18} className="mr-2" />
                Add Your First Motorcycle
              </Link>
            </div>
          ) : (
            <>
              {/* Search and Filter */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center">
                <div className="relative flex-grow min-w-[200px]">
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
                  className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Makes</option>
                  {uniqueMakes.map(make => (
                    <option key={make} value={make.toLowerCase()}>{make}</option>
                  ))}
                </select>
                
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`inline-flex items-center px-3 py-2 border ${
                    showArchived ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-700'
                  } rounded-md text-sm font-medium hover:bg-gray-50`}
                >
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </button>
              </div>

              {/* Enhanced Motorcycle Cards - Better suited for 1-4 motorcycles */}
              <div className="space-y-4">
                {filteredMotorcycles.length > 0 ? (
                  filteredMotorcycles.map(motorcycle => (
                    <div 
                      key={motorcycle.id}
                      className={`bg-white rounded-lg shadow-md overflow-hidden border ${
                        motorcycle.isDefault ? 'border-blue-500' : 'border-gray-200'
                      } ${!motorcycle.isOwned ? 'opacity-80' : ''} hover:shadow-lg transition`}
                    >
                      <div className="md:flex">
                        {/* Left side - Image */}
                        <div className="md:w-1/3 h-full">
                          <div className="h-48 md:h-full bg-gray-100 relative">
                            {motorcycle.imageUrl ? (
                              <img 
                                src={motorcycle.imageUrl} 
                                alt={motorcycle.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Bike size={48} className="text-gray-400" />
                              </div>
                            )}
                            
                            {/* Status badges */}
                            <div className="absolute top-2 left-2 flex space-x-2">
                              {motorcycle.isDefault && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center shadow-sm">
                                  <Star size={12} className="mr-1 fill-yellow-300 text-yellow-300" />
                                  Default
                                </span>
                              )}
                              
                              {!motorcycle.isOwned && (
                                <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                                  Archived
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right side - Content */}
                        <div className="p-5 md:w-2/3 flex flex-col">
                          <div className="flex justify-between items-start">
                            <div>
                              <h2 className="font-bold text-xl text-gray-900">{motorcycle.name}</h2>
                              <p className="text-gray-600">
                                {motorcycle.year} {motorcycle.make} {motorcycle.model}
                              </p>
                            </div>
                            
                            <div className="relative">
                              <button
                                ref={(el) => { dropdownTriggerRefs.current[motorcycle.id] = el; }}
                                onClick={() => setOpenDropdownId(openDropdownId === motorcycle.id ? null : motorcycle.id)}
                                className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                              >
                                <MoreVertical size={20} />
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
                                  
                                  {/* Set as Default option - only shown for non-default owned motorcycles */}
                                  {motorcycle.isOwned && !motorcycle.isDefault && (
                                    <button
                                      onClick={() => handleSetDefaultMotorcycle(motorcycle.id)}
                                      className="w-full flex items-center px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                                      role="menuitem"
                                    >
                                      <Star size={16} className="mr-3" />
                                      Set as Default
                                    </button>
                                  )}
                                  
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
                          </div>
                          
                          {/* Stats */}
                          <div className="mt-3 flex flex-wrap gap-3">
                            {motorcycle.currentMileage !== null && (
                              <div className="flex items-center bg-gray-100 rounded-md px-3 py-1.5">
                                <Gauge size={16} className="mr-1.5 text-gray-600" />
                                <span className="text-sm font-medium">
                                  {formatDistance(motorcycle.currentMileage)}
                                </span>
                              </div>
                            )}
                            
                            {/* Maintenance status */}
                            {maintenanceAlerts[motorcycle.id] > 0 ? (
                              <div className="flex items-center bg-red-50 text-red-700 rounded-md px-3 py-1.5">
                                <AlertTriangle size={16} className="mr-1.5" />
                                <span className="text-sm font-medium">
                                  {maintenanceAlerts[motorcycle.id]} maintenance {maintenanceAlerts[motorcycle.id] === 1 ? 'item' : 'items'} due
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center bg-green-50 text-green-700 rounded-md px-3 py-1.5">
                                <CheckCircle size={16} className="mr-1.5" />
                                <span className="text-sm font-medium">
                                  Maintenance up to date
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Quick info - display more useful motorcycle info */}
                          <div className="mt-3 text-sm text-gray-500">
                            {motorcycle.vin && (
                              <div className="flex items-center mt-1">
                                <span className="w-16 text-gray-600">VIN:</span>
                                <span>{motorcycle.vin}</span>
                              </div>
                            )}
                            {motorcycle.color && (
                              <div className="flex items-center mt-1">
                                <span className="w-16 text-gray-600">Color:</span>
                                <span>{motorcycle.color}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Buttons */}
                          <div className="mt-auto pt-4 flex space-x-2">
                            <Link
                              href={`/garage/${motorcycle.id}`}
                              className="flex-grow px-3 py-2 bg-blue-600 text-white text-center text-sm rounded hover:bg-blue-700 transition"
                            >
                              View Details
                            </Link>
                            <Link
                              href={`/maintenance/add?motorcycle=${motorcycle.id}`}
                              className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50 transition flex items-center"
                            >
                              <Wrench size={16} className="mr-1.5" />
                              Maintain
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <div className="bg-gray-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Bike size={24} className="text-gray-500" />
                    </div>
                    <h2 className="text-lg font-medium text-gray-900 mb-1">No motorcycles found</h2>
                    <p className="text-gray-500 mb-4">
                      {searchTerm || selectedMake 
                        ? "Try adjusting your search filters"
                        : showArchived 
                          ? "No archived motorcycles found"
                          : "No active motorcycles found"}
                    </p>
                    {searchTerm || selectedMake ? (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedMake("");
                        }}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Clear Filters
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </ClientLayout>
  );
}