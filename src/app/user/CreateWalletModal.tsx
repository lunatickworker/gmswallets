import { useState } from "react";
import { ethers } from "ethers";
import { Wallet, X, AlertTriangle, Check, Copy, Download, Plus, Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { projectId } from "../../../utils/supabase/info";
import { generateAllChainWallets } from "./wallet";
import { CHAINS_CONFIG, getChainNoteKey } from "./constants";
import { copyToClipboard } from "./api";
import type { ChainWallet } from "./types";

type CreateStep = "intro" | "mnemonic" | "addresses" | "registering" | "done";

export function CreateWalletModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useI18n();
  const [step, setStep]           = useState<CreateStep>("intro");
  const [mnemonic, setMnemonic]   = useState("");
  const [wallets, setWallets]     = useState<ChainWallet[]>([]);
  const [backed, setBacked]       = useState(false);
  const [copied, setCopied]       = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [error, setError]         = useState("");

  const generate = () => {
    const w = ethers.Wallet.createRandom();
    const phrase = w.mnemonic!.phrase;
    setMnemonic(phrase);
    setWallets(generateAllChainWallets(phrase));
    setStep("mnemonic");
  };

  const copyMnemonic = () => {
    copyToClipboard(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadMnemonic = () => {
    const words = mnemonic.split(" ");
    const content = ["chain seed", "", ...words.map((w, i) => `${String(i + 1).padStart(2, " ")}. ${w}`)].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "wallet-seed-phrase-KEEP-SECURE.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const copyAddr = (addr: string) => {
    copyToClipboard(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1200);
  };

  const register = async () => {
    setStep("registering");
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("login_required"));
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/server/wallet/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ wallets }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t("register_failed"));
      }
      setStep("done");
    } catch (err: any) {
      setError(err.message ?? t("register_error"));
      setStep("addresses");
    }
  };

  const words = mnemonic.split(" ");

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-sm w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Wallet size={15} className="text-[#8247e5]" />
            <span className="font-['Barlow_Condensed'] text-base font-bold uppercase tracking-widest text-foreground">
              {step === "intro" ? t("wallet_create") : step === "mnemonic" ? t("wallet_backup") : step === "addresses" ? t("wallet_addresses") : step === "registering" ? t("wallet_registering") : t("wallet_done")}
            </span>
          </div>
          {step !== "registering" && step !== "done" && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {step === "intro" && (
            <>
              <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[#f59e0b] shrink-0" />
                  <span className="font-mono text-[13px] text-[#f59e0b] font-bold uppercase tracking-widest">{t("important_notice")}</span>
                </div>
                <ul className="space-y-1.5 font-mono text-[13px] text-muted-foreground list-disc list-inside">
                  <li>{t("notice_item1")}</li>
                  <li>{t("notice_item2")}</li>
                  <li>{t("notice_item3")}</li>
                  <li><span className="text-[#ef4444]">{t("notice_item4")}</span></li>
                </ul>
              </div>
              <div className="bg-secondary/60 border border-border rounded-sm p-4 space-y-2">
                <p className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("supported_chains")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CHAINS_CONFIG.map((c) => (
                    <span key={c.id} className="font-mono text-[12px] px-2 py-0.5 rounded-sm border"
                      style={{ color: c.color, borderColor: c.color + "40", backgroundColor: c.color + "10" }}>
                      {c.label}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[12px] text-muted-foreground">{t("one_seed_desc")}</p>
              </div>
              <button onClick={generate}
                className="w-full py-3 bg-[#8247e5] hover:bg-[#8247e5]/80 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                <Plus size={14} /> {t("start_create")}
              </button>
            </>
          )}

          {step === "mnemonic" && (
            <>
              <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2.5">
                <AlertTriangle size={12} className="text-[#ef4444] shrink-0" />
                <span className="font-mono text-[13px] text-[#ef4444]">{t("no_screenshot")}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {words.map((w, i) => (
                  <div key={i} className="bg-secondary border border-border rounded-sm px-3 py-2.5 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <span className="font-mono text-[13px] text-foreground font-bold">{w}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={copyMnemonic}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <Check size={12} className="text-[#00d395]" /> : <Copy size={12} />}
                  {copied ? t("copied") : t("copy")}
                </button>
                <button onClick={downloadMnemonic}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                  <Download size={12} /> {t("download_txt")}
                </button>
              </div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${backed ? "bg-[#00d395] border-[#00d395]" : "border-border bg-secondary"}`}
                  onClick={() => setBacked((v) => !v)}>
                  {backed && <Check size={10} className="text-background" />}
                </div>
                <span className="font-mono text-[13px] text-muted-foreground" onClick={() => setBacked((v) => !v)}>
                  {t("backup_confirm")}
                </span>
              </label>
              <button onClick={() => setStep("addresses")} disabled={!backed}
                className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-40 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors">
                {t("next_check_addr")}
              </button>
            </>
          )}

          {step === "addresses" && (
            <>
              <p className="font-mono text-[13px] text-muted-foreground">{t("derived_addr_desc")}</p>
              {error && (
                <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
                  <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
                  <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
                </div>
              )}
              <div className="space-y-2">
                {CHAINS_CONFIG.map((c) => {
                  const entry = wallets.find((w) => w.chain_name === c.id);
                  const addr  = entry?.address ?? "";
                  return (
                    <div key={c.id} className="bg-secondary border border-border rounded-sm px-3 py-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-background shrink-0" style={{ backgroundColor: c.color }}>
                          {c.symbol.slice(0, 1)}
                        </div>
                        <span className="font-mono text-[13px] font-bold" style={{ color: c.color }}>{c.label}</span>
                        <span className="font-mono text-[11px] text-muted-foreground flex-1">{t(getChainNoteKey(c.id))}</span>
                        <button onClick={() => copyAddr(addr)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                          {copiedAddr === addr ? <Check size={11} className="text-[#00d395]" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="font-mono text-[12px] text-muted-foreground break-all pl-7">{addr}</div>
                      <div className="font-mono text-[11px] text-muted-foreground/60 pl-7">{c.path}</div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-3 py-2.5">
                <span className="font-mono text-[13px] text-[#8247e5]">{t("evm_same_addr")}</span>
              </div>
              <button onClick={register}
                className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                <Wallet size={13} /> {t("register_wallet")}
              </button>
            </>
          )}

          {step === "registering" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 size={32} className="text-[#8247e5] animate-spin" />
              <p className="font-mono text-[14px] text-muted-foreground">{t("registering_wallet")}</p>
            </div>
          )}

          {step === "done" && (
            <>
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-14 h-14 rounded-full bg-[#00d395]/10 flex items-center justify-center">
                  <Check size={26} className="text-[#00d395]" />
                </div>
                <p className="font-['Barlow_Condensed'] text-xl font-bold uppercase text-foreground">{t("wallet_done_title")}</p>
                <p className="font-mono text-[13px] text-muted-foreground text-center whitespace-pre-line">{t("wallet_done_desc")}</p>
              </div>
              <div className="space-y-1.5">
                {CHAINS_CONFIG.map((c) => {
                  const addr = wallets.find((w) => w.chain_name === c.id)?.address ?? "";
                  return (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-sm">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-background shrink-0" style={{ backgroundColor: c.color }}>{c.symbol.slice(0, 1)}</div>
                      <span className="font-mono text-[12px] font-bold shrink-0" style={{ color: c.color }}>{c.label}</span>
                      <span className="font-mono text-[12px] text-muted-foreground flex-1 truncate">{addr.slice(0, 12)}...{addr.slice(-6)}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={onSuccess}
                className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors">
                {t("view_wallet")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
