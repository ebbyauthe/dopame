import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Target, Trash2, X, Check, Circle, CheckCircle2 } from "lucide-react";
import api from "../lib/api";

const CATEGORIES = ["Personal", "Health", "Career", "Finance", "Learning", "Relationships"];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [milestoneText, setMilestoneText] = useState("");
  const [milestones, setMilestones] = useState([]);

  const load = async () => {
    const { data } = await api.get("/goals");
    setGoals(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addMilestone = () => {
    if (!milestoneText.trim()) return;
    setMilestones((m) => [...m, { id: crypto.randomUUID(), title: milestoneText, done: false }]);
    setMilestoneText("");
  };

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { data } = await api.post("/goals", { title, description, category, milestones });
    setGoals((g) => [data, ...g]);
    setTitle(""); setDescription(""); setCategory("Personal"); setMilestones([]); setShowForm(false);
    toast.success("Goal created");
  };

  const toggleMilestone = async (goalId, msId) => {
    const { data } = await api.post(`/goals/${goalId}/milestone/${msId}/toggle`);
    setGoals((gs) => gs.map((g) => (g.id === goalId ? data : g)));
    if (data.completed) toast.success("Goal complete! 🎉");
  };

  const remove = async (id) => {
    await api.delete(`/goals/${id}`);
    setGoals((gs) => gs.filter((g) => g.id !== id));
    toast.success("Goal removed");
  };

  return (
    <div className="space-y-8" data-testid="goals-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400">Where you're headed</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-1">Goals</h1>
        </div>
        <button data-testid="add-goal-btn" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
          <Plus className="h-4 w-4" /> New goal
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            onSubmit={create} className="rounded-3xl border border-slate-200/60 bg-white p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-slate-900">Create a goal</h3>
              <button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <input data-testid="goal-title-input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title — e.g. Run a half marathon"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all" />
              <textarea data-testid="goal-desc-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why does this matter?" rows={2}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-none" />
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button type="button" key={c} onClick={() => setCategory(c)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${category === c ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{c}</button>
                ))}
              </div>
              <div>
                <div className="flex gap-2">
                  <input data-testid="milestone-input" value={milestoneText} onChange={(e) => setMilestoneText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMilestone(); } }}
                    placeholder="Add a milestone"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all" />
                  <button type="button" data-testid="add-milestone-btn" onClick={addMilestone} className="rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-all">Add</button>
                </div>
                {milestones.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <Circle className="h-3.5 w-3.5 text-slate-300" /> {m.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button data-testid="save-goal-btn" type="submit" className="mt-5 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">Create goal</button>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-40 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>
      ) : goals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-900"><Target strokeWidth={1.5} className="h-7 w-7" /></div>
          <h3 className="font-display mt-4 text-xl font-semibold text-slate-900">No goals yet</h3>
          <p className="mt-1 text-sm text-slate-500">Define a goal and break it into milestones.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {goals.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.04 }}
              className="group rounded-3xl border border-slate-200/60 bg-white p-6 hover:shadow-lg transition-all duration-300"
              data-testid={`goal-card-${g.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">{g.category}</span>
                  <h3 className="font-display mt-2 text-lg font-semibold text-slate-900">{g.title}</h3>
                  {g.description && <p className="mt-1 text-sm text-slate-500">{g.description}</p>}
                </div>
                <button onClick={() => remove(g.id)} data-testid={`delete-goal-${g.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium text-slate-900">{g.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${g.progress}%` }} transition={{ duration: 0.6 }}
                    className={`h-full rounded-full ${g.completed ? "bg-emerald-500" : "bg-slate-900"}`} />
                </div>
              </div>

              {g.milestones?.length > 0 && (
                <div className="mt-5 space-y-2">
                  {g.milestones.map((m) => (
                    <button
                      key={m.id} onClick={() => toggleMilestone(g.id, m.id)}
                      data-testid={`milestone-${m.id}`}
                      className="flex w-full items-center gap-2.5 text-left text-sm transition-colors"
                    >
                      {m.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
                      <span className={m.done ? "text-slate-400 line-through" : "text-slate-700"}>{m.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
