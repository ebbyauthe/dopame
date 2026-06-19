import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/app");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-slate-900 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <Logo size={28} dark />
        <div className="relative">
          <h2 className="font-display text-4xl font-semibold text-white tracking-tight leading-tight">
            Every day is a<br />chance to compound.
          </h2>
          <p className="mt-4 text-slate-400 max-w-sm">
            Sign in to track your streaks, hit your goals and chat with your AI coach.
          </p>
        </div>
        <p className="relative text-sm text-slate-500">© 2026 Dopame</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-8"><Logo size={26} /></div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">Welcome back. Let's keep the streak alive.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                data-testid="login-email-input" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                data-testid="login-password-input" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
              />
            </div>
            <button
              data-testid="login-submit-button" type="submit" disabled={loading}
              className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to Dopame?{" "}
            <Link to="/register" data-testid="go-register-link" className="font-medium text-slate-900 hover:underline">Create an account</Link>
          </p>
          <div className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
            Demo: <span className="font-medium text-slate-700">demo@dopame.app</span> / <span className="font-medium text-slate-700">Dopame123!</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
