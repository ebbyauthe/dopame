import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Save } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/auth/profile", { name, bio });
      setUser((u) => ({ ...u, name: data.name, bio: data.bio }));
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save profile");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-8" data-testid="profile-page">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400">Your identity</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-1">Profile</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-2xl font-semibold font-display">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-400 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {user?.email}</p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700">Display name</label>
            <input data-testid="profile-name-input" value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Bio</label>
            <textarea data-testid="profile-bio-input" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="A line about your mission…"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-none" />
          </div>
          <button data-testid="profile-save-btn" type="submit" disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
