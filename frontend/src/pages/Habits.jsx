import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Flame, Check, Trash2, X, Dumbbell, BookOpen, Droplet, Moon, Brain, Heart, Repeat } from "lucide-react";
import api from "../lib/api";

const ICONS = { Repeat, Dumbbell, BookOpen, Droplet, Moon, Brain, Heart, Flame };
const ICON_LIST = ["Repeat", "Dumbbell", "BookOpen", "Droplet", "Moon", "Brain", "Heart", "Flame"];

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Repeat");

  const load = async () => {
    const { data } = await api.get("/habits");
    setHabits(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { data } = await api.post("/habits", { name, icon, color: "orange" });
    setHabits((h) => [...h, data]);
    setName(""); setIcon("Repeat"); setShowForm(false);
    toast.success("Habit created");
  };

  const toggle = async (id) => {
    const { data } = await api.post(`/habits/${id}/toggle`);
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, done_today: data.done_today, streak: data.streak } : h)));
  };

  const remove = async (id) => {
    await api.delete(`/habits/${id}`);
    setHabits((hs) => hs.filter((h) => h.id !== id));
    toast.success("Habit removed");
  };

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="space-y-8" data-testid="habits-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-orange-500">Daily discipline</p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 mt-1">Habits</h1>
        </div>
        <button data-testid="add-habit-btn" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
          <Plus className="h-4 w-4" /> New habit
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            onSubmit={create}
            className="rounded-3xl border border-slate-200/60 bg-white p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-slate-900">Create a habit</h3>
              <button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <input
              data-testid="habit-name-input" autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read 20 minutes"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {ICON_LIST.map((ic) => {
                const I = ICONS[ic];
                return (
                  <button type="button" key={ic} onClick={() => setIcon(ic)}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center border transition-all ${icon === ic ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                    <I strokeWidth={1.75} className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
            <button data-testid="save-habit-btn" type="submit" className="mt-5 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">Add habit</button>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-40 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>
      ) : habits.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500"><Flame strokeWidth={1.5} className="h-7 w-7" /></div>
          <h3 className="font-display mt-4 text-xl font-semibold text-slate-900">No habits yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first habit and start a streak today.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {habits.map((h, i) => {
            const Icon = ICONS[h.icon] || Repeat;
            const hist = new Set(h.history || []);
            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.04 }}
                className="group rounded-3xl border border-slate-200/60 bg-white p-6 hover:shadow-lg transition-all duration-300"
                data-testid={`habit-card-${h.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                      <Icon strokeWidth={1.75} className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-slate-900">{h.name}</p>
                      <p className="text-sm text-orange-500 font-medium flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5" /> {h.streak} day streak
                      </p>
                    </div>
                  </div>
                  <button onClick={() => remove(h.id)} data-testid={`delete-habit-${h.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 flex items-center gap-1.5">
                  {last7.map((d) => (
                    <div key={d} className={`h-7 flex-1 rounded-md ${hist.has(d) ? "bg-orange-400" : "bg-slate-100"}`} title={d} />
                  ))}
                </div>

                <button
                  data-testid={`toggle-habit-${h.id}`} onClick={() => toggle(h.id)}
                  className={`mt-5 w-full rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${h.done_today ? "bg-emerald-50 text-emerald-600" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                >
                  <Check className="h-4 w-4" /> {h.done_today ? "Completed today" : "Mark complete"}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
