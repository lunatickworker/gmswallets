import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard, api } from "./shared";
import { useI18n } from "../../lib/i18n";

export function PurchasesSection() {
  const { t } = useI18n();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "purchase")
        .order("created_at", { ascending: false });
      setTxs(data ?? []);
    } catch { setTxs([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const filtered = statusFilter === "all" ? txs : txs.filter((t) => t.status === statusFilter);
  const completed = txs.filter((t) => t.status === "completed");
  const failed = txs.filter((t) => t.status === "failed");
  const totalVolume = completed.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t("tx_total_purchase")} value={String(txs.length)} />
        <StatCard label={t("tx_completed")} value={String(completed.length)} accent="#00d395" sub={`$${totalVolume.toFixed(0)}`} />
        <StatCard label={t("tx_failed_label")} value={String(failed.length)} accent="#ef4444" />
        <StatCard label={t("tx_pending_label")} value={String(txs.filter((tx) => tx.status === "pending").length)} accent="#f59e0b" />
      </div>

      <div className="flex items-center gap-2">
        {["all", "completed", "pending", "failed"].map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${statusFilter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? t("con_all") : f}
          </button>
        ))}
        <button onClick={fetchTxs} className="ml-auto p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={11} /></button>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[t("tx_col_amount"), t("tx_col_coin"), t("tx_col_provider"), t("tx_col_status"), t("tx_col_fail_reason"), t("tx_col_date")].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("tx_no_purchase")}</td></tr>
              ) : filtered.map((tx, i) => (
                <tr key={tx.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{parseFloat(tx.amount).toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{tx.currency}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{tx.payment_provider ?? "Transak"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={tx.status === "completed" ? "green" : tx.status === "pending" ? "yellow" : "red"}>{tx.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[#ef4444]">{tx.failure_reason ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SwapsSection() {
  const { t } = useI18n();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "swap")
        .order("created_at", { ascending: false });
      setTxs(data ?? []);
    } catch { setTxs([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const success = txs.filter((t) => t.status === "completed").length;
  const successRate = txs.length ? ((success / txs.length) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t("tx_total_swap")} value={String(txs.length)} />
        <StatCard label={t("tx_success")} value={String(success)} accent="#00d395" />
        <StatCard label={t("tx_failed_label")} value={String(txs.filter((tx) => tx.status === "failed").length)} accent="#ef4444" />
        <StatCard label={t("tx_success_rate")} value={`${successRate}%`} accent="#8247e5" />
      </div>

      <div className="flex justify-end">
        <button onClick={fetchTxs} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["From", "To", t("tx_col_qty"), "DEX", t("tx_col_dex_fee"), "TX Hash", t("tx_col_status"), t("tx_col_date")].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("tx_no_swap")}</td></tr>
              ) : txs.map((tx, i) => (
                <tr key={tx.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === txs.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{tx.from_currency ?? tx.currency}</td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{tx.to_currency ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{parseFloat(tx.amount).toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{tx.dex ?? "Uniswap V3"}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{parseFloat(tx.fee ?? 0).toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{tx.tx_hash ? `${tx.tx_hash.slice(0, 10)}...` : "—"}</td>
                  <td className="px-4 py-3"><Badge variant={tx.status === "completed" ? "green" : tx.status === "pending" ? "yellow" : "red"}>{tx.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TransactionsSection() {
  const { t } = useI18n();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: "purchase", amount: "", currency: "USDC", status: "completed", tx_hash: "" });
  const [saving, setSaving] = useState(false);

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try { const data = await api("/transactions"); setTxs(data ?? []); }
    catch { setTxs([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const addTx = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api("/transactions", { method: "POST", body: JSON.stringify(form) }); setShowModal(false); fetchTxs(); }
    finally { setSaving(false); }
  };

  const totalVolume = txs.filter((t) => t.currency === "USDC" && t.status === "completed").reduce((s, t) => s + parseFloat(t.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Volume" value={`$${totalVolume.toFixed(0)}`} sub="USDC completed" />
        <StatCard label="Purchase" value={String(txs.filter((t) => t.type === "purchase").length)} accent="#f59e0b" />
        <StatCard label="Swap" value={String(txs.filter((t) => t.type === "swap").length)} accent="#8247e5" />
        <StatCard label="Send" value={String(txs.filter((t) => t.type === "send").length)} accent="#3b82f6" />
      </div>
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
          <Plus size={12} /> Add Transaction
        </button>
      </div>
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Type", "Amount", "Currency", "Tx Hash", "Status", "Date"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("tx_no_tx")}</td></tr>
              ) : txs.map((tx, i) => (
                <tr key={tx.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === txs.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3"><Badge variant={tx.type === "purchase" ? "yellow" : tx.type === "swap" ? "purple" : "blue"}>{tx.type}</Badge></td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{parseFloat(tx.amount).toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{tx.currency}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{tx.tx_hash || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={tx.status === "completed" ? "green" : tx.status === "pending" ? "yellow" : "red"}>{tx.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">Add Transaction</span>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <form onSubmit={addTx} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option value="purchase">Purchase</option><option value="swap">Swap</option><option value="send">Send</option>
                </select>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input required type="number" step="any" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option>USDC</option><option>MATIC</option><option>WETH</option>
                </select>
              </div>
              <input placeholder="Tx Hash (optional)" value={form.tx_hash} onChange={(e) => setForm({ ...form, tx_hash: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
              <button type="submit" disabled={saving} className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
                {saving ? "Adding..." : "Add"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
