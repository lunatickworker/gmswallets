import { useState, useEffect, useCallback } from "react";
import { Wallet, Home, History, Bell, User, LogOut, Clock } from "lucide-react";
import { useI18n, LanguageSwitcher } from "../lib/i18n";
import headerLogo from "@/imports/gms_wallet_admin_logo.png";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { supabase } from "../lib/supabase";
import { Spinner } from "./user/components";
import { AuthScreen } from "./user/AuthScreen";
import { HomeTab } from "./user/HomeTab";
import { WalletTab } from "./user/WalletTab";
import { BuyTab } from "./user/BuyTab";
import { SwapTab } from "./user/SwapTab";
import { SendTab } from "./user/SendTab";
import { ReceiveTab } from "./user/ReceiveTab";
import { HistoryTab } from "./user/HistoryTab";
import { NotificationsTab } from "./user/NotificationsTab";
import { ProfileTab } from "./user/ProfileTab";
import { SecurityTab } from "./user/SecurityTab";
import { SettingsTab } from "./user/SettingsTab";
import type { Tab, UserProfile } from "./user/types";

export default function UserApp() {
  const [authed, setAuthed]           = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail]     = useState<string | null>(null);
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab]     = useState<Tab>("home");
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) { setAuthed(true); setUserEmail(data.session.user.email); }
      setCheckingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 파트너 계정이면 users 테이블에 생성하지 않고 어드민으로 이동
    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();
    if (partner) {
      await supabase.auth.signOut();
      window.location.href = "/admin";
      return;
    }

    // 일반 회원: 회원가입 시 auth에만 등록되므로 첫 로그인 시 users 레코드 생성
    const { data: existingUser } = await supabase
      .from("users").select("id").eq("auth_user_id", session.user.id).maybeSingle();
    if (!existingUser) {
      // users 테이블에 없으면 회원가입 경로로 온 것 → pending_approval 상태로 생성
      await supabase.from("users").insert({
        auth_user_id: session.user.id,
        email: session.user.email!,
        status: "pending_approval",
      }).catch(() => {});
    }

    const { data: user } = await supabase
      .from("users").select("*").eq("auth_user_id", session.user.id).single();
    if (!user) return;
    const { data: wallet } = await supabase
      .from("wallets").select("address").eq("user_id", user.id).eq("chain_name", "polygon").maybeSingle();
    setProfile({ ...user, wallet_address: wallet?.address ?? null });
  }, []);

  useEffect(() => { if (authed) loadProfile(); }, [authed, loadProfile]);

  const { t } = useI18n();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthed(false); setUserEmail(null); setProfile(null);
  };

  const navigate = (tab: Tab) => setActiveTab(tab);
  const goBack   = () => setActiveTab("home");

  if (checkingAuth) return <div className="min-h-screen bg-background flex items-center justify-center"><Spinner size={20} /></div>;
  if (!authed)      return <AuthScreen onAuth={() => setAuthed(true)} />;

  if (profile && profile.status === "pending_approval") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-sm bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center justify-center">
              <Clock size={28} className="text-[#f59e0b]" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-mono text-[16px] font-bold text-foreground uppercase tracking-widest">{t("pending_approval_title")}</h1>
            <p className="font-mono text-[13px] text-muted-foreground leading-relaxed">{t("pending_approval_desc")}</p>
          </div>
          <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-3">
            <p className="font-mono text-[13px] text-[#f59e0b]">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 border border-border text-muted-foreground font-mono text-[13px] uppercase tracking-widest rounded-sm hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2">
            <LogOut size={12} /> {t("sign_out")}
          </button>
        </div>
      </div>
    );
  }

  const BOTTOM_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "home",          label: t("tab_home"),          icon: Home },
    { id: "wallet",        label: t("tab_wallet"),        icon: Wallet },
    { id: "history",       label: t("tab_history"),       icon: History },
    { id: "notifications", label: t("tab_notifications"), icon: Bell },
    { id: "profile",       label: t("tab_profile"),       icon: User },
  ];

  const isSubPage = ["buy", "swap", "send", "receive", "security", "settings"].includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "home":          return <HomeTab profile={profile} onNavigate={navigate} />;
      case "wallet":        return <WalletTab profile={profile} onNavigate={navigate} onRefreshProfile={loadProfile} />;
      case "buy":           return <BuyTab profile={profile} onSuccess={() => { setHistoryRefresh((n) => n + 1); setActiveTab("history"); }} onBack={goBack} />;
      case "swap":          return <SwapTab onSuccess={() => { setHistoryRefresh((n) => n + 1); setActiveTab("history"); }} onBack={goBack} />;
      case "send":          return <SendTab onSuccess={() => { setHistoryRefresh((n) => n + 1); setActiveTab("history"); }} onBack={goBack} />;
      case "receive":       return <ReceiveTab onBack={goBack} />;
      case "history":       return <HistoryTab refresh={historyRefresh} />;
      case "notifications": return <NotificationsTab />;
      case "profile":       return <ProfileTab profile={profile} email={userEmail!} onNavigate={navigate} />;
      case "security":      return <SecurityTab onBack={() => setActiveTab("profile")} />;
      case "settings":      return <SettingsTab onBack={() => setActiveTab("profile")} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col max-w-lg mx-auto">
      <header className="sticky top-0 bg-background/95 backdrop-blur z-20 border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <ImageWithFallback src={headerLogo} alt="GSM Wallets" className="h-7 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] text-muted-foreground truncate max-w-[100px]">{userEmail}</span>
          <LanguageSwitcher />
          <button onClick={handleLogout} className="p-1.5 text-muted-foreground hover:text-[#ef4444] transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        {renderContent()}
      </main>

      {!isSubPage && (
        <nav className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-2 py-2 flex">
          {BOTTOM_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-sm transition-colors ${activeTab === id ? "text-[#8247e5]" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon size={18} strokeWidth={activeTab === id ? 2.5 : 1.75} />
              <span className="font-mono text-[12px] uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
