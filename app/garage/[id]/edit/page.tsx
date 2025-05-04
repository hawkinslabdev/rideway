"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Camera } from "lucide-react";
import Sidebar from "../../../components/Sidebar";

export default function EditMotorcycle({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [motorcycleId, setMotorcycleId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
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

  // Handle async params
  useEffect(() => {
    params.then(({ id }) => {
      setMotorcycleId(id);
    });
  }, [params]);

  // Fetch current motorcycle data
  useEffect(() => {
    if (!motorcycleId) return;

    const fetchMotorcycle = async () => {
      try {
        const response = await fetch(`/api/motorcycles/${motorcycleId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch motorcycle");
        }
        const data = await response.json();
        const motorcycle = data.motorcycle;
        
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

    fetchMotorcycle();
  }, [motorcycleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      // Create FormData to handle file upload
      const submitData = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'imageUrl' || !imageFile) { // Don't send imageUrl if there's a new file
          submitData.append(key, value.toString());
        }
      });
      
      // Add image file if present
      if (imageFile) {
        submitData.append('image', imageFile);
      }

      const response = await fetch(`/api/motorcycles/${motorcycleId}`, {
        method: "PATCH",
        body: submitData,
      });

      if (!response.ok) {
        throw new Error("Failed to update motorcycle");
      }

      router.push(`/garage/${motorcycleId}`);
    } catch (err) {
      setError("Failed to update motorcycle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while waiting for params
  if (!motorcycleId) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <Link href={`/garage/${motorcycleId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} className="mr-1" />
            Back to Details
          </Link>
          
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Edit Motorcycle</h1>
            <p className="text-gray-600">Update the details of your motorcycle</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              {error && (
                <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded">
                  {error}
                </div>
              )}

              {/* Photo Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motorcycle Photo
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div className="mb-4">
                        <img src={imagePreview} alt="Preview" className="mx-auto h-32 w-auto rounded-md object-cover" />
                      </div>
                    ) : (
                      <Camera className="mx-auto h-12 w-12 text-gray-400" />
                    )}
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>{imagePreview ? 'Change photo' : 'Upload a photo'}</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>

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
                    Current Mileage
                  </label>
                  <input
                    type="number"
                    name="currentMileage"
                    id="currentMileage"
                    min="0"
                    value={formData.currentMileage}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., 5000"
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
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Any additional information about your motorcycle"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <Link
                href={`/garage/${motorcycleId}`}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Save size={16} className="mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}