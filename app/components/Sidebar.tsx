// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Bike, Calendar, Wrench, History, Settings, User, LogOut, Download, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ href, icon, label }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-3 text-sm ${isActive ? "bg-gray-700 text-white font-medium" : "text-gray-300 hover:bg-gray-700"}`}
    >
      <div className="mr-3">{icon}</div>
      {label}
    </Link>
  );
};

export default function Sidebar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      a.download = `rideway-backup-${new Date().toISOString().split('T')[0]}.json`;
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      alert(`Successfully imported ${result.importedMotorcycles} motorcycles!`);
      
      // Refresh the page to show new data
      window.location.reload();
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import data. Please make sure the file is valid.");
    }

    // Reset the file input
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full">
      <div className="p-4 text-xl font-bold flex items-center">
        <Bike className="mr-2" />
        Rideway
      </div>
      <nav className="mt-8 flex-1">
        <NavItem href="/" icon={<Calendar size={18} />} label="Dashboard" />
        <NavItem href="/garage" icon={<Bike size={18} />} label="My Garage" />
        <NavItem href="/maintenance" icon={<Wrench size={18} />} label="Maintenance" />
        <NavItem href="/history" icon={<History size={18} />} label="Service History" />
      </nav>
      
      {/* User Menu Section */}
      <div className="border-t border-gray-700">
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
                >
                  <User size={16} className="mr-3" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
                >
                  <Settings size={16} className="mr-3" />
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-md"
                >
                  <LogOut size={16} className="mr-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <Link
              href="/auth/signin"
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
            >
              <LogOut size={18} className="mr-3" />
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}