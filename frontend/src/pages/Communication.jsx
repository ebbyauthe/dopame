import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MessagesSquare, Send, Loader2, ArrowLeft, Sparkles, Lightbulb, CheckCircle2,
  Briefcase, Building2, Users, Handshake, Shield, Headset, Crown, Coffee, TrendingUp,
} from "lucide-react";
import api from "../lib/api";

const ICONS = { Briefcase, Building2, Users, Handshake, Shield, Headset, Crown, Coffee };
const SCORE_LABELS = ["grammar", "vocabulary", "clarity", "confidence", "professionalism", "tone"];

const ScoreBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-xs mb-1"><span className="capitalize text-slate-500">{label}</span><span className="font-medium text-slate-900">{value}</span></div>
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${value}%` }} /></div>
  </div>
);

export default function Communication() {
  const [modes, setModes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const endRef = useRef(null);

  const loadMeta = async () => {
    const [m, p] = await Promise.all([api.get("/comm/modes"), api.get("/comm/progress")]);
    setModes(m.data); setProgress(p.data);
  };
  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const start = async (mode) => {
    setStarting(true);
    try { const { data } = await api.post("/comm/session", { mode }); setSession(data); setMessages(data.messages); }
    catch { toast.error("Could not start session"); } finally { setStarting(false); }
  };

  const send = async () => {
    const msg = input.trim(); if (!msg || sending) return;
    setInput(""); setMessages((m) => [...m, { role: "user", content: msg }]); setSending(true);
    try {
      const { data } = await api.post(`/comm/session/${session.id}/reply`, { message: msg });
      setMessages((m) => { const copy = [...m]; copy[copy.length - 1] = data.evaluation; return [...copy, { role: "assistant", content: data.reply }]; });
    } catch { toast.error("Evaluation failed"); setMessages((m) => m.slice(0, -1)); setInput(msg); }
    finally { setSending(false); }
  };

  const exit = () => { setSession(null); setMessages([]); loadMeta(); };

  if (!progress) return <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>;

  // Conversation view
  if (session) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]" data-testid="comm-session">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200/60">
          <button onClick={exit} data-testid="comm-back-btn" className="rounded-full p-2 hover:bg-slate-100 transition-all"><ArrowLeft className="h-5 w-5 text-slate-600" /></button>
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center"><MessagesSquare className="h-5 w-5 text-white" /></div>
          <div><h1 className="font-display text-lg font-semibold text-slate-900">{session.mode_name}</h1><p className="text-xs text-slate-400">Conversation simulator</p></div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i}>
              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-3xl px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-slate-900 text-white rounded-br-lg" : "bg-white border border-slate-200/60 text-slate-700 rounded-bl-lg"}`}>{m.content}</div>
              </div>
              {m.role === "user" && m.scores && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 ml-auto max-w-[85%] sm:max-w-[70%] rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3">{SCORE_LABELS.map((k) => <ScoreBar key={k} label={k} value={m.scores[k]} />)}</div>
                  {m.feedback && <p className="text-xs text-slate-600 mb-2"><span className="font-semibold text-violet-600">Feedback:</span> {m.feedback}</p>}
                  {m.correction && <p className="text-xs text-slate-600 mb-2 flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span><span className="font-semibold text-emerald-600">Better:</span> {m.correction}</span></p>}
                  {m.tip && <p className="text-xs text-slate-600 flex gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" /><span>{m.tip}</span></p>}
                </motion.div>
              )}
            </div>
          ))}
          {sending && <div className="flex justify-start"><div className="rounded-3xl rounded-bl-lg bg-white border border-slate-200/60 px-5 py-4"><div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" /><span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} /><span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} /></div></div></div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="pt-4 border-t border-slate-200/60">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2 focus-within:ring-2 focus-within:ring-slate-900 transition-all">
            <input data-testid="comm-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your response…" className="flex-1 bg-transparent px-3 text-sm outline-none" />
            <button data-testid="comm-send-btn" type="submit" disabled={sending || !input.trim()} className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
        </form>
      </div>
    );
  }

  // Hub view
  return (
    <div className="space-y-8" data-testid="communication-page">
      <div><p className="text-xs tracking-[0.2em] uppercase font-bold text-violet-500">Speak with confidence</p><h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 mt-1">Communication</h1></div>

      <div className="rounded-3xl border border-slate-200/60 bg-slate-900 text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-center gap-8">
          <div className="text-center">
            <p className="font-display text-5xl font-semibold">{progress.overall}</p>
            <p className="text-sm text-slate-400 mt-1">{progress.level}</p>
            <p className="text-xs text-violet-300 mt-1 flex items-center gap-1 justify-center"><TrendingUp className="h-3 w-3" /> {progress.streak} day streak</p>
          </div>
          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3">
            {SCORE_LABELS.map((k) => (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1"><span className="capitalize text-slate-400">{k}</span><span className="font-medium">{progress.scores[k]}</span></div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-300" style={{ width: `${progress.scores[k]}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">Start a practice scenario</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modes.map((m, i) => {
            const Icon = ICONS[m.icon] || MessagesSquare;
            return (
              <motion.button key={m.id} data-testid={`mode-${m.id}`} onClick={() => start(m.id)} disabled={starting}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="group text-left rounded-3xl border border-slate-200/60 bg-white p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 disabled:opacity-60">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><Icon strokeWidth={1.75} className="h-5 w-5" /></div>
                <h4 className="font-display mt-4 font-semibold text-slate-900">{m.name}</h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{m.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"><Sparkles className="h-3 w-3" /> Start</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
