import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BookOpen, Trash2, Plus } from "lucide-react";
import api from "../lib/api";

const MOODS = [
  { value: 1, emoji: "😔", label: "Rough", color: "bg-red-50 text-red-500 border-red-200" },
  { value: 2, emoji: "😕", label: "Low", color: "bg-orange-50 text-orange-500 border-orange-200" },
  { value: 3, emoji: "😐", label: "Okay", color: "bg-amber-50 text-amber-500 border-amber-200" },
  { value: 4, emoji: "🙂", label: "Good", color: "bg-lime-50 text-lime-600 border-lime-200" },
  { value: 5, emoji: "😄", label: "Great", color: "bg-emerald-50 text-emerald-500 border-emerald-200" },
];

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState(4);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get("/journal");
    setEntries(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post("/journal", { mood, content });
      setEntries((es) => [data, ...es]);
      setContent(""); setMood(4);
      toast.success("Entry saved");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    await api.delete(`/journal/${id}`);
    setEntries((es) => es.filter((e) => e.id !== id));
    toast.success("Entry deleted");
  };

  const moodOf = (v) => MOODS.find((m) => m.value === v) || MOODS[2];

  return (
    <div className="space-y-8" data-testid="journal-page">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400">Reflect & reset</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-1">Journal</h1>
      </div>

      <form onSubmit={save} className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
        <p className="text-sm font-medium text-slate-700 mb-3">How are you feeling today?</p>
        <div className="flex flex-wrap gap-2.5 mb-5">
          {MOODS.map((m) => (
            <button
              type="button" key={m.value} onClick={() => setMood(m.value)}
              data-testid={`mood-${m.value}`}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${mood === m.value ? m.color : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
            >
              <span className="text-base">{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
        <textarea
          data-testid="journal-content-input" value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind? Wins, lessons, gratitude…" rows={4}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-none"
        />
        <button data-testid="save-journal-btn" type="submit" disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60">
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add entry"}
        </button>
      </form>

      {loading ? (
        <div className="h-40 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500"><BookOpen strokeWidth={1.5} className="h-7 w-7" /></div>
          <h3 className="font-display mt-4 text-xl font-semibold text-slate-900">Your journal is empty</h3>
          <p className="mt-1 text-sm text-slate-500">Write your first reflection above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {entries.map((e) => {
              const m = moodOf(e.mood);
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="group rounded-3xl border border-slate-200/60 bg-white p-6 hover:shadow-md transition-all"
                  data-testid={`journal-entry-${e.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${m.color}`}>
                        <span className="text-lg">{m.emoji}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.label}</p>
                        <p className="text-xs text-slate-400">{e.date}</p>
                      </div>
                    </div>
                    <button onClick={() => remove(e.id)} data-testid={`delete-journal-${e.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{e.content}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
