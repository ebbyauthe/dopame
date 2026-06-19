import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Dumbbell, Plus, X, Trash2, Sparkles, Scale, Activity, Trophy, Camera, Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import api, { getToken } from "../lib/api";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function Fitness() {
  const [summary, setSummary] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [weights, setWeights] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [showW, setShowW] = useState(false);
  const [weight, setWeight] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [w, setW] = useState({ name: "", type: "Strength", duration_min: "", exercises: [{ name: "", sets: [{ reps: "", weight: "" }] }] });

  const load = async () => {
    const [s, wk, wt, ph] = await Promise.all([
      api.get("/fitness/summary"), api.get("/fitness/workouts"), api.get("/fitness/weight"), api.get("/fitness/photos"),
    ]);
    setSummary(s.data); setWorkouts(wk.data); setWeights(wt.data); setPhotos(ph.data);
  };
  useEffect(() => { load(); }, []);

  const addWeight = async (e) => { e.preventDefault(); await api.post("/fitness/weight", { weight: parseFloat(weight) }); setWeight(""); toast.success("Weight logged"); load(); };

  const updEx = (i, field, val) => { const ex = [...w.exercises]; ex[i][field] = val; setW({ ...w, exercises: ex }); };
  const updSet = (ei, si, field, val) => { const ex = [...w.exercises]; ex[ei].sets[si][field] = val; setW({ ...w, exercises: ex }); };
  const addSet = (ei) => { const ex = [...w.exercises]; ex[ei].sets.push({ reps: "", weight: "" }); setW({ ...w, exercises: ex }); };
  const addEx = () => setW({ ...w, exercises: [...w.exercises, { name: "", sets: [{ reps: "", weight: "" }] }] });

  const saveWorkout = async (e) => {
    e.preventDefault();
    const exercises = w.exercises.filter((x) => x.name).map((x) => ({ name: x.name, sets: x.sets.map((s) => ({ reps: parseInt(s.reps) || 0, weight: parseFloat(s.weight) || 0 })) }));
    await api.post("/fitness/workouts", { name: w.name, type: w.type, duration_min: parseInt(w.duration_min) || 0, exercises });
    setW({ name: "", type: "Strength", duration_min: "", exercises: [{ name: "", sets: [{ reps: "", weight: "" }] }] }); setShowW(false);
    toast.success("Workout logged"); load();
  };
  const delWorkout = async (id) => { await api.delete(`/fitness/workouts/${id}`); load(); };

  const analyze = async () => {
    setAnalyzing(true);
    try { const { data } = await api.post("/fitness/analyze"); setAnalysis(data.analysis); }
    catch (e) { toast.error(e.response?.data?.detail || "Need more workouts"); }
    finally { setAnalyzing(false); }
  };

  const uploadPhoto = async (e, angle) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true); toast.loading("Analyzing photo…", { id: "ph" });
    const fd = new FormData(); fd.append("file", file);
    try { await api.post(`/fitness/photos?angle=${angle}`, fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("Photo analyzed!", { id: "ph" }); load(); }
    catch { toast.error("Upload failed", { id: "ph" }); }
    finally { setUploading(false); }
  };
  const delPhoto = async (id) => { await api.delete(`/fitness/photos/${id}`); load(); };

  if (!summary) return <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>;

  return (
    <div className="space-y-8" data-testid="fitness-page">
      <div className="flex items-center justify-between">
        <div><p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400">Train hard</p><h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-1">Fitness</h1></div>
        <button data-testid="add-workout-btn" onClick={() => setShowW(true)} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95"><Plus className="h-4 w-4" /> Log workout</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[["Current weight", summary.current_weight ? `${summary.current_weight} lb` : "—", Scale, "text-blue-500 bg-blue-50"],
          ["This week", `${summary.weekly_workouts}`, Dumbbell, "text-slate-900 bg-slate-100"],
          ["Week volume", `${summary.week_volume.toLocaleString()}`, Activity, "text-orange-500 bg-orange-50"],
          ["Total workouts", `${summary.total_workouts}`, Trophy, "text-emerald-500 bg-emerald-50"]].map(([l, v, Icon, a], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-slate-200/60 bg-white p-6">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${a}`}><Icon strokeWidth={1.75} className="h-5 w-5" /></div>
            <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900">{v}</p><p className="text-sm text-slate-500">{l}</p>
          </motion.div>
        ))}
      </div>

      {showW && (
        <form onSubmit={saveWorkout} className="rounded-3xl border border-slate-200/60 bg-white p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg font-semibold text-slate-900">Log workout</h3><button type="button" onClick={() => setShowW(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <input data-testid="workout-name" required value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} placeholder="Workout name (Push day)" className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
            <input type="number" value={w.duration_min} onChange={(e) => setW({ ...w, duration_min: e.target.value })} placeholder="Minutes" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          {w.exercises.map((ex, ei) => (
            <div key={ei} className="mb-3 rounded-2xl bg-slate-50 p-3">
              <input value={ex.name} onChange={(e) => updEx(ei, "name", e.target.value)} placeholder={`Exercise ${ei + 1} (Bench press)`} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none mb-2 focus:ring-2 focus:ring-slate-900" />
              {ex.sets.map((s, si) => (
                <div key={si} className="flex gap-2 mb-1.5">
                  <input type="number" value={s.reps} onChange={(e) => updSet(ei, si, "reps", e.target.value)} placeholder="Reps" className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
                  <input type="number" value={s.weight} onChange={(e) => updSet(ei, si, "weight", e.target.value)} placeholder="Weight (lb)" className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
                </div>
              ))}
              <button type="button" onClick={() => addSet(ei)} className="text-xs font-medium text-slate-500 hover:text-slate-900">+ Add set</button>
            </div>
          ))}
          <button type="button" onClick={addEx} className="text-sm font-medium text-slate-500 hover:text-slate-900">+ Add exercise</button>
          <div className="mt-4"><button data-testid="save-workout-btn" type="submit" className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">Save workout</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-semibold text-slate-900">Weight trend</h3>
            <form onSubmit={addWeight} className="flex gap-2">
              <input data-testid="weight-input" required type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="lb" className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
              <button data-testid="save-weight-btn" type="submit" className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">Log</button>
            </form>
          </div>
          {weights.length === 0 ? <p className="text-sm text-slate-400 py-10 text-center">Log your weight to track progress.</p> : (
            <div className="h-52"><ResponsiveContainer width="100%" height="100%">
              <LineChart data={weights} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer></div>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">Personal records</h3>
          {summary.prs.length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">PRs appear as you log lifts.</p> : (
            <div className="space-y-2.5">{summary.prs.map((p) => (
              <div key={p.exercise} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2.5">
                <span className="text-sm font-medium text-slate-700">{p.exercise}</span><span className="text-sm font-semibold text-slate-900">{p.weight} lb</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>

      {/* AI analysis */}
      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-500" /> AI workout analysis</h3>
          <button data-testid="analyze-btn" onClick={analyze} disabled={analyzing} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analyze</button>
        </div>
        {analysis ? <div className="prose prose-sm prose-slate max-w-none text-slate-600"><ReactMarkdown>{analysis}</ReactMarkdown></div> : <p className="text-sm text-slate-400">Get AI insights on your training consistency, plateaus and what to do next.</p>}
      </div>

      {/* Progress photos */}
      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h3 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2"><Camera className="h-5 w-5 text-slate-700" /> Progress photos</h3>
          <div className="flex gap-2">
            {["front", "side", "back"].map((ang) => (
              <label key={ang} className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all capitalize">
                <Plus className="h-3.5 w-3.5" /> {ang}
                <input data-testid={`upload-${ang}`} type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => uploadPhoto(e, ang)} />
              </label>
            ))}
          </div>
        </div>
        {photos.length === 0 ? <p className="text-sm text-slate-400">Upload front, side and back photos. AI estimates body composition trends (visual estimate only).</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((p) => (
              <div key={p.id} data-testid={`photo-${p.id}`} className="group rounded-2xl border border-slate-200/60 overflow-hidden">
                <div className="relative aspect-[3/4] bg-slate-100">
                  <img src={`${BACKEND}/api/fitness/file?path=${encodeURIComponent(p.storage_path)}&auth=${getToken()}`} alt={p.angle} className="h-full w-full object-cover" />
                  <span className="absolute top-2 left-2 rounded-full bg-slate-900/70 px-2.5 py-0.5 text-xs text-white capitalize">{p.angle}</span>
                  <button onClick={() => delPhoto(p.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-full bg-white/90 p-1.5 text-slate-500 hover:text-red-500 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {p.analysis?.bodyfat_estimate && <span className="rounded-full bg-blue-50 text-blue-600 px-2.5 py-0.5 text-xs font-medium">BF {p.analysis.bodyfat_estimate}</span>}
                    {p.analysis?.muscle_development && <span className="rounded-full bg-emerald-50 text-emerald-600 px-2.5 py-0.5 text-xs font-medium">{p.analysis.muscle_development}</span>}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{p.analysis?.observations}</p>
                  <p className="text-[10px] text-slate-300 mt-2">{p.analysis?.disclaimer}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
