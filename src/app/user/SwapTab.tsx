import { useState } from "react";
import { ArrowLeftRight, AlertCircle, Check } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { api } from "./api";
import { TOKENS } from "./constants";
import { Spinner, PageHeader } from "./components";

export function SwapTab({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [fromToken, setFromToken] = useState("MATIC");
  const [toToken, setToToken]     = useState("USDC");
  const [amount, setAmount]       = useState("");
  const [slippage, setSlippage]   = useState("0.5");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  const from = TOKENS.find((t) => t.symbol === fromToken)!;
  const to   = TOKENS.find((t) => t.symbol === toToken)!;
  const toAmount    = amount ? ((parseFloat(amount) * from.price) / to.price).toFixed(6) : "";
  const priceImpact = amount ? (parseFloat(amount) * 0.001).toFixed(3) : "";

  const flipTokens = () => { setFromToken(toToken); setToToken(fromToken); setAmount(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true); setError("");
    try {
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({ type: "swap", amount: parseFloat(amount), currency: fromToken, from_currency: fromToken, to_currency: toToken, status: "completed", dex: "Uniswap V3", fee: parseFloat(amount) * 0.003 }),
      });
      setDone(true);
      setTimeout(() => { setDone(false); setAmount(""); onSuccess(); }, 2000);
    } catch (err: any) { setError(err.message ?? t("swap_failed")); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("swap_title")} onBack={onBack} />
      <div className="bg-card border border-border rounded-sm p-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">From</label>
            <div className="flex gap-2">
              <input type="number" min="0.000001" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.000000"
                className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              <select value={fromToken} onChange={(e) => { setFromToken(e.target.value); setAmount(""); }}
                className="bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60">
                {TOKENS.map((t) => <option key={t.symbol} value={t.symbol} disabled={t.symbol === toToken}>{t.symbol}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <button type="button" onClick={flipTokens}
              className="w-9 h-9 rounded-full border border-border bg-secondary hover:bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeftRight size={14} />
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">To</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-secondary/40 border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-muted-foreground">{toAmount || "0.000000"}</div>
              <select value={toToken} onChange={(e) => setToToken(e.target.value)}
                className="bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60">
                {TOKENS.map((t) => <option key={t.symbol} value={t.symbol} disabled={t.symbol === fromToken}>{t.symbol}</option>)}
              </select>
            </div>
          </div>
          {amount && toAmount && (
            <div className="bg-secondary/60 border border-border rounded-sm px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("exchange_rate")}</span><span className="font-mono text-[13px] text-foreground">1 {fromToken} = {(from.price / to.price).toFixed(6)} {toToken}</span></div>
              <div className="flex items-center justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("price_impact")}</span><span className="font-mono text-[13px] text-[#f59e0b]">{priceImpact}%</span></div>
              <div className="flex items-center justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("swap_fee")}</span><span className="font-mono text-[13px] text-muted-foreground">{(parseFloat(amount) * 0.003).toFixed(6)} {fromToken}</span></div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("slippage")}</span>
            <div className="flex gap-1.5">
              {["0.1", "0.5", "1.0"].map((v) => (
                <button key={v} type="button" onClick={() => setSlippage(v)}
                  className={`px-2 py-1 font-mono text-[13px] border rounded-sm transition-colors ${slippage === v ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {v}%
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
              <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
              <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
            </div>
          )}
          <button type="submit" disabled={loading || done || !amount}
            className={`w-full py-2.5 font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${done ? "bg-[#00d395] text-background" : "bg-[#8247e5] hover:bg-[#8247e5]/80 text-white"}`}>
            {loading ? <Spinner size={14} /> : done ? <Check size={13} /> : <ArrowLeftRight size={13} />}
            {loading ? t("swapping") : done ? t("swap_done") : `${fromToken} → ${toToken}`}
          </button>
        </form>
      </div>
    </div>
  );
}
