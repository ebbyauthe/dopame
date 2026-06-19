import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Repeat,
  Target,
  BookOpen,
  Sparkles,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, id: "dashboard" },
  { to: "/app/habits", label: "Habits", icon: Repeat, id: "habits" },
  { to: "/app/goals", label: "Goals", icon: Target, id: "goals" },
  { to: "/app/journal", label: "Journal", icon: BookOpen, id: "journal" },
  { to: "/app/coach", label: "AI Coach", icon: Sparkles, id: "coach" },
  { to: "/app/profile", label: "Profile", icon: User, id: "profile" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="px-2 mb-8">
        <Logo size={26} />
      </div>
      <nav className="flex-1 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            data-testid={`nav-${item.id}`}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <item.icon strokeWidth={1.75} className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200/70 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-semibold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all active:scale-[0.98]"
        >
          <LogOut strokeWidth={1.75} className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-slate-200/70 bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 glass border-b border-slate-200/60 flex items-center justify-between px-4 h-16">
        <Logo size={24} />
        <button data-testid="mobile-menu-btn" onClick={() => setOpen(true)} className="p-2">
          <Menu className="h-6 w-6 text-slate-700" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            className="relative w-64 bg-white h-full shadow-xl"
          >
            <button onClick={() => setOpen(false)} className="absolute top-5 right-4 p-1">
              <X className="h-5 w-5 text-slate-500" />
            </button>
            <SidebarContent />
          </motion.div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
