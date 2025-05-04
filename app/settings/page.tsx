// app/settings/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ClientLayout from "../components/ClientLayout";
import { Bell, Globe, Eye, Save, AlertCircle, Check, Trash2, Download, Upload, Database, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [importConfirmModal, setImportConfirmModal] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [importConfirmText, setImportConfirmText] = useState("");
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    maintenanceReminders: true,
    units: "imperial", // imperial or metric
    language: "en",
    theme: "light",
  });

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
    }
  }, [session, router]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // In a real app, you'd save these settings to the database
      // For now, we'll just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const response = await fetch("/api/user/export");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rideway-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      setError("Failed to export data. Please try again.");
    }
  };

  const handleImportFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Store the file and show the confirmation modal
    setPendingImportFile(file);
    setImportConfirmModal(true);
    // Reset the file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleImportDatabase = async () => {
    if (!pendingImportFile) return;

    // Check if user needs to confirm with their email
    if (session?.user?.email) {
      if (importConfirmText !== session.user.email) {
        setError("The email address doesn't match. Please type your email correctly.");
        return;
      }
    }

    setLoading(true);
    setError("");
    setSuccess(false);
    setImportConfirmModal(false);

    try {
      const fileContent = await pendingImportFile.text();
      const data = JSON.parse(fileContent);

      const response = await fetch("/api/user/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Import failed:", error);
      setError("Failed to import data. Please make sure the file is valid.");
    } finally {
      setLoading(false);
      setPendingImportFile(null);
      setImportConfirmText("");
    }
  };

  const handleDeleteAccount = async () => {
    // Check if user has confirmed with their email
    if (session?.user?.email) {
      if (deleteConfirmText !== session.user.email) {
        setError("The email address doesn't match. Please type your email correctly.");
        return;
      }
    }

    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Sign out and redirect to home
      router.push("/auth/signin");
    } catch (err) {
      setError("Failed to delete account");
    }
    
    setDeleteAccountModal(false);
    setDeleteConfirmText("");
  };

  if (!session) {
    return null;
  }

  const userIdentifier = session.user?.email || session.user?.name || "your account";

  return (
    <ClientLayout>
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-gray-600">Manage your application preferences and data</p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="flex items-center p-4 text-sm text-red-800 border border-red-300 rounded-lg bg-red-50">
                <AlertCircle className="flex-shrink-0 inline w-4 h-4 mr-3" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="flex items-center p-4 text-sm text-green-800 border border-green-300 rounded-lg bg-green-50">
                <Check className="flex-shrink-0 inline w-4 h-4 mr-3" />
                <span>Settings saved successfully!</span>
              </div>
            )}

            {/* Notifications */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Bell className="mr-2" size={20} />
                Notifications
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                    <p className="text-sm text-gray-500">Receive email updates about your motorcycles</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSettingChange("emailNotifications", !settings.emailNotifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.emailNotifications ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.emailNotifications ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Maintenance Reminders</label>
                    <p className="text-sm text-gray-500">Get reminders for upcoming maintenance</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSettingChange("maintenanceReminders", !settings.maintenanceReminders)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.maintenanceReminders ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.maintenanceReminders ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Globe className="mr-2" size={20} />
                Preferences
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                  <select
                    value={settings.units}
                    onChange={(e) => handleSettingChange("units", e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="imperial">Imperial (miles, gallons)</option>
                    <option value="metric">Metric (kilometers, liters)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange("language", e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Eye className="mr-2" size={20} />
                Appearance
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => handleSettingChange("theme", e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Database className="mr-2" size={20} />
                Data Management
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Backup & Restore</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Export your data to create a backup or import data from a previous backup.
                  </p>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleExportDatabase}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Download size={16} className="mr-2" />
                      Export Data
                    </button>
                    <label className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                      <Upload size={16} className="mr-2" />
                      Import Data
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportFileSelect}
                      />
                    </label>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-red-600 mb-2">Delete Account</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => setDeleteAccountModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Save size={16} className="mr-2" />
                {loading ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {deleteAccountModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              {session.user?.email && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="font-semibold">{session.user.email}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your email address"
                  />
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setDeleteAccountModal(false);
                    setDeleteConfirmText("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={session.user?.email ? deleteConfirmText !== session.user.email : false}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Confirmation Modal */}
        {importConfirmModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Import Data</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                This will import data from the selected file. Existing data may be overwritten or duplicated. This action cannot be undone.
              </p>
              {session.user?.email && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="font-semibold">{session.user.email}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={importConfirmText}
                    onChange={(e) => setImportConfirmText(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your email address"
                  />
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setImportConfirmModal(false);
                    setImportConfirmText("");
                    setPendingImportFile(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportDatabase}
                  disabled={session.user?.email ? importConfirmText !== session.user.email : false}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import Data
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ClientLayout>
  );
}