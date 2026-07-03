import { useState } from "react";
import { Send, AlertCircle, Check, QrCode } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { api } from "./api";
import { TOKENS } from "./constants";
import { Spinner, PageHeader } from "./components";

export function SendTab({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [toAddr, setToAddr]     = useState("");
  const [currency, setCurrency] = useState("MATIC");
  const [amount, setAmount]     = useState("");
  const [memo, setMemo]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const token = TOKENS.find((t) => t.symbol === currency)!;
  const usdValue = amount ? (parseFloat(amount) * token.price).toFixed(2) : "";
  const estimatedFee = "0.0012 MATIC";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) { setConfirmed(true); return; }
    setLoading(true); setError("");
    try {
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({ type: "send", amount: parseFloat(amount), currency, to_address: toAddr, memo: memo || null, status: "completed", fee: 0.0012 }),
      });
      setDone(true);
      setTimeout(() => { setDone(false); setAmount(""); setToAddr(""); setMemo(""); setConfirmed(false); onSuccess(); }, 2500);
    } catch (err: any) { setError(err.message ?? t("send_failed")); setConfirmed(false); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("send_title")} onBack={onBack} />
      <div className="bg-card border border-border rounded-sm p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("to_address")}</label>
            <div className="flex gap-2">
              <input type="text" required value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder="0x..."
                className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              <button type="button" className="px-3 py-2 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors" title="QR 스캔">
                <QrCode size={14} />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("token_label")}</label>
            <div className="flex gap-2">
              {TOKENS.map((t) => (
                <button key={t.symbol} type="button" onClick={() => setCurrency(t.symbol)}
                  className="flex-1 py-2 rounded-sm border font-mono text-sm font-bold transition-colors"
                  style={currency === t.symbol ? { borderColor: t.color + "60", backgroundColor: t.color + "15", color: t.color } : { borderColor: "rgba(255,255,255,0.08)", color: "#6b7280" }}>
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("amount_label")}</label>
            <input type="number" min="0.000001" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.000000"
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
            {usdValue && <div className="font-mono text-[13px] text-muted-foreground">≈ ${usdValue} USD</div>}
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("memo_label")}</label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={t("memo_placeholder")}
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
          </div>
          <div className="bg-secondary/60 border border-border rounded-sm px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-[14px] text-muted-foreground">{t("est_network_fee")}</span>
            <span className="font-mono text-[14px] text-foreground">{estimatedFee}</span>
          </div>
          {confirmed && !loading && (
            <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-3">
              <div className="font-mono text-[14px] text-[#f59e0b] mb-2">{t("confirm_send")}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{t("recipient")} {toAddr.slice(0, 12)}...{toAddr.slice(-6)}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{t("sending_amount")} {amount} {currency}</div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
              <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
              <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
            </div>
          )}
          <button type="submit" disabled={loading || done || !toAddr || !amount}
            className={`w-full py-2.5 font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${done ? "bg-[#00d395] text-background" : confirmed ? "bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-background" : "bg-[#8247e5] hover:bg-[#8247e5]/80 text-white"}`}>
            {loading ? <Spinner size={14} /> : done ? <Check size={13} /> : <Send size={13} />}
            {loading ? t("send_processing") : done ? t("send_done") : confirmed ? t("confirm_send_btn") : t("send_btn")}
          </button>
        </form>
      </div>
    </div>
  );
}
