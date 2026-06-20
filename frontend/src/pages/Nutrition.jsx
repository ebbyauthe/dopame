import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Apple, Plus, Camera, Trash2, Loader2, Target, X, Check } from "lucide-react";
import api from "../lib/api";

const Ring = ({ value, goal, label, color, unit }) => {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-sm font-semibold text-slate-900">{Math.round(value)}</span>
          <span className="text-[10px] text-slate-400">/{goal}{unit}</span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-slate-600">{label}</span>
    </div>
  );
};

export default function Nutrition() {
  const [summary, setSummary] = useState(null);
  const [log, setLog] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [food, setFood] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [goal, setGoal] = useState({ goal: "Maintain weight", calories: "", protein: "", carbs: "", fat: "" });

  const load = async () => {
    const [s, l] = await Promise.all([api.get("/nutrition/summary"), api.get("/nutrition/log")]);
    setSummary(s.data); setLog(l.data);
    setGoal({ ...s.data.goal });
  };
  useEffect(() => { load(); }, []);

  const addFood = async (e) => {
    e.preventDefault();
    await api.post("/nutrition/log", { name: food.name, calories: parseFloat(food.calories) || 0, protein: parseFloat(food.protein) || 0, carbs: parseFloat(food.carbs) || 0, fat: parseFloat(food.fat) || 0 });
    setFood({ name: "", calories: "", protein: "", carbs: "", fat: "" }); setShowAdd(false);
    toast.success("Meal logged"); load();
  };
  const delFood = async (id) => { await api.delete(`/nutrition/log/${id}`); load(); };

  const analyzePhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setAnalyzing(true); toast.loading("Analyzing meal…", { id: "n" });
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/nutrition/analyze-photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFood({ name: data.name, calories: String(Math.round(data.calories)), protein: String(Math.round(data.protein)), carbs: String(Math.round(data.carbs)), fat: String(Math.round(data.fat)) });
      setShowAdd(true);
      toast.success(`Detected: ${data.name} (${data.confidence} confidence)`, { id: "n" });
    } catch { toast.error("Could not analyze. Log manually.", { id: "n" }); }
    finally { setAnalyzing(false); }
  };

  const saveGoal = async (e) => {
    e.preventDefault();
    await api.post("/nutrition/goal", { goal: goal.goal, calories: parseFloat(goal.calories) || 2200, protein: parseFloat(goal.protein) || 150, carbs: parseFloat(goal.carbs) || 220, fat: parseFloat(goal.fat) || 70 });
    setShowGoal(false); toast.success("Goal updated"); load();
  };

  if (!summary) return <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>;
  const t = summary.today, g = summary.goal;

  return (
    <div className="space-y-8" data-testid="nutrition-page">
      <div className="flex items-center justify-between">
        <div><p className="text-xs tracking-[0.2em] uppercase font-bold text-lime-600">Fuel your body</p><h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 mt-1">Nutrition</h1></div>
        <button data-testid="goal-btn" onClick={() => setShowGoal(true)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"><Target className="h-4 w-4" /> Goals</button>
      </div>

      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div><h3 className="font-display text-lg font-semibold text-slate-900">Today</h3><p className="text-sm text-slate-400">Goal: {g.goal}</p></div>
          <span className="font-display text-2xl font-semibold text-slate-900">{Math.round(t.calories)}<span className="text-base text-slate-400">/{g.calories} kcal</span></span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Ring value={t.calories} goal={g.calories} label="Calories" color="#0f172a" unit="" />
          <Ring value={t.protein} goal={g.protein} label="Protein" color="#3b82f6" unit="g" />
          <Ring value={t.carbs} goal={g.carbs} label="Carbs" color="#f59e0b" unit="g" />
          <Ring value={t.fat} goal={g.fat} label="Fat" color="#ec4899" unit="g" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Snap a meal
          <input data-testid="meal-photo-input" type="file" accept="image/*" className="hidden" disabled={analyzing} onChange={analyzePhoto} />
        </label>
        <button data-testid="add-food-btn" onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"><Plus className="h-4 w-4" /> Add manually</button>
      </div>

      {showAdd && (
        <form onSubmit={addFood} className="rounded-3xl border border-slate-200/60 bg-white p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg font-semibold text-slate-900">Log food</h3><button type="button" onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
          <input data-testid="food-name" required value={food.name} onChange={(e) => setFood({ ...food, name: e.target.value })} placeholder="Food name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900 mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[["calories", "Calories"], ["protein", "Protein g"], ["carbs", "Carbs g"], ["fat", "Fat g"]].map(([k, ph]) => (
              <input key={k} data-testid={`food-${k}`} type="number" value={food[k]} onChange={(e) => setFood({ ...food, [k]: e.target.value })} placeholder={ph} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
            ))}
          </div>
          <button data-testid="save-food-btn" type="submit" className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95"><Check className="h-4 w-4" /> Log it</button>
        </form>
      )}

      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">Today's meals</h3>
        {log.filter((i) => i.date === summary.today_date || true).length === 0 ? <p className="text-sm text-slate-400 text-center py-6">No meals logged yet.</p> : (
          <div className="divide-y divide-slate-100">
            {log.map((i) => (
              <div key={i.id} data-testid={`food-${i.id}`} className="group flex items-center justify-between py-3">
                <div className="flex items-center gap-3"><span className="h-9 w-9 rounded-full bg-lime-50 text-lime-600 flex items-center justify-center"><Apple className="h-4 w-4" /></span>
                  <div><p className="text-sm font-medium text-slate-900">{i.name}</p><p className="text-xs text-slate-400">{Math.round(i.protein)}p · {Math.round(i.carbs)}c · {Math.round(i.fat)}f · {i.date}</p></div>
                </div>
                <div className="flex items-center gap-3"><span className="text-sm font-semibold text-slate-900">{Math.round(i.calories)} kcal</span>
                  <button onClick={() => delFood(i.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowGoal(false)} />
          <motion.form initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onSubmit={saveGoal} className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg font-semibold text-slate-900">Nutrition goals</h3><button type="button" onClick={() => setShowGoal(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            <select value={goal.goal} onChange={(e) => setGoal({ ...goal, goal: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none mb-3">
              {["Gain muscle", "Lose fat", "Maintain weight", "Reach protein target"].map((o) => <option key={o}>{o}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {[["calories", "Calories"], ["protein", "Protein g"], ["carbs", "Carbs g"], ["fat", "Fat g"]].map(([k, ph]) => (
                <input key={k} data-testid={`goal-${k}`} type="number" value={goal[k]} onChange={(e) => setGoal({ ...goal, [k]: e.target.value })} placeholder={ph} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
              ))}
            </div>
            <button data-testid="save-goal-btn" type="submit" className="mt-4 w-full rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">Save goals</button>
          </motion.form>
        </div>
      )}
    </div>
  );
}
