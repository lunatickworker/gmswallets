import { useState } from "react";
import { Moon, Sun, Globe, Bell, MessageSquare, FileText, Lock, Info, ChevronRight } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { PageHeader } from "./components";

export function SettingsTab({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [darkMode, setDarkMode]     = useState(true);
  const [language, setLanguage]     = useState("ko");
  const [currency, setCurrency]     = useState("USD");
  const [pushEnabled, setPushEnabled] = useState(true);

  const toggleDarkMode = () => {
    setDarkMode((v) => !v);
    document.documentElement.classList.toggle("light-mode");
  };

  function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
      <button type="button" onClick={onChange} className="shrink-0 relative w-11 h-6 rounded-full transition-colors" style={{ backgroundColor: checked ? "#8247e5" : "rgba(255,255,255,0.1)" }}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    );
  }

  const LINK_ITEMS = [
    { label: t("customer_center"), sublabel: t("customer_center_sub"), icon: MessageSquare },
    { label: t("terms"),           sublabel: t("terms_sub"),           icon: FileText },
    { label: t("privacy"),         sublabel: "Privacy Policy",         icon: Lock },
    { label: t("app_info"),        sublabel: "v1.0.0 · Polygon Wallet",icon: Info },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t("settings_title")} onBack={onBack} />

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("display")}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
          <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            {darkMode ? <Moon size={14} className="text-[#8247e5]" /> : <Sun size={14} className="text-[#f59e0b]" />}
          </div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">{t("dark_mode")}</div>
            <div className="font-mono text-[13px] text-muted-foreground">{darkMode ? t("dark_theme_on") : t("light_theme_on")}</div>
          </div>
          <Toggle checked={darkMode} onChange={toggleDarkMode} />
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            <Globe size={14} className="text-[#3b82f6]" />
          </div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">{t("language")}</div>
          </div>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="bg-secondary border border-border rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none">
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("currency_notif")}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
          <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            <span className="font-mono text-sm text-[#00d395]">$</span>
          </div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">{t("currency_display")}</div>
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="bg-secondary border border-border rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none">
            <option value="USD">USD</option>
            <option value="KRW">KRW</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            <Bell size={14} className="text-[#f59e0b]" />
          </div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">{t("push_notif")}</div>
            <div className="font-mono text-[13px] text-muted-foreground">{t("push_notif_sub")}</div>
          </div>
          <Toggle checked={pushEnabled} onChange={() => setPushEnabled((v) => !v)} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {LINK_ITEMS.map((item, i) => (
          <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/20 transition-colors ${i < LINK_ITEMS.length - 1 ? "border-b border-border/50" : ""}`}>
            <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
              <item.icon size={14} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{item.label}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{item.sublabel}</div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
