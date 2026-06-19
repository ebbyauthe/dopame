import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
} from "recharts";
import {
  Flame, CheckCircle2, Target, BookOpen, Trophy, ArrowUpRight,
  Footprints, Zap, Compass, Award, Sun, Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";

const iconMap = { Footprints, Flame, Zap, Trophy, Compass, Award, BookOpen, Sun, Sparkles };

const StatCard = ({ label, value, sub, icon: Icon, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}
    className="rounded-3xl border border-slate-200/60 bg-white p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
  >
    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${accent}`}>
      <Icon strokeWidth={1.75} className="h-5 w-5" />
    </div>
    <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900" data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
    {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
  </motion.div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((res) => setData(res.data)).catch(() => {});
  }, []);

  if (!data) {
    return <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>;
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const moodData = data.mood_trend.map((m) => ({ ...m, label: m.date.slice(5) }));

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400">{greeting}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-1">
            {data.name?.split(" ")[0]} 👋
          </h1>
        </div>
        <Link to="/app/coach" data-testid="dashboard-coach-cta" className="inline-flex items-center gap-2 self-start rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
          <Sparkles className="h-4 w-4" /> Ask your coach
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Best streak" value={`${data.best_streak}d`} sub="Keep it burning" icon={Flame} accent="text-orange-500 bg-orange-50" delay={0} />
        <StatCard label="Done today" value={`${data.completed_today}/${data.total_habits}`} sub="Habits completed" icon={CheckCircle2} accent="text-emerald-500 bg-emerald-50" delay={0.05} />
        <StatCard label="Goal progress" value={`${data.avg_goal_progress}%`} sub={`${data.total_goals} active goals`} icon={Target} accent="text-slate-900 bg-slate-100" delay={0.1} />
        <StatCard label="Achievements" value={data.earned_count} sub="Badges earned" icon={Trophy} accent="text-blue-500 bg-blue-50" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2 rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Weekly momentum</h3>
            <span className="text-xs text-slate-400 flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> Habit completions</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weekly} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Area type="monotone" dataKey="completed" stroke="#f97316" strokeWidth={2.5} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8 flex flex-col items-center justify-center"
        >
          <h3 className="font-display text-lg font-semibold text-slate-900 self-start mb-2">Goal completion</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: data.avg_goal_progress, fill: "#0f172a" }]} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="font-display text-3xl font-semibold text-slate-900 -mt-28">{data.avg_goal_progress}%</p>
          <p className="text-sm text-slate-400 mt-20">Average across goals</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-semibold text-slate-900">Achievements</h3>
          <span className="text-sm text-slate-400">{data.earned_count}/{data.achievements.length} unlocked</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data.achievements.map((a) => {
            const Icon = iconMap[a.icon] || Trophy;
            return (
              <div
                key={a.id}
                data-testid={`achievement-${a.id}`}
                className={`rounded-2xl border p-4 text-center transition-all ${a.earned ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-50"}`}
              >
                <div className={`mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl ${a.earned ? "bg-amber-50 text-amber-500" : "bg-slate-100 text-slate-300"}`}>
                  <Icon strokeWidth={1.75} className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
