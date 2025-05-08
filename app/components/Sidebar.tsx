// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
  Bike, Home, Wrench, History, BarChart3, Settings,
  User, LogOut, Menu, X, ChevronDown, AlertCircle,
  Plus, Gauge, Bell, Calendar,
  ChevronRight
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import MileageUpdateModal from "./MileageUpdateModal"; // Create this component separately

const NavItem = ({ href, icon, label, badge = 0, alert = false }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  alert?: boolean;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link href={href} className={`flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-all duration-200 my-1 mx-2
      ${isActive ? "bg-blue-600 text-white font-medium shadow-md" : "text-gray-300 hover:bg-gray-700/50"}`}>
      <div className="flex items-center">
        <span className={`mr-3 ${isActive ? "text-white" : "text-gray-400"}`}>{icon}</span>
        {label}
      </div>
      {badge > 0 && (
        <span className="min-w-[20px] h-5 bg-red-500 text-white text-xs font-medium rounded-full px-1 flex items-center justify-center">
          {badge}
        </span>
      )}
      {alert && (
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
      )}
    </Link>
  );
};

export default function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(0);
  const [overdueMotorcycles, setOverdueMotorcycles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Fetch alert data when component mounts
  useEffect(() => {
    const fetchAlertData = async () => {
      setIsLoading(true);
      try {
        // Fetch maintenance data
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const data = await response.json();
          
          // Explicitly log the data to debug
          console.log("Dashboard data:", data);
          
          // Set the number of alerts - make sure we're using the correct property
          setMaintenanceAlerts(data.overdueCount || 0);
          
          // Filter motorcycles with overdue maintenance
          if (data.motorcycles && data.upcomingMaintenance) {
            const motorcyclesWithOverdue = data.motorcycles.filter((moto: any) => 
              data.upcomingMaintenance.some((task: any) => 
                task.motorcycleId === moto.id && task.isDue
              )
            ).slice(0, 3); // Limit to 3 motorcycles
            
            setOverdueMotorcycles(motorcyclesWithOverdue);
          }
        }
      } catch (error) {
        console.error("Failed to fetch alert data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAlertData();
  }, []);
  
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/signin");
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden bg-gradient-to-r from-blue-700 to-blue-600 text-white flex items-center justify-between p-4 shadow-md z-40 sticky top-0">
        <div className="flex items-center font-bold text-xl">
          <Bike className="mr-2" />
          Rideway
        </div>
        <div className="flex items-center">
          {maintenanceAlerts > 0 && (
            <button 
              onClick={() => router.push('/maintenance')} 
              className="mr-3 relative"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {maintenanceAlerts}
              </span>
            </button>
          )}
          <button 
            onClick={() => setShowMileageModal(true)} 
            className="mr-3"
            aria-label="Update Mileage"
          >
            <Gauge size={20} />
          </button>
          <button 
            onClick={() => setMobileOpen(!mobileOpen)} 
            aria-label="Toggle Menu" 
            className="p-2 rounded-full bg-blue-800/30 hover:bg-blue-800/50"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{ x: mobileOpen || typeof window !== "undefined" && window.innerWidth >= 768 ? 0 : -300 }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        className="bg-gray-900 text-white w-72 md:w-64 h-screen fixed md:sticky top-0 left-0 z-40 overflow-y-auto"
      >
        {/* Logo */}
        <div className="p-6 flex items-center">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg mr-3">
            <Bike size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Rideway</h1>
            <p className="text-xs text-gray-400">Motorcycle Management</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mx-5 mb-4">
          <button
            onClick={() => setShowMileageModal(true)}
            className="w-full flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-4 py-3 hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
          >
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-lg mr-3">
                <Gauge size={18} className="text-white" />
              </div>
              <div>
                <span className="font-small">Update Mileage</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-blue-300" />
          </button>
        </div>


        {/* Nav */}
        <div className="px-3">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Main Menu</div>
          <NavItem href="/" icon={<Home size={18} />} label="Dashboard" />
          <NavItem href="/garage" icon={<Bike size={18} />} label="My Garage" />
          <NavItem 
            href="/maintenance" 
            icon={<Wrench size={18} />} 
            label="Maintenance" 
            badge={maintenanceAlerts} 
          />
          <NavItem href="/history" icon={<History size={18} />} label="Service History" />
          <NavItem href="/statistics" icon={<BarChart3 size={18} />} label="Statistics" />
        </div>

        {/* Maintenance Alerts Section (if there are any) */}
        {maintenanceAlerts > 0 && !isLoading && (
          <div className="mx-5 my-4">
            <div className="px-2 py-1 text-xs font-semibold text-red-400 uppercase flex items-center">
              <AlertCircle size={14} className="mr-1" />
              Overdue Maintenance
            </div>
            <div className="mt-2 bg-red-900/30 rounded-lg p-2">
              {overdueMotorcycles.map((motorcycle) => (
                <Link 
                  key={motorcycle.id}
                  href={`/maintenance?motorcycle=${motorcycle.id}`}
                  className="flex items-center py-2 px-2 hover:bg-red-900/30 rounded-md transition-colors"
                >
                  <div className="w-7 h-7 bg-red-800/50 rounded-full flex items-center justify-center mr-2">
                    {motorcycle.imageUrl ? (
                      <Image 
                        src={motorcycle.imageUrl}
                        alt={motorcycle.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <Bike size={14} className="text-red-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{motorcycle.name}</p>
                    <p className="text-xs text-red-300">Maintenance needed</p>
                  </div>
                  <Calendar size={14} className="text-red-300" />
                </Link>
              ))}
              
              <Link 
                href="/maintenance" 
                className="mt-1 text-center block w-full text-xs text-red-300 hover:text-red-200 py-1"
              >
                View all overdue tasks
              </Link>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mx-6 my-4 border-t border-gray-700/50" />

        {/* User Menu */}
        <div className="px-3 pb-6 mt-auto">
          {session?.user ? (
            <>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt="User"
                      width={32}
                      height={32}
                      className="rounded-full mr-3 border-2 border-gray-700 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-medium">
                        {session.user.name?.[0] || session.user.email?.[0] || "U"}
                      </span>
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-medium">{session.user.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{session.user.email}</p>
                  </div>
                </div>
                <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1 ml-2 overflow-hidden"
                  >
                    <div className="space-y-1 pt-1 pl-2 border-l border-gray-700">
                      <Link href="/profile" className="flex items-center px-4 py-2 text-sm hover:bg-gray-800 rounded-lg text-gray-300">
                        <User size={16} className="mr-3 text-gray-400" /> Profile
                      </Link>
                      <Link href="/settings" className="flex items-center px-4 py-2 text-sm hover:bg-gray-800 rounded-lg text-gray-300">
                        <Settings size={16} className="mr-3 text-gray-400" /> Settings
                      </Link>
                      <button onClick={handleSignOut} className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg">
                        <LogOut size={16} className="mr-3" /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="flex items-center justify-center px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <LogOut size={16} className="mr-2" />
              Sign In
            </Link>
          )}
        </div>
      </motion.aside>

      {/* Mileage Update Modal */}
      {showMileageModal && (
        <MileageUpdateModal 
          onClose={() => setShowMileageModal(false)} 
        />
      )}
    </>
  );
}