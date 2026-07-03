import { useState, useEffect } from "react";
import { AlertCircle, Check, Copy, Download } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { projectId } from "../../../utils/supabase/info";
import { CHAINS_CONFIG, getChainNoteKey } from "./constants";
import { copyToClipboard } from "./api";
import { Spinner, PageHeader } from "./components";
import type { ChainWallet } from "./types";

export function ReceiveTab({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [walletEntries, setWalletEntries] = useState<ChainWallet[]>([]);
  const [selectedChain, setSelectedChain] = useState("polygon");
  const [copiedAddr, setCopiedAddr]       = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const loadWallets = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await window.fetch(`https://${projectId}.supabase.co/functions/v1/server/wallet/status`, {
          headers: { "Authorization": `Bearer ${session.access_token}` },
        });
        if (res.ok) { const d = await res.json(); setWalletEntries(d.wallets ?? []); }
      } finally { setLoading(false); }
    };
    loadWallets();
  }, []);

  const chain = CHAINS_CONFIG.find((c) => c.id === selectedChain) ?? CHAINS_CONFIG[0];
  const addr  = walletEntries.find((w) => w.chain_name === selectedChain)?.address ?? "";

  const copy = (a: string) => {
    copyToClipboard(a);
    setCopiedAddr(a);
    setTimeout(() => setCopiedAddr(null), 1200);
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("receive_title")} onBack={onBack} />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CHAINS_CONFIG.map((c) => (
          <button key={c.id} onClick={() => setSelectedChain(c.id)}
            className="shrink-0 px-3 py-1.5 rounded-sm border font-mono text-[12px] font-bold transition-colors"
            style={selectedChain === c.id
              ? { backgroundColor: c.color + "20", borderColor: c.color + "60", color: c.color }
              : { borderColor: "rgba(255,255,255,0.08)", color: "#6b7280" }}>
            {c.label}
          </button>
        ))}
      </div>

      {chain.type !== "evm" && (
        <div className="flex items-center gap-2 rounded-sm px-3 py-2"
          style={{ backgroundColor: chain.color + "08", border: `1px solid ${chain.color}25` }}>
          <AlertCircle size={11} className="shrink-0" style={{ color: chain.color }} />
          <span className="font-mono text-[12px]" style={{ color: chain.color }}>{t(getChainNoteKey(chain.id))}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size={18} /></div>
      ) : !addr ? (
        <div className="bg-card border border-border rounded-sm px-4 py-6 text-center">
          <AlertCircle size={20} className="text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-[13px] text-muted-foreground">{t("no_wallet_receive")}</p>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-sm p-6 flex flex-col items-center">
            <div className="w-48 h-48 bg-white rounded-sm flex items-center justify-center mb-4 relative overflow-hidden">
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "repeat(21, 1fr)", gridTemplateRows: "repeat(21, 1fr)" }}>
                {Array.from({ length: 441 }, (_, i) => {
                  const row = Math.floor(i / 21), col = i % 21;
                  const isCorner = (row < 7 && col < 7) || (row < 7 && col > 13) || (row > 13 && col < 7);
                  const isRandom = Math.sin(i * 2.71828 + addr.charCodeAt(i % addr.length) * 1.41421) > 0.3;
                  return <div key={i} className={`${(isCorner || isRandom) ? "bg-black" : "bg-white"}`} />;
                })}
              </div>
              <div className="absolute top-2 left-2 w-10 h-10 border-4 border-black bg-white z-10"><div className="absolute inset-1 bg-black" /></div>
              <div className="absolute top-2 right-2 w-10 h-10 border-4 border-black bg-white z-10"><div className="absolute inset-1 bg-black" /></div>
              <div className="absolute bottom-2 left-2 w-10 h-10 border-4 border-black bg-white z-10"><div className="absolute inset-1 bg-black" /></div>
            </div>
            <p className="font-mono text-[13px] font-bold uppercase tracking-widest mb-2" style={{ color: chain.color }}>{chain.label} {t("address_label_suffix")}</p>
            <div className="flex items-center gap-3 bg-secondary border rounded-sm px-4 py-2.5 w-full" style={{ borderColor: `${chain.color}30` }}>
              <span className="font-mono text-[13px] text-foreground flex-1 break-all">{addr}</span>
              <button onClick={() => copy(addr)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                {copiedAddr === addr ? <Check size={14} className="text-[#00d395]" /> : <Copy size={14} />}
              </button>
            </div>
            <div className="flex gap-2 mt-4 w-full">
              <button onClick={() => copy(addr)} className="flex-1 flex items-center justify-center gap-2 py-2 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                <Copy size={12} /> {t("copy_address")}
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#8247e5] rounded-sm font-mono text-[13px] text-white hover:bg-[#8247e5]/80 transition-colors">
                <Download size={12} /> {t("save_qr")}
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-3">
            <AlertCircle size={12} className="text-[#f59e0b] mt-0.5 shrink-0" />
            <span className="font-mono text-[13px] text-[#f59e0b]">{chain.label} {t("receive_warning")}</span>
          </div>
        </>
      )}
    </div>
  );
}
