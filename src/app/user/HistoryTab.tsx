import { useState, useEffect, useCallback } from "react";
import { History, ShoppingCart, ArrowLeftRight, Send, Download, RefreshCw } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { api } from "./api";
import { Spinner } from "./components";
import type { Tx } from "./types";

export function HistoryTab({ refresh }: { refresh: number }) {
  const { t } = useI18n();
  const [txs, setTxs]       = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try { const data = await api("/transactions"); setTxs(data ?? []); }
    catch { setTxs([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxs(); }, [fetchTxs, refresh]);

  const filtered = filter === "all" ? txs : txs.filter((t) => t.type === filter);

  const typeColor = (type: string) => {
    if (type === "purchase") return "#f59e0b";
    if (type === "swap") return "#8247e5";
    if (type === "send") return "#ef4444";
    return "#00d395";
  };

  const statusColor = (s: string) => s === "completed" ? "text-[#00d395]" : s === "pending" ? "text-[#f59e0b]" : "text-[#ef4444]";

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["all", "purchase", "swap", "send", "receive"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-sm font-mono text-[13px] uppercase tracking-widest border transition-colors ${filter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? t("filter_all") : f === "purchase" ? t("filter_purchase") : f === "swap" ? t("filter_swap") : f === "send" ? t("filter_send") : t("filter_receive")}
          </button>
        ))}
        <button onClick={fetchTxs} className="shrink-0 ml-auto px-3 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={11} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner size={18} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-sm px-4 py-10 text-center">
          <History size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-[14px] text-muted-foreground">{t("no_history")}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {filtered.map((tx, i) => (
            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: typeColor(tx.type) + "20", color: typeColor(tx.type) }}>
                {tx.type === "purchase" ? <ShoppingCart size={12} /> : tx.type === "swap" ? <ArrowLeftRight size={12} /> : tx.type === "send" ? <Send size={12} /> : <Download size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-['Barlow'] text-sm font-semibold text-foreground capitalize">{tx.type}</span>
                  <span className={`font-mono text-[13px] ${statusColor(tx.status)}`}>{tx.status}</span>
                </div>
                <div className="font-mono text-[13px] text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString("ko-KR")}
                  {tx.tx_hash && ` · ${tx.tx_hash.slice(0, 10)}...`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-sm text-foreground">{parseFloat(tx.amount).toFixed(4)} {tx.currency}</div>
                {tx.type === "swap" && tx.to_currency && (
                  <div className="font-mono text-[13px] text-muted-foreground">→ {tx.to_currency}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
