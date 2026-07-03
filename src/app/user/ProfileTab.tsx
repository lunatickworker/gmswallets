import { Bell, Shield, Settings, User, ChevronRight } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import type { Tab, UserProfile } from "./types";

export function ProfileTab({ profile, email, onNavigate }: { profile: UserProfile | null; email: string; onNavigate: (tab: Tab) => void }) {
  const { t } = useI18n();
  const MENU_ITEMS = [
    { label: t("menu_security"),      sublabel: t("menu_security_sub"),      tab: "security"      as Tab, icon: Shield },
    { label: t("menu_settings"),      sublabel: t("menu_settings_sub"),      tab: "settings"      as Tab, icon: Settings },
    { label: t("menu_notifications"), sublabel: t("menu_notifications_sub"), tab: "notifications" as Tab, icon: Bell },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#8247e5]/20 flex items-center justify-center">
            <User size={26} className="text-[#8247e5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground truncate">{email}</div>
            <div className="font-mono text-[13px] text-muted-foreground mt-0.5">
              {profile ? `${t("joined_at")} ${new Date(profile.joined_at).toLocaleDateString("ko-KR")}` : ""}
            </div>
            {profile && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className={`px-1.5 py-0.5 rounded-sm font-mono text-[13px] font-bold border ${
                  profile.kyc_tier === "T2" ? "bg-[#8247e5]/10 text-[#8247e5] border-[#8247e5]/30" :
                  profile.kyc_tier === "T1" ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30" :
                  "bg-secondary text-muted-foreground border-border"
                }`}>KYC {profile.kyc_tier}</div>
                <span className="font-mono text-[13px] text-muted-foreground">TX {profile.tx_count}{t("tx_count_unit")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {profile && (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {[
            { label: t("profile_email"),   value: email },
            { label: t("profile_wallet"),  value: profile.wallet_address ? `${profile.wallet_address.slice(0, 12)}...${profile.wallet_address.slice(-6)}` : t("not_connected") },
            { label: t("profile_status"),  value: profile.status },
            { label: t("profile_version"), value: "v1.0.0" },
          ].map((item, i, arr) => (
            <div key={item.label} className={`flex items-center px-4 py-3 ${i < arr.length - 1 ? "border-b border-border/50" : ""}`}>
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest w-24 shrink-0">{item.label}</span>
              <span className="font-mono text-sm text-foreground flex-1 truncate">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {MENU_ITEMS.map((item, i) => (
          <button key={item.tab} onClick={() => onNavigate(item.tab)}
            className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/20 transition-colors ${i < MENU_ITEMS.length - 1 ? "border-b border-border/50" : ""}`}>
            <div className="w-8 h-8 rounded-sm bg-[#8247e5]/10 flex items-center justify-center shrink-0">
              <item.icon size={14} className="text-[#8247e5]" />
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
