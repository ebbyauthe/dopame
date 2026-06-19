import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip,
} from "recharts";
import {
  Landmark, Plus, RefreshCw, Building2, TrendingUp, TrendingDown, Trash2, X, Wallet,
} from "lucide-react";
import api from "../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const COLORS = ["#0f172a", "#10b981", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#14b8a6"];

const PlaidButton = ({ onDone }) => {
  const [token, setToken] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    api.post("/finance/plaid/link-token")
      .then((r) => setToken(r.data.link_token))
      .catch(() => setUnavailable(true));
  }, []);
  const onSuccess = useCallback(async (public_token) => {
    toast.loading("Linking account…", { id: "plaid" });
    try { await api.post("/finance/plaid/exchange", { public_token }); toast.success("Bank connected!", { id: "plaid" }); onDone(); }
    catch { toast.error("Could not link account", { id: "plaid" }); }
  }, [onDone]);
  const { open, ready } = usePlaidLink({ token: token || "", onSuccess });
  if (unavailable) return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed" title="Plaid is not configured on the server">
      <Building2 className="h-4 w-4" /> Connect bank (unavailable)
    </span>
  );
  return (
    <button data-testid="connect-bank-btn" onClick={() => open()} disabled={!ready || !token}
      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">
      <Building2 className="h-4 w-4" /> Connect bank
    </button>
  );
};

export default function Finance() {
  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showTxn, setShowTxn] = useState(false);
  const [showAsset, setShowAsset] = useState(false);
  const [tx, setTx] = useState({ name: "", amount: "", flow: "expense", category: "Food" });
  const [asset, setAsset] = useState({ name: "", value: "", kind: "asset", category: "Cash" });

  const load = async () => {
    const [s, t, a, as] = await Promise.all([
      api.get("/finance/summary"), api.get("/finance/transactions"),
      api.get("/finance/accounts"), api.get("/finance/assets"),
    ]);
    setSummary(s.data); setTxns(t.data); setAccounts(a.data); setAssets(as.data);
  };
  useEffect(() => { load(); }, []);

  const sync = async () => {
    toast.loading("Syncing…", { id: "sync" });
    try { const { data } = await api.post("/finance/sync"); toast.success(`Synced ${data.synced} transactions`, { id: "sync" }); load(); }
    catch { toast.error("Sync failed", { id: "sync" }); }
  };

  const addTxn = async (e) => {
    e.preventDefault();
    await api.post("/finance/transactions", { ...tx, amount: parseFloat(tx.amount) });
    setTx({ name: "", amount: "", flow: "expense", category: "Food" }); setShowTxn(false);
    toast.success("Transaction added"); load();
  };
  const delTxn = async (id) => { await api.delete(`/finance/transactions/${id}`); load(); };

  const addAsset = async (e) => {
    e.preventDefault();
    await api.post("/finance/assets", { ...asset, value: parseFloat(asset.value) });
    setAsset({ name: "", value: "", kind: "asset", category: "Cash" }); setShowAsset(false);
    toast.success("Added"); load();
  };
  const delAsset = async (id) => { await api.delete(`/finance/assets/${id}`); load(); };

  if (!summary) return <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" /></div>;

  return (
    <div className="space-y-8" data-testid="finance-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-400">Your money</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-1">Finance</h1>
        </div>
        <div className="flex items-center gap-2">
          {summary.connected && <button onClick={sync} data-testid="sync-btn" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"><RefreshCw className="h-4 w-4" /> Sync</button>}
          <PlaidButton onDone={load} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[["Net worth", money(summary.net_worth), Wallet, "text-slate-900 bg-slate-100"],
          ["Income (mo)", money(summary.month_income), TrendingUp, "text-emerald-500 bg-emerald-50"],
          ["Expenses (mo)", money(summary.month_expense), TrendingDown, "text-rose-500 bg-rose-50"],
          ["Savings rate", `${summary.savings_rate}%`, Landmark, "text-blue-500 bg-blue-50"]].map(([l, v, Icon, a], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-3xl border border-slate-200/60 bg-white p-6">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${a}`}><Icon strokeWidth={1.75} className="h-5 w-5" /></div>
            <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900">{v}</p>
            <p className="text-sm text-slate-500">{l}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-slate-900 mb-6">Cash flow trend</h3>
          {summary.trend.length === 0 ? <p className="text-sm text-slate-400 py-12 text-center">No data yet. Connect a bank or add a transaction.</p> : (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.trend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="fe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fill="url(#fi)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#fe)" />
              </AreaChart>
            </ResponsiveContainer></div>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">Spending by category</h3>
          {summary.categories.length === 0 ? <p className="text-sm text-slate-400 py-10 text-center">No expenses this month.</p> : (
            <>
              <div className="h-40"><ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={summary.categories} dataKey="amount" nameKey="category" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {summary.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} /></PieChart>
              </ResponsiveContainer></div>
              <div className="mt-3 space-y-1.5">
                {summary.categories.slice(0, 5).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.category}</span>
                    <span className="font-medium text-slate-900">{money(c.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <div key={a.account_id} className="rounded-3xl border border-slate-200/60 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{a.name}</p>
                <span className="text-xs text-slate-400">••{a.mask}</span>
              </div>
              <p className="mt-2 font-display text-xl font-semibold text-slate-900">{money(a.current)}</p>
              <p className="text-xs text-slate-400 capitalize">{a.subtype}</p>
            </div>
          ))}
        </div>
      )}

      {/* Transactions */}
      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-slate-900">Transactions</h3>
          <button data-testid="add-txn-btn" onClick={() => setShowTxn(!showTxn)} className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-all active:scale-95"><Plus className="h-4 w-4" /> Add</button>
        </div>
        {showTxn && (
          <form onSubmit={addTxn} className="mb-5 grid grid-cols-1 sm:grid-cols-5 gap-2 rounded-2xl bg-slate-50 p-4">
            <input data-testid="txn-name" required value={tx.name} onChange={(e) => setTx({ ...tx, name: e.target.value })} placeholder="Description" className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
            <input data-testid="txn-amount" required type="number" step="0.01" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} placeholder="Amount" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
            <select data-testid="txn-flow" value={tx.flow} onChange={(e) => setTx({ ...tx, flow: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"><option value="expense">Expense</option><option value="income">Income</option></select>
            <button data-testid="save-txn-btn" type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">Save</button>
          </form>
        )}
        {txns.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No transactions yet.</p> : (
          <div className="divide-y divide-slate-100">
            {txns.slice(0, 30).map((t) => (
              <div key={t.id} data-testid={`txn-${t.id}`} className="group flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${t.flow === "income" ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-500"}`}>{t.flow === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{t.name}</p><p className="text-xs text-slate-400">{t.category} · {t.date}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${t.flow === "income" ? "text-emerald-500" : "text-slate-900"}`}>{t.flow === "income" ? "+" : "−"}{money(t.amount)}</span>
                  {t.source === "manual" && <button onClick={() => delTxn(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Net worth assets */}
      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-slate-900">Assets & liabilities</h3>
          <button data-testid="add-asset-btn" onClick={() => setShowAsset(!showAsset)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"><Plus className="h-4 w-4" /> Add</button>
        </div>
        {showAsset && (
          <form onSubmit={addAsset} className="mb-5 grid grid-cols-1 sm:grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-4">
            <input data-testid="asset-name" required value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} placeholder="e.g. Car, Loan" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
            <input data-testid="asset-value" required type="number" step="0.01" value={asset.value} onChange={(e) => setAsset({ ...asset, value: e.target.value })} placeholder="Value" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
            <select data-testid="asset-kind" value={asset.kind} onChange={(e) => setAsset({ ...asset, kind: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"><option value="asset">Asset</option><option value="liability">Liability</option></select>
            <button data-testid="save-asset-btn" type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">Save</button>
          </form>
        )}
        {assets.length === 0 ? <p className="text-sm text-slate-400 text-center py-6">Add assets and liabilities to refine your net worth.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assets.map((a) => (
              <div key={a.id} className="group flex items-center justify-between rounded-2xl border border-slate-200/60 px-4 py-3">
                <div><p className="text-sm font-medium text-slate-900">{a.name}</p><p className="text-xs text-slate-400 capitalize">{a.kind}</p></div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${a.kind === "asset" ? "text-emerald-500" : "text-rose-500"}`}>{a.kind === "asset" ? "+" : "−"}{money(a.value)}</span>
                  <button onClick={() => delAsset(a.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
