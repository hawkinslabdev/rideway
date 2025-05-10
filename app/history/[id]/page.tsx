// app/history/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, AlertCircle, Edit } from "lucide-react";
import { format, parseISO } from "date-fns";
import ClientLayout from "../../components/ClientLayout";
import { useSettings } from "../../contexts/SettingsContext";

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

export default function ServiceRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { formatDistance, formatCurrency } = useSettings();
  const [record, setRecord] = useState<ServiceRecord | null>(null);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    motorcycleId: "",
    date: "",
    mileage: "",
    task: "",
    cost: "",
    location: "",
    notes: "",
  });

  // Fetch service record details
  useEffect(() => {
    const fetchServiceRecord = async () => {
      try {
        if (!params.id) return;
        
        setIsLoading(true);
        const response = await fetch(`/api/service-history/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Service record not found");
          }
          throw new Error("Failed to fetch service record");
        }
        
        const data = await response.json();
        setRecord(data.record);
        
        // Initialize form data
        setFormData({
          motorcycleId: data.record.motorcycleId,
          date: data.record.date.split('T')[0], // Format date for input
          mileage: data.record.mileage !== null ? data.record.mileage.toString() : "",
          task: data.record.task,
          cost: data.record.cost !== null ? data.record.cost.toString() : "",
          location: data.record.location || "",
          notes: data.record.notes || "",
        });
        
        // Fetch motorcycles for dropdown
        const motorcyclesResponse = await fetch("/api/motorcycles");
        if (motorcyclesResponse.ok) {
          const motorcyclesData = await motorcyclesResponse.json();
          setMotorcycles(motorcyclesData.motorcycles || []);
        }
      } catch (err) {
        console.error("Error fetching service record:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchServiceRecord();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch(`/api/service-history/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motorcycleId: formData.motorcycleId,
          date: new Date(formData.date).toISOString(),
          mileage: formData.mileage ? parseInt(formData.mileage) : null,
          task: formData.task,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          location: formData.location || null,
          notes: formData.notes || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update service record");
      }
      
      // Update successful
      const data = await response.json();
      setRecord(data.record);
      setIsEditing(false);
      
    } catch (err) {
      console.error("Error updating service record:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/service-history/${params.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete service record");
      }
      
      // Redirect back to history page
      router.push("/history?deleted=true");
      
    } catch (err) {
      console.error("Error deleting service record:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
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

  if (error || !record) {
    return (
      <ClientLayout>
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <Link href="/history" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft size={16} className="mr-1" />
              Back to Service History
            </Link>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-red-800">{error || "Service record not found"}</p>
          </div>
        </main>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <Link href="/history" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} className="mr-1" />
            Back to Service History
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <h1 className="text-xl font-bold">
              {isEditing ? "Edit Service Record" : "Service Record Details"}
            </h1>
          </div>
          
          {error && (
            <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          <div className="p-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="motorcycleId" className="block text-sm font-medium text-gray-700 mb-1">
                      Motorcycle
                    </label>
                    <select
                      id="motorcycleId"
                      name="motorcycleId"
                      value={formData.motorcycleId}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {motorcycles.map(motorcycle => (
                        <option key={motorcycle.id} value={motorcycle.id}>
                          {motorcycle.name} ({motorcycle.year} {motorcycle.make} {motorcycle.model})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                      Service Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type
                    </label>
                    <input
                      type="text"
                      id="task"
                      name="task"
                      value={formData.task}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Oil Change, Chain Maintenance"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-1">
                      Mileage
                    </label>
                    <input
                      type="number"
                      id="mileage"
                      name="mileage"
                      value={formData.mileage}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Odometer reading"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
                      Cost
                    </label>
                    <input
                      type="number"
                      id="cost"
                      name="cost"
                      value={formData.cost}
                      onChange={handleChange}
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Service cost"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      Service Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Where the service was performed"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Additional details about the service"
                  />
                </div>
                
                <div className="flex justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </button>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Save size={16} className="mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Motorcycle</h3>
                    <p className="mt-1 text-lg">{record.motorcycle}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Service Date</h3>
                    <p className="mt-1 text-lg">{format(parseISO(record.date), "MMMM d, yyyy")}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Service Type</h3>
                    <p className="mt-1 text-lg">{record.task}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Mileage</h3>
                    <p className="mt-1 text-lg">
                      {record.mileage !== null ? formatDistance(record.mileage) : "Not recorded"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Cost</h3>
                    <p className="mt-1 text-lg">
                      {record.cost !== null ? formatCurrency(record.cost) : "Not recorded"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Service Location</h3>
                    <p className="mt-1 text-lg">{record.location || "Not recorded"}</p>
                  </div>
                </div>
                
                {record.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                    <p className="mt-1 text-base whitespace-pre-wrap">{record.notes}</p>
                  </div>
                )}
                
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Delete Service Record</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this service record? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}