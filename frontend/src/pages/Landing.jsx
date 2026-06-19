import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Repeat, Target, BookOpen, Sparkles, ArrowRight, Flame, Trophy } from "lucide-react";
import { Logo } from "../components/Logo";

const features = [
  { icon: Repeat, title: "Habit Engine", desc: "Build streaks that compound. Daily check-ins, visual momentum, zero friction.", accent: "text-orange-500 bg-orange-50" },
  { icon: Target, title: "Goals & Milestones", desc: "Break ambitions into milestones and watch your progress bars fill.", accent: "text-slate-900 bg-slate-100" },
  { icon: BookOpen, title: "Journal & Mood", desc: "Reflect daily, track your mood trend, and understand your patterns.", accent: "text-emerald-500 bg-emerald-50" },
  { icon: Sparkles, title: "AI Coach", desc: "A personal coach that knows your habits and goals — powered by Groq.", accent: "text-blue-500 bg-blue-50" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <header className="sticky top-0 z-40 glass border-b border-slate-200/50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
          <Logo size={26} />
          <div className="flex items-center gap-2">
            <Link to="/login" data-testid="nav-login-link" className="rounded-full px-5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link to="/register" data-testid="nav-register-link" className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 sm:px-8 pt-20 pb-28">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute top-40 -left-20 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-500 mb-8"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Your personal operating system for growth
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tighter text-slate-900 leading-[1.05]"
          >
            Master your habits.<br />
            Earn your <span className="text-orange-500">dopamine.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 text-lg text-slate-500 leading-relaxed max-w-xl"
          >
            Dopame blends a habit tracker, goal planner, journal and an AI coach into one beautifully focused space — engineered for discipline and built for momentum.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link to="/register" data-testid="hero-cta-btn" className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95">
              Start free <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link to="/login" data-testid="hero-signin-btn" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all active:scale-95">
              I have an account
            </Link>
          </motion.div>
          <div className="mt-10 flex items-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-orange-500" /> Streak tracking</span>
            <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-slate-700" /> Achievements</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-blue-500" /> AI guidance</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-3xl border border-slate-200/60 bg-white p-7 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${f.accent}`}>
                <f.icon strokeWidth={1.75} className="h-5 w-5" />
              </div>
              <h3 className="font-display mt-5 text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200/60 py-10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={22} />
          <p className="text-sm text-slate-400">© 2026 Dopame. Grow with intention.</p>
        </div>
      </footer>
    </div>
  );
}
