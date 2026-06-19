import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Landmark, Dumbbell, Apple, MessagesSquare,
  Repeat, Target, BookOpen, Sparkles, FileBarChart, User, LogOut, Menu, X,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

const sections = [
  { label: "Overview", items: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, id: "dashboard" },
  ]},
  { label: "Money", items: [
    { to: "/app/finance", label: "Finance", icon: Landmark, id: "finance" },
  ]},
  { label: "Body", items: [
    { to: "/app/fitness", label: "Fitness", icon: Dumbbell, id: "fitness" },
    { to: "/app/nutrition", label: "Nutrition", icon: Apple, id: "nutrition" },
  ]},
  { label: "Mind", items: [
    { to: "/app/communication", label: "Communication", icon: MessagesSquare, id: "communication" },
    { to: "/app/coach", label: "AI Coach", icon: Sparkles, id: "coach" },
  ]},
  { label: "Growth", items: [
    { to: "/app/habits", label: "Habits", icon: Repeat, id: "habits" },
    { to: "/app/goals", label: "Goals", icon: Target, id: "goals" },
    { to: "/app/journal", label: "Journal", icon: BookOpen, id: "journal" },
    { to: "/app/reports", label: "Reports", icon: FileBarChart, id: "reports" },
  ]},
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const SidebarContent = () => (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="px-2 mb-6"><Logo size={26} /></div>

      {user?.level && (
        <div className="mx-2 mb-5 rounded-2xl bg-slate-900 p-3.5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Level {user.level}</span>
            <span className="text-xs font-semibold text-orange-400">{user.xp} XP</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300"
              style={{ width: `${Math.min(100, Math.round((user.xp_into_level / (user.xp_for_next || 1)) * 100))}%` }} />
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto -mx-1 px-1">
        {sections.map((sec) => (
          <div key={sec.label}>
            <p className="px-3 mb-1 text-[10px] tracking-[0.18em] uppercase font-bold text-slate-300">{sec.label}</p>
            <div className="space-y-0.5">
              {sec.items.map((item) => (
                <NavLink key={item.id} to={item.to} end={item.end} data-testid={`nav-${item.id}`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-[0.98] ${
                      isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
                  <item.icon strokeWidth={1.75} className="h-[18px] w-[18px]" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200/70 pt-4 mt-4">
        <NavLink to="/app/profile" data-testid="nav-profile" onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-2 mb-2 rounded-xl py-1.5 hover:bg-slate-100 transition-all">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-semibold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </NavLink>
        <button onClick={handleLogout} data-testid="logout-btn"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all active:scale-[0.98]">
          <LogOut strokeWidth={1.75} className="h-[18px] w-[18px]" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-slate-200/70 bg-white">
        <SidebarContent />
      </aside>

      <header className="lg:hidden sticky top-0 z-40 glass border-b border-slate-200/60 flex items-center justify-between px-4 h-16">
        <Logo size={24} />
        <button data-testid="mobile-menu-btn" onClick={() => setOpen(true)} className="p-2"><Menu className="h-6 w-6 text-slate-700" /></button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div initial={{ x: -300 }} animate={{ x: 0 }} className="relative w-64 bg-white h-full shadow-xl overflow-y-auto">
            <button onClick={() => setOpen(false)} className="absolute top-5 right-4 p-1 z-10"><X className="h-5 w-5 text-slate-500" /></button>
            <SidebarContent />
          </motion.div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8"><Outlet /></div>
      </main>
    </div>
  );
}
