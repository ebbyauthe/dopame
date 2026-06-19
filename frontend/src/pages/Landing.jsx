import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Flame, Sparkles, Landmark, Dumbbell, LayoutGrid,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { HOME } from "../constants/testIds/home";

const REPLIES = {
  "How do I stay consistent this week?":
    "Start smaller than feels impressive. Pick one keystone habit, anchor it to something you already do every morning, and check it off here. I'll guard the streak and nudge you the moment momentum dips.",
  "I missed my streak — what now?":
    "A missed day isn't a broken streak — it's data. Restart today and halve the target so it's almost impossible to fail. We rebuild the chain link by link. Consistency beats intensity.",
  "Motivate me to hit my goals":
    "You're 78% across your active goals — that's not luck, it's accumulated effort. Close the nearest milestone today and let the dopamine carry the next one. Want me to pick the highest-leverage one?",
};

const COACH_QUESTIONS = Object.keys(REPLIES);

function LifeRing({ score = 82, size = 150, strokeWidth = 10 }) {
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - score / 100);
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f6" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fb923c" strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={C.toFixed(1)} strokeDashoffset={offset.toFixed(1)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-semibold text-4xl leading-none">{score}</span>
        <span className="text-xs text-slate-400 tracking-widest mt-1">LIFE SCORE</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);

  function ask(q) {
    if (busy) return;
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setBusy(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "ai", text: REPLIES[q] }]);
      setBusy(false);
    }, 850);
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">

      {/* Nav */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200/60">
        <div className="mx-auto max-w-5xl px-8 h-[68px] flex items-center justify-between">
          <Logo size={26} />
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid={HOME.signIn} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link to="/register" data-testid={HOME.getStarted} className="rounded-full bg-slate-900 px-[18px] py-2 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[880px] px-8 pt-24 pb-20 text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-xs tracking-[0.22em] uppercase font-semibold text-slate-400 mb-7"
        >
          A calm system for an intentional life
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.06 }}
          className="font-display font-medium text-5xl sm:text-6xl lg:text-7xl leading-[1.04] tracking-[-0.04em] text-slate-900"
        >
          Everything you're working on,<br className="hidden sm:block" /> quietly in one place.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-7 text-lg sm:text-xl leading-relaxed text-slate-500 max-w-[560px] mx-auto"
        >
          Dopame holds your habits, goals, fitness, nutrition, finances, journal and an AI coach — without the noise. Open it, and know exactly where you stand.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-9 flex justify-center"
        >
          <Link to="/register" data-testid={HOME.heroCta} className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
            Begin free <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Product mockup */}
      <div className="mx-auto max-w-[1120px] px-6 relative">
        <div className="absolute left-1/2 top-10 -translate-x-1/2 w-3/4 h-4/5 rounded-full bg-indigo-500/10 blur-[50px] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="relative bg-white border border-slate-200/90 rounded-[22px] overflow-hidden shadow-[0_2px_6px_rgba(15,23,42,0.04),0_40px_80px_-32px_rgba(15,23,42,0.28)]"
        >
          {/* window bar */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-[#fdfdfe]">
            <span className="w-3 h-3 rounded-full bg-rose-300" />
            <span className="w-3 h-3 rounded-full bg-amber-300" />
            <span className="w-3 h-3 rounded-full bg-green-300" />
            <div className="mx-auto text-xs text-slate-400 bg-slate-100 px-4 py-1 rounded-lg">dopame.app</div>
          </div>
          {/* app shell */}
          <div className="flex min-h-[380px]">
            {/* sidebar */}
            <div className="w-44 flex-none border-r border-slate-100 p-4 bg-[#fcfdfe] hidden sm:block">
              <div className="flex items-center gap-2 px-1.5 pb-4">
                <Logo size={22} />
              </div>
              <div className="bg-slate-900 rounded-xl p-3 text-white mb-3.5">
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-slate-300">Level 12</span>
                  <span className="font-semibold text-orange-400">3,120 XP</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-orange-400 to-amber-300" />
                </div>
              </div>
              {[
                { icon: LayoutGrid, label: "Dashboard", active: true },
                { icon: Landmark, label: "Finance" },
                { icon: Dumbbell, label: "Fitness" },
                { icon: Flame, label: "Habits" },
                { icon: Sparkles, label: "AI Coach" },
              ].map(({ icon: Icon, label, active }) => (
                <div key={label} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12.5px] font-medium mb-0.5 ${active ? "bg-slate-900 text-white" : "text-slate-500"}`}>
                  <Icon strokeWidth={1.75} className="h-3.5 w-3.5 flex-none" />
                  {label}
                </div>
              ))}
            </div>
            {/* main */}
            <div className="flex-1 min-w-0 p-5 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10.5px] tracking-[0.18em] uppercase font-bold text-slate-400">Good morning</p>
                  <p className="font-display font-semibold text-lg mt-0.5">Alex 👋</p>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-[11.5px] font-medium px-3 py-1.5 rounded-full">
                  <Sparkles className="h-3 w-3" /> Ask coach
                </div>
              </div>
              {/* life score */}
              <div className="bg-slate-900 rounded-[18px] p-4 text-white relative overflow-hidden flex items-center gap-4 mb-3.5">
                <div className="absolute -top-8 -right-5 w-32 h-32 rounded-full bg-orange-500/20 blur-[40px]" />
                <div className="relative w-[84px] h-[84px] flex-none">
                  <svg width="84" height="84" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#fb923c" strokeWidth="12" strokeLinecap="round" strokeDasharray="314.2" strokeDashoffset="56.6" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display font-semibold text-2xl leading-none">82</span>
                    <span className="text-[8.5px] text-slate-400 mt-0.5">LIFE SCORE</span>
                  </div>
                </div>
                <div className="relative flex-1 min-w-0 flex flex-col gap-2">
                  {[["Body", "88%"], ["Mind", "76%"], ["Money", "81%"]].map(([label, pct]) => (
                    <div key={label}>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>{label}</span><span>{pct}</span></div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ width: pct }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* stat cards */}
              <div className="grid grid-cols-3 gap-2.5 mb-3.5">
                {[
                  { icon: Landmark, cls: "text-emerald-600 bg-emerald-50", label: "Net worth", value: "$48.2k" },
                  { icon: Dumbbell, cls: "text-blue-500 bg-blue-50", label: "Workouts", value: "5/wk" },
                  { icon: Flame, cls: "text-orange-500 bg-orange-50", label: "Day streak", value: "47" },
                ].map(({ icon: Icon, cls, label, value }) => (
                  <div key={label} className="bg-white border border-slate-100 rounded-[14px] p-3">
                    <div className={`w-7 h-7 rounded-[9px] flex items-center justify-center ${cls}`}>
                      <Icon strokeWidth={1.75} className="h-3.5 w-3.5" />
                    </div>
                    <p className="font-display font-semibold text-[17px] mt-2 leading-none">{value}</p>
                    <p className="text-[10.5px] text-slate-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {/* chart */}
              <div className="bg-white border border-slate-100 rounded-[14px] p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-display font-semibold text-[13px]">Weekly momentum</span>
                  <span className="text-[10.5px] text-emerald-500 font-medium">+18%</span>
                </div>
                <svg viewBox="0 0 320 70" preserveAspectRatio="none" className="w-full h-14 block">
                  <defs>
                    <linearGradient id="chartgrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 52 L46 44 L92 48 L137 30 L183 34 L229 18 L274 22 L320 8 L320 70 L0 70 Z" fill="url(#chartgrad)" />
                  <path d="M0 52 L46 44 L92 48 L137 30 L183 34 L229 18 L274 22 L320 8" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Alternating feature rows */}
      <div className="mx-auto max-w-[1080px] px-8 flex flex-col gap-24 mt-24 mb-24">

        {/* Body */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="flex flex-wrap gap-12 items-center"
        >
          <div className="flex-1 min-w-[300px]">
            <p className="text-xs tracking-[0.2em] uppercase font-bold text-blue-500 mb-3">Body</p>
            <h2 className="font-display font-medium text-4xl lg:text-5xl tracking-[-0.03em] leading-[1.08] text-slate-900">Train and fuel with intention.</h2>
            <p className="mt-4 text-base leading-[1.65] text-slate-500">Log workouts set by set, watch weight and PRs trend, and let AI read your progress photos. Snap a meal for instant macros, or track against your calorie goals.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {["Workouts & PRs", "AI macros", "Photo analysis"].map(tag => (
                <span key={tag} className="text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-3.5 py-1.5">{tag}</span>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[320px]">
            <div className="bg-white border border-slate-200/70 rounded-3xl p-7 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <span className="font-display font-semibold">Today</span>
                <span className="text-sm text-slate-400">1,840 / 2,200 kcal</span>
              </div>
              <div className="flex justify-around gap-3.5">
                {[["#3b82f6", 64, "Protein"], ["#f59e0b", 90, "Carbs"], ["#ec4899", 120, "Fat"]].map(([color, offset, label]) => (
                  <div key={label} className="text-center">
                    <div className="relative w-16 h-16 mx-auto">
                      <svg width="64" height="64" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray="213.6" strokeDashoffset={offset} />
                      </svg>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-[11px] bg-blue-50 text-blue-500 flex items-center justify-center flex-none">
                  <Dumbbell strokeWidth={1.75} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Push day · 1,240 lb</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bench press · new PR 185 lb</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Money */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="flex flex-wrap-reverse gap-12 items-center"
        >
          <div className="flex-1 min-w-[320px]">
            <div className="bg-slate-900 rounded-3xl p-7 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-emerald-500/20 blur-[50px]" />
              <div className="relative">
                <span className="text-sm text-slate-400">Net worth</span>
                <div className="font-display font-semibold text-[34px] mt-1 mb-0.5">$48,200</div>
                <span className="text-sm text-emerald-400">+ 12% savings rate</span>
              </div>
              <div className="relative mt-5 flex items-end gap-1.5 h-[74px]">
                {[40, 55, 48, 70, 62, 88].map((h, i) => (
                  <div key={i} className="flex-1 rounded-md" style={{
                    height: `${h}%`,
                    background: i === 5 ? "linear-gradient(180deg,#34d399,#10b981)" : "rgba(255,255,255,0.12)",
                  }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-[300px]">
            <p className="text-xs tracking-[0.2em] uppercase font-bold text-emerald-600 mb-3">Money</p>
            <h2 className="font-display font-medium text-4xl lg:text-5xl tracking-[-0.03em] leading-[1.08] text-slate-900">See your whole financial picture.</h2>
            <p className="mt-4 text-base leading-[1.65] text-slate-500">Connect a bank with Plaid or log by hand. Dopame tracks net worth, cash flow, spending by category and your savings rate — quietly, in the background.</p>
          </div>
        </motion.div>

        {/* Mind */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="flex flex-wrap gap-12 items-center"
        >
          <div className="flex-1 min-w-[300px]">
            <p className="text-xs tracking-[0.2em] uppercase font-bold text-violet-500 mb-3">Mind</p>
            <h2 className="font-display font-medium text-4xl lg:text-5xl tracking-[-0.03em] leading-[1.08] text-slate-900">Reflect, and learn to speak well.</h2>
            <p className="mt-4 text-base leading-[1.65] text-slate-500">Capture a daily mood and journal entry. Then sharpen how you communicate with an AI partner that runs real scenarios and scores your clarity, tone and confidence.</p>
          </div>
          <div className="flex-1 min-w-[320px]">
            <div className="bg-white border border-slate-200/70 rounded-3xl p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-700 mb-3.5">How are you feeling today?</p>
              <div className="flex gap-2 mb-5">
                {["😔", "😐", "🙂", "😊", "🤩"].map((e, i) => (
                  <span key={i} className={`flex-1 text-center text-[22px] py-2 rounded-[13px] border select-none ${i === 3 ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200"}`}>{e}</span>
                ))}
              </div>
              <p className="text-xs font-bold tracking-[0.04em] uppercase text-slate-400 mb-3">Communication scores</p>
              {[["Clarity", 84, "#8b5cf6"], ["Confidence", 78, "#6366f1"], ["Tone", 90, "#8b5cf6"]].map(([label, val, color]) => (
                <div key={label} className="mb-2.5">
                  <div className="flex justify-between text-[12.5px] mb-1">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${val}%`, background: `linear-gradient(90deg, ${color}, #6366f1)` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Coach demo */}
      <section className="mx-auto max-w-[1080px] px-8 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400 mb-2.5">Try the coach</p>
          <h2 className="font-display font-medium text-4xl lg:text-5xl tracking-[-0.03em] text-slate-900">An AI coach that knows your data.</h2>
        </motion.div>
        <div className="max-w-[600px] mx-auto bg-slate-50 border border-slate-200/80 rounded-[26px] overflow-hidden shadow-[0_12px_40px_-20px_rgba(15,23,42,0.2)]">
          <div className="flex items-center gap-3 p-5 bg-white border-b border-slate-100">
            <div className="relative w-10 h-10 rounded-[13px] bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-none">
              <Sparkles className="h-5 w-5 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div>
              <p className="font-display font-semibold">Dopame Coach</p>
              <p className="text-[11.5px] text-slate-400 mt-0.5">Knows your habits, goals & streaks</p>
            </div>
          </div>
          <div className="p-5 min-h-[200px] flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-[20px] px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-slate-900 text-white rounded-br-[6px]"
                    : "bg-white border border-slate-200/80 text-slate-700 rounded-bl-[6px]"
                }`}>{m.text}</div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/80 rounded-[20px] rounded-bl-[6px] px-4 py-3 flex gap-1.5 items-center">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div className="mt-auto pt-2">
              <p className="text-xs text-slate-400 text-center mb-2.5">Tap a question to see how it responds</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {COACH_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    data-testid={HOME.coachQuestion}
                    className="border border-slate-200 bg-white text-slate-700 text-xs font-medium rounded-full px-3.5 py-2 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Life Score strip */}
      <section className="mx-auto max-w-[1080px] px-8 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="flex flex-wrap gap-10 items-center justify-center"
        >
          <LifeRing score={82} size={150} strokeWidth={10} />
          <div className="max-w-[420px]">
            <h2 className="font-display font-medium text-4xl tracking-[-0.03em] leading-[1.1] text-slate-900">One number for how life is going.</h2>
            <p className="mt-4 text-base leading-[1.65] text-slate-500">Your Life Score blends body, mind, money and growth into a single, gentle signal — with XP, levels and streaks underneath when you want the detail.</p>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1080px] px-8 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-display font-medium text-5xl lg:text-6xl tracking-[-0.035em] text-slate-900">Grow with intention.</h2>
          <p className="mt-5 text-lg text-slate-500 max-w-[420px] mx-auto leading-relaxed">Free to begin. No noise, no clutter — just a calmer way to move forward.</p>
          <Link to="/register" data-testid={HOME.ctaGetStarted} className="group mt-7 inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
            Get started <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 py-12">
        <div className="mx-auto max-w-[1080px] px-8 flex flex-wrap items-center justify-between gap-3">
          <Logo size={22} />
          <p className="text-sm text-slate-400">© 2026 Dopame · Grow with intention.</p>
        </div>
      </footer>

    </div>
  );
}
