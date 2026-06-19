import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import {
  Landmark, Dumbbell, Apple, MessagesSquare, Flame, Target, Trophy, Sparkles,
  ArrowUpRight, TrendingUp, Footprints, Zap, PiggyBank, Activity, Award, Star,
  MessageCircle, Crown,
} from "lucide-react";
import api from "../lib/api";

const iconMap = { Footprints, Zap, Trophy, Landmark, PiggyBank, Dumbbell, Activity, Apple, MessageCircle, Award, Star, Flame, Crown };

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const Ring = ({ value, color, size = 130 }) => (
  <div style={{ width: size, height: size }}>
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value }]} startAngle={90} endAngle={-270}>
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={20} fill={color} />
      </RadialBarChart>
    </ResponsiveContainer>
  </div>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard").then((r) => setD(r.data)).catch(() => {}); }, []);

  if (!d) return <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>;

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; })();
  const nut = d.nutrition;
  const macroPct = (v, g) => g ? Math.min(100, Math.round((v / g) * 100)) : 0;

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400">{greeting}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-1">
            {d.name?.split(" ")[0]} 👋
          </h1>
        </div>
        <Link to="/app/coach" data-testid="dashboard-coach-cta" className="inline-flex items-center gap-2 self-start rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
          <Sparkles className="h-4 w-4" /> Ask your coach
        </Link>
      </div>

      {/* Life Score hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="rounded-3xl border border-slate-200/60 bg-slate-900 text-white p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row items-center gap-8">
          <div className="relative flex items-center justify-center">
            <Ring value={d.life_score.overall} color="#fb923c" size={150} />
            <div className="absolute text-center">
              <p className="font-display text-4xl font-semibold">{d.life_score.overall}</p>
              <p className="text-xs text-slate-400">Life Score</p>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-slate-300">Level {d.level.level} · {d.level.xp} XP · {d.earned_count} badges</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(d.life_score.breakdown).map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs capitalize text-slate-400">{k}</span>
                    <span className="text-sm font-semibold">{v}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Module summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Finance */}
        <Link to="/app/finance" data-testid="dash-finance-card" className="group rounded-3xl border border-slate-200/60 bg-white p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500"><Landmark strokeWidth={1.75} className="h-5 w-5" /></div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
          </div>
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900">{money(d.finance.net_worth)}</p>
          <p className="text-sm text-slate-500">Net worth</p>
          <p className="mt-1 text-xs text-emerald-500 font-medium">{d.finance.savings_rate}% savings rate</p>
        </Link>
        {/* Fitness */}
        <Link to="/app/fitness" data-testid="dash-fitness-card" className="group rounded-3xl border border-slate-200/60 bg-white p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-500"><Dumbbell strokeWidth={1.75} className="h-5 w-5" /></div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
          </div>
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900">{d.fitness.weekly_workouts}<span className="text-base text-slate-400">/wk</span></p>
          <p className="text-sm text-slate-500">Workouts this week</p>
          <p className="mt-1 text-xs text-blue-500 font-medium">{d.fitness.current_weight ? `${d.fitness.current_weight} lb` : "Log your weight"}</p>
        </Link>
        {/* Nutrition */}
        <Link to="/app/nutrition" data-testid="dash-nutrition-card" className="group rounded-3xl border border-slate-200/60 bg-white p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-50 text-lime-600"><Apple strokeWidth={1.75} className="h-5 w-5" /></div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
          </div>
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900">{Math.round(nut.today.calories)}<span className="text-base text-slate-400">/{nut.goal.calories}</span></p>
          <p className="text-sm text-slate-500">Calories today</p>
          <p className="mt-1 text-xs text-lime-600 font-medium">{Math.round(nut.today.protein)}g protein</p>
        </Link>
        {/* Communication */}
        <Link to="/app/communication" data-testid="dash-comm-card" className="group rounded-3xl border border-slate-200/60 bg-white p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><MessagesSquare strokeWidth={1.75} className="h-5 w-5" /></div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
          </div>
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900">{d.communication.overall}</p>
          <p className="text-sm text-slate-500">Communication score</p>
          <p className="mt-1 text-xs text-violet-500 font-medium">{d.communication.level}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Finance trend */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2 rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Cash flow</h3>
            <span className="text-xs text-slate-400 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Income vs expense</span>
          </div>
          {d.finance.trend.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-400">Connect a bank or add transactions to see your cash flow.</p>
              <Link to="/app/finance" className="mt-3 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-all">Go to Finance</Link>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.finance.trend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fill="url(#gi)" />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#ge)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Macros today */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-slate-900 mb-5">Today's macros</h3>
          <div className="space-y-4">
            {[["Protein", nut.today.protein, nut.goal.protein, "#3b82f6"],
              ["Carbs", nut.today.carbs, nut.goal.carbs, "#f59e0b"],
              ["Fat", nut.today.fat, nut.goal.fat, "#ec4899"]].map(([label, v, g, c]) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5"><span className="text-slate-600">{label}</span><span className="font-medium text-slate-900">{Math.round(v)}/{g}g</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${macroPct(v, g)}%`, background: c }} /></div>
              </div>
            ))}
          </div>
          <Link to="/app/nutrition" className="mt-6 block text-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">Log a meal</Link>
        </motion.div>
      </div>

      {/* Weekly momentum + Habits/Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2 rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-slate-900 mb-6">Weekly momentum</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.weekly} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs><linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="100%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Area type="monotone" dataKey="completed" stroke="#f97316" strokeWidth={2.5} fill="url(#gw)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Flame className="h-4 w-4 text-orange-500" /> Habits</div>
            <p className="font-display text-2xl font-semibold text-slate-900 mt-1">{d.habits.completed_today}/{d.habits.total} <span className="text-sm font-normal text-slate-400">done today</span></p>
            <p className="text-xs text-orange-500 font-medium">{d.habits.best_streak} day best streak</p>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Target className="h-4 w-4 text-slate-700" /> Goals</div>
            <p className="font-display text-2xl font-semibold text-slate-900 mt-1">{d.goals.avg_progress}% <span className="text-sm font-normal text-slate-400">avg progress</span></p>
            <p className="text-xs text-slate-400">{d.goals.total} active goals</p>
          </div>
        </motion.div>
      </div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-semibold text-slate-900">Achievements</h3>
          <span className="text-sm text-slate-400">{d.earned_count}/{d.achievements.length} unlocked</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {d.achievements.map((a) => {
            const Icon = iconMap[a.icon] || Trophy;
            return (
              <div key={a.id} data-testid={`achievement-${a.id}`}
                className={`rounded-2xl border p-4 text-center transition-all ${a.earned ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-50"}`}>
                <div className={`mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl ${a.earned ? "bg-amber-50 text-amber-500" : "bg-slate-100 text-slate-300"}`}>
                  <Icon strokeWidth={1.75} className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-900">{a.title}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
