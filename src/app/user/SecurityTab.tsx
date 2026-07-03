import { useState } from "react";
import { Eye, Fingerprint, Lock, Smartphone, Shield, Key, ChevronRight, AlertCircle } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { PageHeader } from "./components";

export function SecurityTab({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [faceId, setFaceId]       = useState(false);
  const [fingerprint, setFingerprint] = useState(false);
  const [pin, setPin]             = useState(false);
  const [autoLock, setAutoLock]   = useState(true);
  const [autoLockTime, setAutoLockTime] = useState("5");
  const [showWarning, setShowWarning] = useState<"seed" | "key" | null>(null);

  function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
      <button type="button" onClick={onChange} className="shrink-0 relative w-11 h-6 rounded-full transition-colors" style={{ backgroundColor: checked ? "#8247e5" : "rgba(255,255,255,0.1)" }}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    );
  }

  const SECURITY_ITEMS = [
    { label: t("faceid"),      sublabel: t("faceid_sub"),      icon: Eye,         checked: faceId,      onChange: () => setFaceId((v) => !v) },
    { label: t("fingerprint"), sublabel: t("fingerprint_sub"), icon: Fingerprint, checked: fingerprint, onChange: () => setFingerprint((v) => !v) },
    { label: t("pin"),         sublabel: t("pin_sub"),         icon: Lock,        checked: pin,         onChange: () => setPin((v) => !v) },
    { label: t("autolock"),    sublabel: t("autolock_sub"),    icon: Smartphone,  checked: autoLock,    onChange: () => setAutoLock((v) => !v) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t("security_title")} onBack={onBack} />

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {SECURITY_ITEMS.map((item, i) => (
          <div key={item.label} className={`flex items-center gap-3 px-4 py-4 ${i < SECURITY_ITEMS.length - 1 ? "border-b border-border/50" : ""}`}>
            <div className="w-8 h-8 rounded-sm bg-[#8247e5]/10 flex items-center justify-center shrink-0">
              <item.icon size={14} className="text-[#8247e5]" />
            </div>
            <div className="flex-1">
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{item.label}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{item.sublabel}</div>
            </div>
            <Toggle checked={item.checked} onChange={item.onChange} />
          </div>
        ))}
        {autoLock && (
          <div className="flex items-center gap-3 px-4 py-3 border-t border-border/50 bg-secondary/20">
            <span className="font-mono text-[13px] text-muted-foreground flex-1">{t("autolock_time")}</span>
            <select value={autoLockTime} onChange={(e) => setAutoLockTime(e.target.value)}
              className="bg-secondary border border-border rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none">
              <option value="1">{t("min_1")}</option>
              <option value="5">{t("min_5")}</option>
              <option value="15">{t("min_15")}</option>
              <option value="30">{t("min_30")}</option>
            </select>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("backup_export")}</span>
        </div>
        <button onClick={() => setShowWarning("seed")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/20 transition-colors border-b border-border/50">
          <div className="w-8 h-8 rounded-sm bg-[#f59e0b]/10 flex items-center justify-center shrink-0"><Key size={14} className="text-[#f59e0b]" /></div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">{t("backup_seed")}</div>
            <div className="font-mono text-[13px] text-muted-foreground">{t("backup_seed_sub")}</div>
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
        <button onClick={() => setShowWarning("key")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/20 transition-colors">
          <div className="w-8 h-8 rounded-sm bg-[#ef4444]/10 flex items-center justify-center shrink-0"><Shield size={14} className="text-[#ef4444]" /></div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">{t("export_key")}</div>
            <div className="font-mono text-[13px] text-muted-foreground">{t("export_key_sub")}</div>
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
      </div>

      {showWarning && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-[#ef4444]/30 rounded-sm p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-[#ef4444]" />
              <span className="font-['Barlow_Condensed'] text-lg font-bold text-[#ef4444] uppercase">{t("warning")}</span>
            </div>
            <p className="font-mono text-[14px] text-foreground mb-2">
              {showWarning === "seed" ? t("seed_warning") : t("key_warning")}
            </p>
            <p className="font-mono text-[14px] text-[#ef4444] mb-4">{t("phishing_warning")}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowWarning(null)} className="flex-1 py-2.5 border border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">{t("cancel")}</button>
              <button onClick={() => setShowWarning(null)} className="flex-1 py-2.5 bg-[#ef4444] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#ef4444]/80 transition-colors">{t("danger_confirm")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
