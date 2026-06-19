import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Send, Trash2, Loader2 } from "lucide-react";
import api from "../lib/api";

const SUGGESTIONS = [
  "How do I stay consistent this week?",
  "Help me plan my morning routine",
  "I missed my streak — what now?",
  "Motivate me to hit my goals",
];

export default function Coach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/coach/history").then((res) => { setMessages(res.data); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setSending(true);
    try {
      const { data } = await api.post("/coach/chat", { message: msg });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      toast.error("Coach is unavailable right now. Try again.");
      setMessages((m) => m.slice(0, -1));
      setInput(msg);
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    await api.delete("/coach/history");
    setMessages([]);
    toast.success("Conversation cleared");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]" data-testid="coach-page">
      <div className="flex items-center justify-between pb-5 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-900">Dopame Coach</h1>
            <p className="text-xs text-slate-400">Powered by Groq · llama-3.3-70b</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clear} data-testid="clear-chat-btn" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-all">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-5">
        {loaded && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg animate-float">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-display mt-6 text-2xl font-semibold text-slate-900">How can I help you grow?</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md">I know your habits and goals. Ask me anything about staying disciplined, building routines, or hitting your targets.</p>
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} data-testid="coach-suggestion"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 text-left hover:border-slate-300 hover:shadow-sm transition-all active:scale-[0.98]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            data-testid={`chat-msg-${m.role}`}
          >
            <div className={`max-w-[85%] sm:max-w-[70%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-slate-900 text-white rounded-br-lg" : "bg-white border border-slate-200/60 text-slate-700 rounded-bl-lg"}`}>
              {m.content}
            </div>
          </motion.div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-3xl rounded-bl-lg bg-white border border-slate-200/60 px-5 py-4">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="pt-4 border-t border-slate-200/60">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2 focus-within:ring-2 focus-within:ring-slate-900 transition-all">
          <input
            data-testid="coach-input" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach anything…"
            className="flex-1 bg-transparent px-3 text-sm outline-none"
          />
          <button data-testid="coach-send-btn" type="submit" disabled={sending || !input.trim()}
            className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-40">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
