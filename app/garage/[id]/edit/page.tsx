// app/garage/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Camera, Archive, Trash2, AlertCircle } from "lucide-react";
import ClientLayout from "@/app/components/ClientLayout";
import { useSettings } from "@/app/contexts/SettingsContext";
import DockerImageAdapter from "@/app/components/DockerImageAdapter";

export default function EditMotorcycle({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { getUnitsLabel } = useSettings();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [motorcycleId, setMotorcycleId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [motorcycle, setMotorcycle] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    vin: "",
    color: "",
    purchaseDate: "",
    currentMileage: "",
    notes: "",
    imageUrl: "",
  });

  const motorcycleMakes = [
    "BMW", "Ducati", "Harley-Davidson", "Honda", "Kawasaki", 
    "KTM", "Suzuki", "Triumph", "Yamaha", "Other"
  ];

  const unitsLabel = getUnitsLabel().distance;

  // Handle async params
  useEffect(() => {
    params.then(({ id }) => {
      setMotorcycleId(id);
    });
  }, [params]);

  // Fetch current motorcycle data
  useEffect(() => {
    if (!motorcycleId) return;
    fetchMotorcycle();
  }, [motorcycleId]);

const uploadImage = async (file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    // Use the dedicated image upload API
    const response = await fetch('/api/uploads/image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      // Parse error details if available
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || 'Failed to upload image';
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    setError(error instanceof Error ? error.message : 'Failed to upload image');
    return null;
  }
};


  const fetchMotorcycle = async () => {
    try {
      const response = await fetch(`/api/motorcycles/${motorcycleId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch motorcycle");
      }
      const data = await response.json();
      const motorcycle = data.motorcycle;
      
      // Store the full motorcycle object
      setMotorcycle(motorcycle);
      
      setFormData({
        name: motorcycle.name || "",
        make: motorcycle.make || "",
        model: motorcycle.model || "",
        year: motorcycle.year || new Date().getFullYear(),
        vin: motorcycle.vin || "",
        color: motorcycle.color || "",
        purchaseDate: motorcycle.purchaseDate ? motorcycle.purchaseDate.split('T')[0] : "",
        currentMileage: motorcycle.currentMileage?.toString() || "",
        notes: motorcycle.notes || "",
        imageUrl: motorcycle.imageUrl || "",
      });
      
      if (motorcycle.imageUrl) {
        setImagePreview(motorcycle.imageUrl);
      }
    } catch (err) {
      setError("Failed to load motorcycle data");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggleOwnership = async () => {
    if (!motorcycleId || !motorcycle) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/motorcycles/ownership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          motorcycleId, 
          isOwned: !motorcycle.isOwned 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update ownership status");
      }
      
      // Redirect back to the motorcycle details page
      router.push(`/garage/${motorcycleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ownership status");
      setLoading(false);
    }
  };

  const handleDeleteMotorcycle = async () => {
    if (!motorcycleId) return;
    
    setDeleteLoading(true);
    setError("");
    
    try {
      const response = await fetch(`/api/motorcycles/${motorcycleId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete motorcycle");
      }
      
      // Redirect to garage page after successful deletion
      router.push(`/garage`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete motorcycle");
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!motorcycleId) return;
    
    setLoading(true);
    setError("");

    try {
      // First handle image upload if there's a new image
      let finalImageUrl = formData.imageUrl;
      
      if (imageFile) {
        // Upload the image separately
        const uploadedImageUrl = await uploadImage(imageFile);
        if (!uploadedImageUrl) {
          // Image upload failed, but allow the form to continue if user wants
          if (!confirm('Image upload failed. Do you want to continue saving other changes?')) {
            setLoading(false);
            return;
          }
        } else {
          finalImageUrl = uploadedImageUrl;
        }
      }
      
      // Create data to submit (without the image file)
      const submitData = {
        ...formData,
        imageUrl: finalImageUrl,
        // Parse numeric values
        year: parseInt(formData.year.toString()),
        currentMileage: formData.currentMileage ? parseInt(formData.currentMileage) : null,
      };

      // Submit the motorcycle data as JSON (not FormData)
      const response = await fetch(`/api/motorcycles/${motorcycleId}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error("Failed to update motorcycle");
      }

      router.push(`/garage/${motorcycleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update motorcycle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while waiting for params
  if (!motorcycleId) {
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
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link href={`/garage/${motorcycleId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft size={16} className="mr-1" />
              Back to Details
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Edit Motorcycle</h1>
                <p className="text-gray-600">Update the details of your motorcycle</p>
              </div>
              
              <div className="mt-2 md:mt-0 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-1.5 text-red-600 border border-red-300 rounded hover:bg-red-50 text-sm font-medium flex items-center"
                >
                  <Trash2 size={16} className="mr-1.5" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowOwnershipModal(true)}
                  className={`px-3 py-1.5 border rounded text-sm font-medium flex items-center ${
                    motorcycle?.isOwned
                      ? "border-amber-300 text-amber-600 hover:bg-amber-50"
                      : "border-blue-300 text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Archive size={16} className="mr-1.5" />
                  {motorcycle?.isOwned ? "Archive" : "Restore"}
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {error && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                  <div className="flex items-start">
                    <AlertCircle size={18} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="md:flex md:space-x-8">
                   {/* Left column - Photo upload - REPLACE THIS SECTION */}
                  <div className="md:w-1/3 mb-6 md:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motorcycle Photo
                    </label>
                    <div className="mt-1 border-2 border-gray-300 border-dashed rounded-lg overflow-hidden">
                      {/* Use DockerImageAdapter for previewing the existing image */}
                      <div className="aspect-square w-full relative flex items-center justify-center bg-gray-50">
                        {imagePreview ? (
                          imagePreview.startsWith('data:') ? (
                            // For local file preview (from FileReader)
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            // For server-stored images, use DockerImageAdapter
                            <DockerImageAdapter 
                              src={imagePreview} 
                              alt="Motorcycle Preview" 
                              className="w-full h-full object-cover"
                              fallbackText="Image not available"
                            />
                          )
                        ) : (
                          <Camera className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      
                      {/* File upload controls - no changes here */}
                      <div className="p-3 bg-gray-50 border-t border-gray-200">
                        <div className="flex justify-center">
                          <label className="cursor-pointer bg-white rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50">
                            <span>{imagePreview ? 'Change photo' : 'Upload a photo'}</span>
                            <input 
                              type="file" 
                              className="sr-only" 
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-2">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Right column - Motorcycle details */}
                  <div className="md:w-2/3">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Nickname <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="e.g., My Ducati"
                        />
                      </div>

                      <div>
                        <label htmlFor="make" className="block text-sm font-medium text-gray-700">
                          Make <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="make"
                          id="make"
                          required
                          value={formData.make}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="">Select make</option>
                          {motorcycleMakes.map(make => (
                            <option key={make} value={make}>{make}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                          Model <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="model"
                          id="model"
                          required
                          value={formData.model}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="e.g., Monster 937"
                        />
                      </div>

                      <div>
                        <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                          Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="year"
                          id="year"
                          required
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          value={formData.year}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="vin" className="block text-sm font-medium text-gray-700">
                          VIN
                        </label>
                        <input
                          type="text"
                          name="vin"
                          id="vin"
                          value={formData.vin}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="17 characters"
                        />
                      </div>

                      <div>
                        <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                          Color
                        </label>
                        <input
                          type="text"
                          name="color"
                          id="color"
                          value={formData.color}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="e.g., Red"
                        />
                      </div>

                      <div>
                        <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">
                          Purchase Date
                        </label>
                        <input
                          type="date"
                          name="purchaseDate"
                          id="purchaseDate"
                          value={formData.purchaseDate}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="currentMileage" className="block text-sm font-medium text-gray-700">
                          Current Mileage ({unitsLabel})
                        </label>
                        <input
                          type="number"
                          name="currentMileage"
                          id="currentMileage"
                          min="0"
                          value={formData.currentMileage}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder={`e.g., 5000 ${unitsLabel}`}
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        id="notes"
                        rows={4}
                        value={formData.notes}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Any additional information about your motorcycle"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Form Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
                <Link
                  href={`/garage/${motorcycleId}`}
                  className="mt-3 sm:mt-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save size={16} className="mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Ownership toggle modal */}
        {showOwnershipModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium mb-2">
                {motorcycle?.isOwned ? "Archive Motorcycle" : "Restore Motorcycle"}
              </h3>
              <p className="text-gray-600 mb-4">
                {motorcycle?.isOwned
                  ? "Archiving will mark this motorcycle as no longer owned. It will still appear in your service history but will be hidden from the main garage view."
                  : "Restoring will mark this motorcycle as currently owned and make it visible in your garage again."}
              </p>
              
              {motorcycle?.isOwned && motorcycle?.isDefault && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                  <strong>Note:</strong> This motorcycle is currently set as your default. Archiving it will remove this status.
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowOwnershipModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleOwnership}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    motorcycle?.isOwned
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  disabled={loading}
                >
                  {loading ? "Processing..." : (motorcycle?.isOwned ? "Archive Motorcycle" : "Restore Motorcycle")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 rounded-full p-2 mr-3">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-medium">Delete Motorcycle</h3>
              </div>
              
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete <strong>{motorcycle?.name}</strong>?
              </p>
              
              <p className="text-gray-600 mb-4">
                This action cannot be undone. All maintenance records and data associated with this motorcycle will be permanently deleted.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMotorcycle}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ClientLayout>
  );
}