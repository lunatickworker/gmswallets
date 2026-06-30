import { useState, useEffect } from "react";
import {
  Activity, Users, Webhook, Route, Settings, Database,
  ChevronRight, AlertTriangle, Check, LogIn, Shield,
  Bell, MessageSquare, Percent, FileText, Settings2, ShoppingCart,
  ArrowLeftRight, Wallet, Send, CircleDollarSign,
  Globe, Cpu, Radio, Monitor, RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { StatusDot, Spinner, api } from "./admin/shared";
import { DashboardSection } from "./admin/sections-dashboard";
import { UsersSection, WalletsSection } from "./admin/sections-users";
import { PurchasesSection, SwapsSection, TransactionsSection } from "./admin/sections-transactions";
import { BlockchainSection, WebhooksSection } from "./admin/sections-monitoring";
import { NoticesSection, PushSection, SupportSection } from "./admin/sections-content";
import { PartnersSection, SettlementsSection, FeesSection } from "./admin/sections-partners";
import { CoinsSection, OpLogsSection, SysConfigSection, TransakSyncSection, TransakOrdersSection } from "./admin/sections-ops";
import { RoutesSection, ServicesSection, ConfigSection, LogsSection } from "./admin/sections-bff";

// ─── Login Gate ───────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      // Log admin login
      await supabase.from("admin_logs").insert({
        admin_email: data.user?.email ?? email,
        action: "admin_login",
        detail: { timestamp: new Date().toISOString() },
      });
      onLogin(data.user?.email ?? email);
    } catch (err: any) {
      setError(err.message ?? "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(130,71,229,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(130,71,229,0.6) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #8247e5 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #00d395 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-xl bg-[#8247e5] flex items-center justify-center mb-5 shadow-2xl shadow-[#8247e5]/40 ring-1 ring-[#8247e5]/30">
            <Shield size={26} className="text-white" />
          </div>
          <h1 className="font-['Barlow_Condensed'] text-3xl font-bold uppercase tracking-widest text-foreground mb-1">
            Admin Console
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-px w-12 bg-border" />
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">Polygon Wallet · BFF</span>
            <div className="h-px w-12 bg-border" />
          </div>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-sm p-8 shadow-2xl shadow-black/30">
          <div className="mb-6">
            <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase tracking-tight text-foreground mb-1">관리자 로그인</h2>
            <p className="font-mono text-[13px] text-muted-foreground">승인된 관리자 계정만 접근 가능합니다</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">이메일</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 text-muted-foreground flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                </div>
                <input
                  type="email" placeholder="admin@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-secondary border border-border rounded-sm pl-9 pr-3 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">비밀번호</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 text-muted-foreground flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                </div>
                <input
                  type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-secondary border border-border rounded-sm pl-9 pr-3 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2.5">
                <AlertTriangle size={11} className="text-[#ef4444] shrink-0" />
                <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#8247e5]/20"
            >
              {loading
                ? <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                : <LogIn size={13} />}
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">보안 정보</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: "🔒", label: "TLS 암호화" },
              { icon: "📋", label: "접근 기록" },
              { icon: "🛡", label: "2단계 인증" },
            ].map((item) => (
              <div key={item.label} className="bg-secondary/60 border border-border/50 rounded-sm px-3 py-2.5 flex flex-col items-center gap-1">
                <span className="text-base">{item.icon}</span>
                <span className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d395]" />
            <span className="font-mono text-[13px] text-muted-foreground">Supabase Connected</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <span className="font-mono text-[13px] text-muted-foreground">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Banner ─────────────────────────────────────────────────────────────

function SetupBanner({ onSetup }: { onSetup: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      await api("/setup", { method: "POST" });
      setDone(true);
      setTimeout(onSetup, 800);
    } catch { setLoading(false); }
  };
  return (
    <div className="flex items-center gap-3 bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-4 py-3 mb-5">
      {done ? <Check size={12} className="text-[#00d395]" /> : <AlertTriangle size={12} className="text-[#f59e0b]" />}
      <span className="font-mono text-[14px] text-muted-foreground flex-1">
        {done ? "DB 초기화 완료. 페이지를 새로고침합니다..." : "DB 테이블이 아직 생성되지 않았습니다. 초기화를 실행하세요."}
      </span>
      {!done && (
        <button onClick={run} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
          {loading ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : null}
          {loading ? "초기화 중..." : "DB 초기화"}
        </button>
      )}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

type NavSection =
  | "dashboard" | "users" | "wallets"
  | "purchases" | "swaps" | "transactions"
  | "blockchain" | "webhooks"
  | "notices" | "push" | "support"
  | "partners" | "settlements"
  | "fees" | "coins" | "oplogs" | "sysconfig"
  | "transak_sync" | "transak_orders"
  | "routes" | "services" | "config" | "logs";

const NAV_GROUPS = [
  {
    label: "개요",
    items: [
      { id: "dashboard" as NavSection, label: "대시보드", icon: Activity },
    ],
  },
  {
    label: "회원",
    items: [
      { id: "users" as NavSection, label: "회원관리", icon: Users },
      { id: "wallets" as NavSection, label: "지갑관리", icon: Wallet },
    ],
  },
  {
    label: "거래",
    items: [
      { id: "purchases" as NavSection, label: "구매 관리", icon: ShoppingCart },
      { id: "swaps" as NavSection, label: "스왑 관리", icon: ArrowLeftRight },
      { id: "transactions" as NavSection, label: "전체 거래", icon: Activity },
    ],
  },
  {
    label: "블록체인",
    items: [
      { id: "blockchain" as NavSection, label: "블록체인 모니터링", icon: Cpu },
      { id: "webhooks" as NavSection, label: "웹훅 이벤트", icon: Webhook },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { id: "notices" as NavSection, label: "공지관리", icon: Bell },
      { id: "push" as NavSection, label: "푸시관리", icon: Send },
      { id: "support" as NavSection, label: "고객센터", icon: MessageSquare },
    ],
  },
  {
    label: "파트너",
    items: [
      { id: "partners" as NavSection, label: "파트너 관리", icon: Users },
      { id: "settlements" as NavSection, label: "정산 관리", icon: CircleDollarSign },
      { id: "fees" as NavSection, label: "수수료 설정", icon: Percent },
    ],
  },
  {
    label: "운영",
    items: [
      { id: "coins" as NavSection, label: "코인 관리", icon: CircleDollarSign },
      { id: "oplogs" as NavSection, label: "운영 로그", icon: FileText },
      { id: "sysconfig" as NavSection, label: "시스템 설정", icon: Settings2 },
    ],
  },
  {
    label: "Transak",
    items: [
      { id: "transak_sync" as NavSection,   label: "Lookup 동기화", icon: RefreshCw },
      { id: "transak_orders" as NavSection, label: "주문/KYC 관리",  icon: ShoppingCart },
    ],
  },
  {
    label: "BFF",
    items: [
      { id: "routes" as NavSection, label: "API Routes", icon: Route },
      { id: "services" as NavSection, label: "Services", icon: Database },
      { id: "config" as NavSection, label: "Config & Flags", icon: Settings },
      { id: "logs" as NavSection, label: "Request Logs", icon: Globe },
    ],
  },
];

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: "대시보드",
  users: "회원관리",
  wallets: "지갑관리",
  purchases: "구매 관리",
  swaps: "스왑 관리",
  transactions: "전체 거래내역",
  blockchain: "블록체인 모니터링",
  webhooks: "웹훅 이벤트",
  notices: "공지관리",
  push: "푸시관리",
  support: "고객센터",
  partners: "파트너 관리",
  settlements: "정산 관리",
  fees: "수수료 설정",
  coins: "코인 관리",
  oplogs: "운영 로그",
  sysconfig: "시스템 설정",
  transak_sync: "Transak Lookup 동기화",
  transak_orders: "Transak 주문/KYC 관리",
  routes: "API Routes",
  services: "Service Health",
  config: "Config & Feature Flags",
  logs: "Request Logs",
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function AdminApp() {
  const [active, setActive] = useState<NavSection>("dashboard");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) setUserEmail(data.session.user.email);
      setCheckingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    api("/stats").then(() => setNeedsSetup(false)).catch(() => setNeedsSetup(true));
  }, [userEmail]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  if (checkingAuth) return <div className="min-h-screen bg-background flex items-center justify-center"><Spinner /></div>;
  if (!userEmail) return <LoginScreen onLogin={(email) => setUserEmail(email)} />;

  const renderSection = () => {
    switch (active) {
      case "dashboard":    return <DashboardSection />;
      case "users":        return <UsersSection adminEmail={userEmail} />;
      case "wallets":      return <WalletsSection />;
      case "purchases":    return <PurchasesSection />;
      case "swaps":        return <SwapsSection />;
      case "transactions": return <TransactionsSection />;
      case "blockchain":   return <BlockchainSection />;
      case "webhooks":     return <WebhooksSection />;
      case "notices":      return <NoticesSection adminEmail={userEmail} />;
      case "push":         return <PushSection adminEmail={userEmail} />;
      case "support":      return <SupportSection adminEmail={userEmail} />;
      case "partners":     return <PartnersSection />;
      case "settlements":  return <SettlementsSection />;
      case "fees":         return <FeesSection adminEmail={userEmail} />;
      case "coins":          return <CoinsSection adminEmail={userEmail} />;
      case "oplogs":         return <OpLogsSection />;
      case "sysconfig":      return <SysConfigSection adminEmail={userEmail} />;
      case "transak_sync":   return <TransakSyncSection adminEmail={userEmail} />;
      case "transak_orders": return <TransakOrdersSection />;
      case "routes":       return <RoutesSection />;
      case "services":     return <ServicesSection />;
      case "config":       return <ConfigSection />;
      case "logs":         return <LogsSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Barlow', sans-serif" }}>
      <header className="border-b border-border px-5 py-2.5 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-sm bg-[#8247e5] flex items-center justify-center shrink-0">
            <span className="text-white text-[13px] font-mono font-bold">W</span>
          </div>
          <span className="font-['Barlow_Condensed'] text-sm font-bold uppercase tracking-widest">Polygon Wallet</span>
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">Admin Console</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusDot status="online" />
          <span className="font-mono text-[13px] text-[#00d395]">Supabase Connected</span>
          <div className="h-4 w-px bg-border" />
          <span className="font-mono text-[13px] text-muted-foreground">{userEmail}</span>
          <button onClick={handleLogout} className="font-mono text-[13px] text-muted-foreground hover:text-[#ef4444] transition-colors">Sign out</button>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-52 shrink-0 border-r border-border sticky top-[41px] h-[calc(100vh-41px)] overflow-y-auto py-4 flex flex-col" style={{ scrollbarWidth: "none" }}>
          <div className="px-3 space-y-5 flex-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="px-2 mb-1.5 font-mono text-[12px] uppercase tracking-widest text-muted-foreground">{group.label}</div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.id;
                    return (
                      <button key={item.id} onClick={() => setActive(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-left transition-colors ${isActive ? "bg-[#8247e5]/15 text-[#8247e5]" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                        <Icon size={13} />
                        <span className="font-['Barlow'] text-sm font-medium">{item.label}</span>
                        {isActive && <ChevronRight size={10} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <main className="flex-1 p-6 min-w-0 overflow-y-auto">
          <div className="mb-5">
            <h1 className="font-['Barlow_Condensed'] text-2xl font-bold uppercase tracking-tight text-foreground">{SECTION_TITLES[active]}</h1>
          </div>
          {needsSetup && <SetupBanner onSetup={() => setNeedsSetup(false)} />}
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
