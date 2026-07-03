import { useState, useEffect } from "react";
import adminLoginLogo from "@/imports/gms_admin_login_logo.png";
import adminHeaderLogo from "@/imports/gms_wallet_admin_logo.png";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import {
  Activity, Users, Webhook, Route, Settings, Database,
  ChevronRight, AlertTriangle, Check, LogIn, Shield,
  Bell, MessageSquare, Percent, FileText, Settings2, ShoppingCart,
  ArrowLeftRight, Wallet, Send, CircleDollarSign,
  Globe, Cpu, Radio, Monitor, RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { StatusDot, Spinner, api, BASE } from "./admin/shared";
import { DashboardSection } from "./admin/sections-dashboard";
import { UsersSection, WalletsSection } from "./admin/sections-users";
import { PurchasesSection, SwapsSection, TransactionsSection } from "./admin/sections-transactions";
import { BlockchainSection, WebhooksSection } from "./admin/sections-monitoring";
import { NoticesSection, PushSection, SupportSection } from "./admin/sections-content";
import { PartnersSection, SettlementsSection, FeesSection } from "./admin/sections-partners";
import { CoinsSection, OpLogsSection, SysConfigSection, TransakSyncSection, TransakOrdersSection } from "./admin/sections-ops";
import { RoutesSection, ServicesSection, ConfigSection, LogsSection } from "./admin/sections-bff";
import { useI18n, LanguageSwitcher } from "../lib/i18n";

// ─── Login Gate ───────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (email: string, accessToken: string) => void }) {
  const { t } = useI18n();
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
      await supabase.from("admin_logs").insert({
        admin_email: data.user?.email ?? email,
        action: "admin_login",
        detail: { timestamp: new Date().toISOString() },
      });
      onLogin(data.user?.email ?? email, data.session?.access_token ?? "");
    } catch (err: any) {
      setError(err.message ?? t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(rgba(130,71,229,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(130,71,229,0.6) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #8247e5 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #00d395 0%, transparent 70%)" }} />

      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <ImageWithFallback src={adminLoginLogo} alt="GMS Wallet Admin Console" className="h-48 w-auto object-contain" />
        </div>

        <div className="bg-card border border-border rounded-sm p-8 shadow-2xl shadow-black/30">
          <div className="mb-6">
            <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase tracking-tight text-foreground mb-1">{t("admin_login_title")}</h2>
            <p className="font-mono text-[13px] text-muted-foreground">{t("admin_login_desc")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("email")}</label>
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
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("password")}</label>
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
              {loading ? t("logging_in") : t("login")}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("security_info")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: "🔒", labelKey: "tls_encrypt" as const },
              { icon: "📋", labelKey: "access_log" as const },
              { icon: "🛡", labelKey: "two_fa" as const },
            ].map((item) => (
              <div key={item.labelKey} className="bg-secondary/60 border border-border/50 rounded-sm px-3 py-2.5 flex flex-col items-center gap-1">
                <span className="text-base">{item.icon}</span>
                <span className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest text-center">{t(item.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d395]" />
            <span className="font-mono text-[13px] text-muted-foreground">Live</span>
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
  const { t } = useI18n();
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
        {done ? t("db_init_done") : t("db_init_needed")}
      </span>
      {!done && (
        <button onClick={run} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
          {loading ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : null}
          {loading ? t("db_init_loading") : t("db_init")}
        </button>
      )}
    </div>
  );
}

// ─── Role ─────────────────────────────────────────────────────────────────────

export type PartnerRole = "system_admin" | "master" | "distributor" | "store";

const ROLE_COLORS: Record<PartnerRole, string> = {
  system_admin: "#ef4444",
  master: "#8247e5",
  distributor: "#3b82f6",
  store: "#00d395",
};

const ROLE_ALLOWED: Record<PartnerRole, NavSection[]> = {
  system_admin: [
    "dashboard", "users", "wallets",
    "purchases", "swaps", "transactions",
    "blockchain", "webhooks",
    "notices", "push", "support",
    "partners", "settlements", "fees",
    "coins", "oplogs", "sysconfig",
    "transak_sync", "transak_orders",
    "routes", "services", "config", "logs",
  ],
  master: [
    "dashboard",
    "users", "wallets",
    "purchases", "swaps", "transactions",
    "notices", "push", "support",
    "partners", "settlements", "fees",
  ],
  distributor: [
    "dashboard",
    "users", "wallets",
    "purchases", "swaps", "transactions",
    "settlements",
  ],
  store: [
    "dashboard",
    "users", "wallets",
    "purchases", "swaps", "transactions",
    "settlements",
  ],
};

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

function buildNavGroups(t: (k: any) => string) {
  return [
    {
      label: t("nav_overview"),
      items: [
        { id: "dashboard" as NavSection, label: t("nav_dashboard"), icon: Activity },
      ],
    },
    {
      label: t("nav_members"),
      items: [
        { id: "users" as NavSection, label: t("nav_users"), icon: Users },
        { id: "wallets" as NavSection, label: t("nav_wallets"), icon: Wallet },
      ],
    },
    {
      label: t("nav_transactions"),
      items: [
        { id: "purchases" as NavSection, label: t("nav_purchases"), icon: ShoppingCart },
        { id: "swaps" as NavSection, label: t("nav_swaps"), icon: ArrowLeftRight },
        { id: "transactions" as NavSection, label: t("nav_all_tx"), icon: Activity },
      ],
    },
    {
      label: t("nav_blockchain"),
      items: [
        { id: "blockchain" as NavSection, label: t("nav_blockchain_monitor"), icon: Cpu },
        { id: "webhooks" as NavSection, label: t("nav_webhooks"), icon: Webhook },
      ],
    },
    {
      label: t("nav_content"),
      items: [
        { id: "notices" as NavSection, label: t("nav_notices"), icon: Bell },
        { id: "push" as NavSection, label: t("nav_push"), icon: Send },
        { id: "support" as NavSection, label: t("nav_support"), icon: MessageSquare },
      ],
    },
    {
      label: t("nav_partners"),
      items: [
        { id: "partners" as NavSection, label: t("nav_partners_mgmt"), icon: Users },
        { id: "settlements" as NavSection, label: t("nav_settlements"), icon: CircleDollarSign },
        { id: "fees" as NavSection, label: t("nav_fees"), icon: Percent },
      ],
    },
    {
      label: t("nav_ops"),
      items: [
        { id: "coins" as NavSection, label: t("nav_coins"), icon: CircleDollarSign },
        { id: "oplogs" as NavSection, label: t("nav_oplogs"), icon: FileText },
        { id: "sysconfig" as NavSection, label: t("nav_sysconfig"), icon: Settings2 },
      ],
    },
    {
      label: "Transak",
      items: [
        { id: "transak_sync" as NavSection, label: t("nav_transak_sync"), icon: RefreshCw },
        { id: "transak_orders" as NavSection, label: t("nav_transak_orders"), icon: ShoppingCart },
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
}

function filterNavGroups(groups: ReturnType<typeof buildNavGroups>, role: PartnerRole) {
  const allowed = new Set(ROLE_ALLOWED[role]);
  return groups
    .map((g) => ({ ...g, items: g.items.filter((item) => allowed.has(item.id)) }))
    .filter((g) => g.items.length > 0);
}

function getSectionTitle(active: NavSection, t: (k: any) => string): string {
  const map: Record<NavSection, string> = {
    dashboard: t("section_dashboard"),
    users: t("section_users"),
    wallets: t("section_wallets"),
    purchases: t("section_purchases"),
    swaps: t("section_swaps"),
    transactions: t("section_transactions"),
    blockchain: t("section_blockchain"),
    webhooks: t("section_webhooks"),
    notices: t("section_notices"),
    push: t("section_push"),
    support: t("section_support"),
    partners: t("section_partners"),
    settlements: t("section_settlements"),
    fees: t("section_fees"),
    coins: t("section_coins"),
    oplogs: t("section_oplogs"),
    sysconfig: t("section_sysconfig"),
    transak_sync: t("section_transak_sync"),
    transak_orders: t("section_transak_orders"),
    routes: "API Routes",
    services: "Service Health",
    config: "Config & Feature Flags",
    logs: "Request Logs",
  };
  return map[active];
}

function getRoleLabel(role: PartnerRole, t: (k: any) => string): string {
  const map: Record<PartnerRole, string> = {
    system_admin: t("role_system_admin"),
    master: t("role_master"),
    distributor: t("role_distributor"),
    store: t("role_store"),
  };
  return map[role];
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function AdminApp() {
  const { t } = useI18n();
  const [active, setActive] = useState<NavSection>("dashboard");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [partnerRole, setPartnerRole] = useState<PartnerRole>("system_admin");
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setAdminToken(session.access_token);
        try {
          const res = await fetch(`${BASE}/partners/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const info: { role: PartnerRole; partner: { id: string; name: string } | null } = await res.json();
          setPartnerRole(info.role ?? "system_admin");
          setPartnerName(info.partner?.name ?? null);
          setPartnerId(info.partner?.id ?? null);
          const allowed = ROLE_ALLOWED[info.role ?? "system_admin"];
          setActive(allowed[0] as NavSection);
        } catch { /* keep defaults */ }
      }
      setCheckingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setUserEmail(null); setPartnerRole("system_admin"); setPartnerName(null); setPartnerId(null); setAdminToken(null); }
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
    setPartnerRole("system_admin");
    setPartnerName(null);
    setPartnerId(null);
  };

  const allNavGroups = buildNavGroups(t);
  const navGroups = filterNavGroups(allNavGroups, partnerRole);

  if (checkingAuth) return <div className="min-h-screen bg-background flex items-center justify-center"><Spinner /></div>;

  const handleLogin = async (email: string, accessToken: string) => {
    setUserEmail(email);
    setAdminToken(accessToken);
    try {
      const res = await fetch(`${BASE}/partners/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: { role: PartnerRole; partner: { id: string; name: string } | null } = await res.json();
      setPartnerRole(data.role ?? "system_admin");
      setPartnerName(data.partner?.name ?? null);
      setPartnerId(data.partner?.id ?? null);
      const allowed = ROLE_ALLOWED[data.role ?? "system_admin"];
      setActive(allowed[0] as NavSection);
    } catch {
      setPartnerRole("system_admin");
    }
  };

  if (!userEmail) return <LoginScreen onLogin={handleLogin} />;

  const renderSection = () => {
    switch (active) {
      case "dashboard":    return <DashboardSection role={partnerRole} partnerId={partnerId} partnerName={partnerName} />;
      case "users":        return <UsersSection adminEmail={userEmail} role={partnerRole} partnerId={partnerId} />;
      case "wallets":      return <WalletsSection adminEmail={userEmail} adminToken={adminToken} role={partnerRole} />;
      case "purchases":    return <PurchasesSection />;
      case "swaps":        return <SwapsSection />;
      case "transactions": return <TransactionsSection />;
      case "blockchain":   return <BlockchainSection />;
      case "webhooks":     return <WebhooksSection />;
      case "notices":      return <NoticesSection adminEmail={userEmail} />;
      case "push":         return <PushSection adminEmail={userEmail} />;
      case "support":      return <SupportSection adminEmail={userEmail} />;
      case "partners":     return <PartnersSection role={partnerRole} partnerId={partnerId} partnerName={partnerName} />;
      case "settlements":  return <SettlementsSection />;
      case "fees":         return <FeesSection adminEmail={userEmail} role={partnerRole} partnerId={partnerId} />;
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
        <div className="flex items-center">
          <ImageWithFallback src={adminHeaderLogo} alt="GMS Wallet" className="h-7 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <StatusDot status="online" />
          <span className="font-mono text-[13px] text-[#00d395]">Live</span>
          <div className="h-4 w-px bg-border" />
          <span
            className="font-mono text-[11px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border"
            style={{ color: ROLE_COLORS[partnerRole], borderColor: `${ROLE_COLORS[partnerRole]}40`, backgroundColor: `${ROLE_COLORS[partnerRole]}15` }}
          >
            {getRoleLabel(partnerRole, t)}
          </span>
          <span className="font-mono text-[13px] text-muted-foreground">{partnerName ?? userEmail}</span>
          <LanguageSwitcher />
          <button onClick={handleLogout} className="font-mono text-[13px] text-muted-foreground hover:text-[#ef4444] transition-colors">{t("sign_out")}</button>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-52 shrink-0 border-r border-border sticky top-[41px] h-[calc(100vh-41px)] overflow-y-auto py-4 flex flex-col" style={{ scrollbarWidth: "none" }}>
          <div className="px-3 space-y-5 flex-1">
            {navGroups.map((group) => (
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
            <h1 className="font-['Barlow_Condensed'] text-2xl font-bold uppercase tracking-tight text-foreground">{getSectionTitle(active, t)}</h1>
          </div>
          {needsSetup && <SetupBanner onSetup={() => setNeedsSetup(false)} />}
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
