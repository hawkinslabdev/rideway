"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
  Bike, Home, Wrench, History, BarChart3, Settings,
  User, LogOut, Menu, X, ChevronDown
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const NavItem = ({ href, icon, label, badge = 0 }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
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
  const maintenanceAlerts = 2;

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
        <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle Menu" className="p-2 rounded-full bg-blue-800/30 hover:bg-blue-800/50">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
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

        {/* Nav */}
        <div className="px-3">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Main Menu</div>
          <NavItem href="/" icon={<Home size={18} />} label="Dashboard" />
          <NavItem href="/garage" icon={<Bike size={18} />} label="My Garage" />
          <NavItem href="/maintenance" icon={<Wrench size={18} />} label="Maintenance" badge={maintenanceAlerts} />
          <NavItem href="/history" icon={<History size={18} />} label="Service History" />
          <NavItem href="/statistics" icon={<BarChart3 size={18} />} label="Statistics" />
        </div>

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
    </>
  );
}
