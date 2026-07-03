import { useState, useEffect, useCallback } from "react";
import { Wallet, Plus, QrCode, Copy, Check } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { projectId } from "../../../utils/supabase/info";
import { CHAINS_CONFIG, TOKENS, BALANCES, tokenColor } from "./constants";
import { copyToClipboard } from "./api";
import { BalanceDisplay, Spinner } from "./components";
import { CreateWalletModal } from "./CreateWalletModal";
import type { Tab, UserProfile, ChainWallet } from "./types";

export function WalletTab({ profile, onNavigate, onRefreshProfile }: {
  profile: UserProfile | null;
  onNavigate: (tab: Tab) => void;
  onRefreshProfile: () => void;
}) {
  const { t } = useI18n();
  const [walletData, setWalletData]   = useState<{ wallet_status: string; wallets: ChainWallet[] }>({ wallet_status: "none", wallets: [] });
  const [selectedChain, setSelectedChain] = useState("polygon");
  const [copiedAddr, setCopiedAddr]   = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [loading, setLoading]         = useState(true);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/server/wallet/status`, {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setWalletData({ wallet_status: d.wallet_status ?? "none", wallets: d.wallets ?? [] });
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const hasWallet = walletData.wallets.length > 0;

  const copyAddr = (a: string) => {
    copyToClipboard(a);
    setCopiedAddr(a);
    setTimeout(() => setCopiedAddr(null), 1200);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-[#8247e5]/20 via-card to-card border border-[#8247e5]/20 rounded-sm p-5">
        <p className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-1">{t("total_balance")}</p>
        <BalanceDisplay change={t("change_24h")} />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size={18} /></div>
      ) : !hasWallet ? (
        <div className="bg-card border border-border rounded-sm p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#8247e5]/10 flex items-center justify-center">
            <Wallet size={28} className="text-[#8247e5]" />
          </div>
          <div>
            <p className="font-['Barlow_Condensed'] text-lg font-bold uppercase text-foreground mb-1">{t("no_wallet_title")}</p>
            <p className="font-mono text-[13px] text-muted-foreground whitespace-pre-line">{t("no_wallet_desc")}</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="w-full py-3 bg-[#8247e5] hover:bg-[#8247e5]/80 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
            <Plus size={14} /> {t("create_wallet")}
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="grid grid-cols-3 gap-1 p-2 border-b border-border bg-secondary/30">
            {CHAINS_CONFIG.map((c) => (
              <button key={c.id} onClick={() => setSelectedChain(c.id)}
                className="py-1.5 rounded-sm font-mono text-[12px] font-bold transition-colors"
                style={selectedChain === c.id
                  ? { backgroundColor: c.color + "25", border: `1px solid ${c.color}60`, color: c.color }
                  : { border: "1px solid transparent", color: "#6b7280" }}>
                {c.label}
              </button>
            ))}
          </div>
          {(() => {
            const c = CHAINS_CONFIG.find((x) => x.id === selectedChain) ?? CHAINS_CONFIG[0];
            const a = walletData.wallets.find((w) => w.chain_name === c.id)?.address ?? "";
            return (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-background shrink-0" style={{ backgroundColor: c.color }}>{c.symbol.slice(0, 1)}</div>
                  <span className="font-mono text-[13px] font-bold" style={{ color: c.color }}>{c.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{c.symbol}</span>
                </div>
                <div className="bg-secondary/60 rounded-sm px-3 py-2.5 flex items-center gap-2" style={{ border: `1px solid ${c.color}20` }}>
                  <span className="font-mono text-[12px] text-muted-foreground flex-1 break-all leading-relaxed">{a || "—"}</span>
                  {a && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => copyAddr(a)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {copiedAddr === a ? <Check size={13} className="text-[#00d395]" /> : <Copy size={13} />}
                      </button>
                      <button onClick={() => onNavigate("receive")} className="text-muted-foreground hover:text-[#8247e5] transition-colors">
                        <QrCode size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {hasWallet && (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("held_tokens")}</span>
          </div>
          {BALANCES.map((b) => {
            const tok = TOKENS.find((t) => t.symbol === b.symbol);
            return (
              <div key={b.symbol} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ backgroundColor: tokenColor(b.symbol) + "20" }}>
                  {tok?.icon_url ? (
                    <img src={tok.icon_url} alt={b.symbol} className="w-8 h-8 rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span className="font-mono text-[13px] font-bold" style={{ color: tokenColor(b.symbol) }}>{b.symbol.slice(0, 1)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-['Barlow'] text-sm font-semibold text-foreground">{b.symbol}</div>
                  <div className="font-mono text-[13px] text-muted-foreground">{TOKENS.find((t) => t.symbol === b.symbol)?.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-foreground">{b.amount.toLocaleString()}</div>
                  <div className="font-mono text-[13px] text-muted-foreground">${b.usdValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {profile && (
        <div className="bg-card border border-border rounded-sm px-4 py-3 flex items-center gap-3">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("kyc_grade")}</span>
          <div className={`px-2 py-0.5 rounded-sm font-mono text-[13px] font-bold border ${
            profile.kyc_tier === "T2" ? "bg-[#8247e5]/10 text-[#8247e5] border-[#8247e5]/30" :
            profile.kyc_tier === "T1" ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30" :
            "bg-secondary text-muted-foreground border-border"
          }`}>{profile.kyc_tier}</div>
          <span className="font-mono text-[13px] text-muted-foreground flex-1 text-right">{t("tx_count")} {profile.tx_count}{t("tx_count_unit")}</span>
        </div>
      )}

      {showCreate && (
        <CreateWalletModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchWallet(); onRefreshProfile(); }}
        />
      )}
    </div>
  );
}
