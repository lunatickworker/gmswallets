import { useState, useEffect } from "react";
import { ShoppingCart, ArrowLeftRight, Send, Download, History } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { api } from "./api";
import { BalanceDisplay, Spinner } from "./components";
import type { Tab, UserProfile, Tx } from "./types";

export function HomeTab({ profile, onNavigate }: { profile: UserProfile | null; onNavigate: (tab: Tab) => void }) {
  const { t } = useI18n();
  const [recentTxs, setRecentTxs] = useState<Tx[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [txData, { data: noticeData }] = await Promise.all([
          api("/transactions").catch(() => []),
          supabase.from("notices").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(3),
        ]);
        setRecentTxs((txData ?? []).slice(0, 3));
        setNotices(noticeData ?? []);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const QUICK_ACTIONS = [
    { id: "buy" as Tab, label: t("quick_buy"), icon: ShoppingCart, color: "#f59e0b" },
    { id: "swap" as Tab, label: t("quick_swap"), icon: ArrowLeftRight, color: "#8247e5" },
    { id: "send" as Tab, label: t("quick_send"), icon: Send, color: "#3b82f6" },
    { id: "receive" as Tab, label: t("quick_receive"), icon: Download, color: "#00d395" },
  ];

  const typeColor = (type: string) => {
    if (type === "purchase") return "#f59e0b";
    if (type === "swap") return "#8247e5";
    if (type === "send") return "#ef4444";
    return "#00d395";
  };

  const NOTICE_TYPES: Record<string, string> = {
    notice: t("notice_type_notice"),
    popup: t("notice_type_popup"),
    event: t("notice_type_event"),
    banner: t("notice_type_banner"),
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-[#8247e5]/20 via-card to-card border border-[#8247e5]/20 rounded-sm p-5">
        <p className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-1">{t("total_assets")}</p>
        <BalanceDisplay change={t("today_change")} />
        {profile && (
          <div className="mt-3 flex items-center gap-2">
            <div className={`px-1.5 py-0.5 rounded-sm font-mono text-[13px] font-bold border text-sm ${
              profile.kyc_tier === "T2" ? "bg-[#8247e5]/10 text-[#8247e5] border-[#8247e5]/30" :
              profile.kyc_tier === "T1" ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30" :
              "bg-secondary text-muted-foreground border-border"
            }`}>KYC {profile.kyc_tier}</div>
            <span className="font-mono text-[13px] text-muted-foreground">TX {profile.tx_count}{t("tx_count_unit")}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => onNavigate(id)}
            className="bg-card border border-border rounded-sm py-4 flex flex-col items-center gap-2 hover:border-[#8247e5]/30 hover:bg-secondary/30 transition-colors active:scale-95">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
              <Icon size={18} style={{ color }} />
            </div>
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{label}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("recent_tx")}</span>
          <button onClick={() => onNavigate("history")} className="font-mono text-[13px] text-[#8247e5] hover:underline">{t("view_all")}</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Spinner size={16} /></div>
        ) : recentTxs.length === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-[14px] text-muted-foreground">{t("no_tx")}</div>
        ) : recentTxs.map((tx, i) => (
          <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${i < recentTxs.length - 1 ? "border-b border-border/50" : ""} hover:bg-secondary/20 transition-colors`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: typeColor(tx.type) + "20", color: typeColor(tx.type) }}>
              {tx.type === "purchase" ? <ShoppingCart size={12} /> : tx.type === "swap" ? <ArrowLeftRight size={12} /> : tx.type === "send" ? <Send size={12} /> : <Download size={12} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-['Barlow'] text-sm font-semibold text-foreground capitalize">{tx.type}</span>
              <div className="font-mono text-[13px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("ko-KR")}</div>
            </div>
            <div className="font-mono text-sm text-foreground">{parseFloat(tx.amount).toFixed(4)} {tx.currency}</div>
          </div>
        ))}
      </div>

      {notices.length > 0 && (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("notices")}</span>
          </div>
          {notices.map((n, i) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${i < notices.length - 1 ? "border-b border-border/50" : ""}`}>
              <span className={`inline-flex items-center border px-1.5 py-0.5 text-[13px] font-mono font-bold uppercase tracking-widest rounded-sm shrink-0 ${
                n.type === "event" ? "bg-[#00d395]/10 text-[#00d395] border-[#00d395]/30" :
                n.type === "notice" ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30" :
                "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30"
              }`}>{NOTICE_TYPES[n.type] ?? n.type}</span>
              <div className="flex-1 min-w-0">
                <div className="font-['Barlow'] text-sm font-semibold text-foreground">{n.title}</div>
                {n.content && <div className="font-mono text-[13px] text-muted-foreground mt-0.5 line-clamp-1">{n.content}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* history shortcut placeholder used by QUICK_ACTIONS */}
      <div className="hidden"><History /></div>
    </div>
  );
}
