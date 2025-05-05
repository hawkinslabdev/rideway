// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  Bike, Calendar, Wrench, History, Settings,
  User, LogOut, Download, Upload, ChevronDown,
  ChevronUp, Menu, X
} from "lucide-react";

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
};

const NavItem = ({ href, icon, label, onClick }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-3 text-sm ${
        isActive
          ? "bg-gray-700 text-white font-medium"
          : "text-gray-300 hover:bg-gray-700"
      }`}
      onClick={onClick}
    >
      <div className="mr-3">{icon}</div>
      <span>{label}</span>
    </Link>
  );
};

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Close mobile menu when route changes
  const pathname = usePathname();
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.contains(event.target as Node) && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/signin");
  };

  const handleExportDatabase = async () => {
    try {
      const response = await fetch("/api/user/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rideway-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      const response = await fetch("/api/user/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Import failed");

      const result = await response.json();
      alert(`Successfully imported ${result.importedMotorcycles} motorcycles!`);
      window.location.reload();
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import data. Please make sure the file is valid.");
    }

    if (event.target) event.target.value = "";
  };

  return (
    <>
      {/* Mobile menu button - only visible on mobile */}
      <div className="md:hidden bg-gray-800 text-white flex items-center justify-between p-4 sticky top-0 z-30">
        <div className="text-xl font-bold flex items-center">
          <Bike className="mr-2" />
          Rideway
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          className="p-2 focus:outline-none focus:ring-2 focus:ring-gray-600 rounded"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`
          bg-gray-800 text-white flex flex-col h-screen 
          fixed md:sticky top-0 left-0 w-64 z-40 
          transition-transform duration-300 transform 
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          overflow-y-auto
        `}
      >
        {/* Logo - hidden on mobile since we show it in the top bar */}
        <div className="hidden md:flex p-4 text-xl font-bold items-center">
          <Bike className="mr-2" />
          Rideway
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Main Menu
          </div>
          <NavItem 
            href="/" 
            icon={<Calendar size={18} />} 
            label="Dashboard" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <NavItem 
            href="/garage" 
            icon={<Bike size={18} />} 
            label="My Garage" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <NavItem 
            href="/maintenance" 
            icon={<Wrench size={18} />} 
            label="Maintenance" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <NavItem 
            href="/history" 
            icon={<History size={18} />} 
            label="Service History" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        </nav>

        {/* User Menu */}
        <div className="border-t border-gray-700 pt-2 pb-4">
          {session?.user ? (
            <div className="p-4">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
              >
                <div className="flex items-center">
                  <User size={18} className="mr-3" />
                  <span className="truncate">{session.user.name || session.user.email}</span>
                </div>
                {isUserMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isUserMenuOpen && (
                <div className="mt-2 space-y-1">
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User size={16} className="mr-3" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings size={16} className="mr-3" />
                    Settings
                  </Link>
                  
                  {/* Import/Export */}
                  <div className="pt-2 pb-1">
                    <div className="px-4 text-xs font-semibold text-gray-400">Data Management</div>
                    <button
                      onClick={handleExportDatabase}
                      className="w-full flex items-center px-4 py-2 mt-1 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
                    >
                      <Download size={16} className="mr-3" />
                      Export Data
                    </button>
                    <label className="w-full flex items-center px-4 py-2 mt-1 text-sm text-gray-300 hover:bg-gray-700 rounded-md cursor-pointer">
                      <Upload size={16} className="mr-3" />
                      Import Data
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportDatabase}
                      />
                    </label>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-md"
                    >
                      <LogOut size={16} className="mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <Link
                href="/auth/signin"
                className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LogOut size={18} className="mr-3" />
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}