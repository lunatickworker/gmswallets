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
  User, X, Save, Eye, EyeOff, Copy, Download, Loader2, Plus,
} from "lucide-react";
import { ethers } from "ethers";
import { generateAllChainWallets } from "./user/wallet";
import { CHAINS_CONFIG, TOTAL_USD } from "./user/constants";
import { useUsdToKrw } from "./user/hooks";
import type { ChainWallet } from "./user/types";
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

function LoginScreen({ onLogin }: { onLogin: (email: string, accessToken: string) => Promise<void> }) {
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
      await onLogin(data.user?.email ?? email, data.session?.access_token ?? "");
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

// ─── Admin Create Wallet Modal ───────────────────────────────────────────────

type CreateStep = "intro" | "mnemonic" | "addresses" | "registering" | "done";

function AdminCreateWalletModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<CreateStep>("intro");
  const [mnemonic, setMnemonic] = useState("");
  const [wallets, setWallets] = useState<ChainWallet[]>([]);
  const [backed, setBacked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [error, setError] = useState("");

  const generate = () => {
    const w = ethers.Wallet.createRandom();
    const phrase = w.mnemonic!.phrase;
    setMnemonic(phrase);
    setWallets(generateAllChainWallets(phrase));
    setStep("mnemonic");
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadMnemonic = () => {
    const words = mnemonic.split(" ");
    const content = ["wallet seed phrase — KEEP SECURE", "", ...words.map((w, i) => `${String(i + 1).padStart(2, " ")}. ${w}`)].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wallet-seed-phrase-KEEP-SECURE.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1200);
  };

  const register = async () => {
    setStep("registering");
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요합니다.");
      const res = await fetch(`${BASE}/wallet/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ wallets }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "지갑 등록에 실패했습니다.");
      }
      setStep("done");
    } catch (err: any) {
      setError(err.message ?? "오류가 발생했습니다.");
      setStep("addresses");
    }
  };

  const words = mnemonic.split(" ");

  const stepTitle: Record<CreateStep, string> = {
    intro: "지갑 생성",
    mnemonic: "시드 구문 백업",
    addresses: "주소 확인",
    registering: "등록 중",
    done: "완료",
  };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-sm w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-[#8247e5]" />
            <span className="font-mono text-[11px] text-foreground uppercase tracking-widest font-bold">{stepTitle[step]}</span>
          </div>
          {step !== "registering" && step !== "done" && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {step === "intro" && (
            <>
              <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-[#f59e0b] shrink-0" />
                  <span className="font-mono text-[11px] text-[#f59e0b] font-bold uppercase tracking-widest">중요 안내</span>
                </div>
                <ul className="space-y-1.5 font-mono text-[12px] text-muted-foreground list-disc list-inside">
                  <li>시드 구문은 지갑의 마스터 키입니다.</li>
                  <li>서버에는 절대 저장되지 않습니다.</li>
                  <li>반드시 오프라인으로 안전하게 백업하세요.</li>
                  <li className="text-[#ef4444]">분실 시 복구가 불가능합니다.</li>
                </ul>
              </div>
              <div className="bg-secondary/60 border border-border rounded-sm p-4 space-y-2">
                <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">지원 체인</p>
                <div className="flex flex-wrap gap-1.5">
                  {CHAINS_CONFIG.map((c) => (
                    <span key={c.id} className="font-mono text-[11px] px-2 py-0.5 rounded-sm border"
                      style={{ color: c.color, borderColor: c.color + "40", backgroundColor: c.color + "10" }}>
                      {c.label}
                    </span>
                  ))}
                </div>
                <p className="font-mono text-[12px] text-muted-foreground">하나의 시드로 모든 체인 지갑을 생성합니다.</p>
              </div>
              <button onClick={generate}
                className="w-full py-3 bg-[#8247e5] hover:bg-[#8247e5]/80 text-white font-mono text-[13px] uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                <Plus size={13} /> 지갑 생성 시작
              </button>
            </>
          )}

          {step === "mnemonic" && (
            <>
              <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2.5">
                <AlertTriangle size={12} className="text-[#ef4444] shrink-0" />
                <span className="font-mono text-[12px] text-[#ef4444]">스크린샷 금지 — 직접 기록하세요</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {words.map((w, i) => (
                  <div key={i} className="bg-secondary border border-border rounded-sm px-3 py-2.5 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <span className="font-mono text-[12px] text-foreground font-bold">{w}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={copyMnemonic}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border rounded-sm font-mono text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <Check size={12} className="text-[#00d395]" /> : <Copy size={12} />}
                  {copied ? "복사됨" : "복사"}
                </button>
                <button onClick={downloadMnemonic}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border rounded-sm font-mono text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  <Download size={12} /> TXT 다운로드
                </button>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${backed ? "bg-[#00d395] border-[#00d395]" : "border-border bg-secondary"}`}
                  onClick={() => setBacked((v) => !v)}>
                  {backed && <Check size={10} className="text-background" />}
                </div>
                <span className="font-mono text-[12px] text-muted-foreground" onClick={() => setBacked((v) => !v)}>
                  시드 구문을 안전하게 백업했습니다.
                </span>
              </label>
              <button onClick={() => setStep("addresses")} disabled={!backed}
                className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-40 text-white font-mono text-[13px] uppercase tracking-widest rounded-sm transition-colors">
                다음 — 주소 확인
              </button>
            </>
          )}

          {step === "addresses" && (
            <>
              <p className="font-mono text-[12px] text-muted-foreground">시드 구문에서 파생된 주소입니다.</p>
              {error && (
                <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
                  <AlertTriangle size={11} className="text-[#ef4444] shrink-0" />
                  <span className="font-mono text-[12px] text-[#ef4444]">{error}</span>
                </div>
              )}
              <div className="space-y-2">
                {CHAINS_CONFIG.map((c) => {
                  const entry = wallets.find((w) => w.chain_name === c.id);
                  const addr = entry?.address ?? "";
                  return (
                    <div key={c.id} className="bg-secondary border border-border rounded-sm px-3 py-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-background shrink-0" style={{ backgroundColor: c.color }}>
                          {c.symbol.slice(0, 1)}
                        </div>
                        <span className="font-mono text-[12px] font-bold" style={{ color: c.color }}>{c.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground flex-1">{c.path}</span>
                        <button onClick={() => copyAddr(addr)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                          {copiedAddr === addr ? <Check size={11} className="text-[#00d395]" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground break-all pl-7">{addr}</div>
                    </div>
                  );
                })}
              </div>
              <button onClick={register}
                className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 text-white font-mono text-[13px] uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                <Wallet size={13} /> 지갑 등록
              </button>
            </>
          )}

          {step === "registering" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 size={28} className="text-[#8247e5] animate-spin" />
              <p className="font-mono text-[13px] text-muted-foreground">지갑을 등록하는 중...</p>
            </div>
          )}

          {step === "done" && (
            <>
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-14 h-14 rounded-full bg-[#00d395]/10 flex items-center justify-center">
                  <Check size={26} className="text-[#00d395]" />
                </div>
                <p className="font-mono text-[13px] font-bold uppercase tracking-widest text-foreground">지갑 생성 완료</p>
                <p className="font-mono text-[12px] text-muted-foreground text-center">주소가 계정에 등록되었습니다.</p>
              </div>
              <div className="space-y-1.5">
                {CHAINS_CONFIG.map((c) => {
                  const addr = wallets.find((w) => w.chain_name === c.id)?.address ?? "";
                  return (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-sm">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-background shrink-0" style={{ backgroundColor: c.color }}>{c.symbol.slice(0, 1)}</div>
                      <span className="font-mono text-[11px] font-bold shrink-0" style={{ color: c.color }}>{c.label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground flex-1 truncate">{addr.slice(0, 12)}...{addr.slice(-6)}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={onSuccess}
                className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 text-white font-mono text-[13px] uppercase tracking-widest rounded-sm transition-colors">
                확인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── My Profile Modal ────────────────────────────────────────────────────────

function MyProfileModal({
  email,
  userId,
  partnerRole,
  partnerName,
  onClose,
}: {
  email: string;
  userId: string | null;
  partnerRole: PartnerRole;
  partnerName: string | null;
  onClose: () => void;
}) {
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [wallets, setWallets] = useState<{ chain_name: string; address: string }[]>([]);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showKrw, setShowKrw] = useState(false);
  const { rate, loading: rateLoading } = useUsdToKrw();

  const loadWallets = (uid: string) => {
    supabase
      .from("wallets")
      .select("chain_name, address")
      .eq("user_id", uid)
      .then(({ data }) => setWallets(data ?? []));
  };

  useEffect(() => {
    if (!userId) return;
    loadWallets(userId);
  }, [userId]);

  const roleColors: Record<PartnerRole, string> = {
    system_admin: "#ef4444",
    master: "#8247e5",
    distributor: "#3b82f6",
    store: "#00d395",
  };
  const roleLabels: Record<PartnerRole, string> = {
    system_admin: "System Admin",
    master: "Master",
    distributor: "Distributor",
    store: "Store",
  };

  const initials = email.slice(0, 2).toUpperCase();

  const handlePasswordChange = async () => {
    setPwError("");
    if (pwForm.next.length < 8) { setPwError("비밀번호는 최소 8자 이상이어야 합니다."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("비밀번호가 일치하지 않습니다."); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      setPwForm({ current: "", next: "", confirm: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err: any) {
      setPwError(err.message ?? "비밀번호 변경에 실패했습니다.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="fixed top-[41px] right-3 z-50 w-[340px] animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="bg-card border border-border rounded-sm shadow-2xl shadow-black/40 ring-1 ring-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-sm flex items-center justify-center font-mono text-[13px] font-bold text-white shrink-0"
              style={{ backgroundColor: roleColors[partnerRole] }}
            >
              {initials}
            </div>
            <div>
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">My Profile</div>
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{email}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Total Assets */}
        <div className="px-5 py-4 border-b border-border bg-secondary/30">
          <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-2">총 자산</div>
          <button onClick={() => setShowKrw((v) => !v)} className="text-left group w-full">
            <div className="font-['Barlow_Condensed'] text-3xl font-bold text-foreground group-hover:text-[#8247e5]/80 transition-colors">
              {showKrw
                ? `₩${(TOTAL_USD * rate).toLocaleString("ko-KR")}`
                : `$${TOTAL_USD.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </div>
            <div className="font-mono text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {showKrw
                ? `$${TOTAL_USD.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : `₩${(TOTAL_USD * rate).toLocaleString("ko-KR")}`}
              <span className="text-[11px] opacity-50">
                {rateLoading ? "환율 로딩 중…" : `@${rate.toLocaleString("ko-KR")}원`}
              </span>
            </div>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Account Info */}
          <div className="space-y-2">
            <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">계정 정보</div>
            <div className="bg-secondary rounded-sm border border-border divide-y divide-border">
              <div className="flex justify-between items-center px-3 py-2.5">
                <span className="font-mono text-[12px] text-muted-foreground">Email</span>
                <span className="font-mono text-[13px] text-foreground">{email}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2.5">
                <span className="font-mono text-[12px] text-muted-foreground">Role</span>
                <span
                  className="font-mono text-[13px] font-bold uppercase tracking-widest"
                  style={{ color: roleColors[partnerRole] }}
                >
                  {roleLabels[partnerRole]}
                </span>
              </div>
              {partnerName && (
                <div className="flex justify-between items-center px-3 py-2.5">
                  <span className="font-mono text-[12px] text-muted-foreground">파트너</span>
                  <span className="font-mono text-[13px] text-foreground font-bold">{partnerName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Addresses */}
          {/* Wallet Addresses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                지갑 주소 {wallets.length > 0 && `(${wallets.length})`}
              </div>
              {wallets.length === 0 && (
                <button
                  onClick={() => setShowCreateWallet(true)}
                  className="flex items-center gap-1 font-mono text-[11px] text-[#8247e5] hover:text-[#8247e5]/70 transition-colors uppercase tracking-widest"
                >
                  <Plus size={11} /> 지갑 생성
                </button>
              )}
            </div>
            {wallets.length > 0 ? (
              <div className="bg-secondary rounded-sm border border-border divide-y divide-border">
                {wallets.map((w) => (
                  <div key={w.chain_name} className="flex items-center justify-between px-3 py-2.5 gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground uppercase w-16 shrink-0">{w.chain_name}</span>
                    <span className="font-mono text-[11px] text-foreground truncate flex-1 text-right">
                      {w.address.slice(0, 10)}...{w.address.slice(-6)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(w.address);
                        setCopiedAddr(w.chain_name);
                        setTimeout(() => setCopiedAddr(null), 1500);
                      }}
                      className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    >
                      {copiedAddr === w.chain_name ? <Check size={11} /> : <span className="font-mono text-[10px]">COPY</span>}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => setShowCreateWallet(true)}
                className="flex items-center justify-center gap-2 px-3 py-4 bg-secondary/50 border border-dashed border-border rounded-sm cursor-pointer hover:border-[#8247e5]/40 hover:bg-[#8247e5]/5 transition-colors group"
              >
                <Wallet size={13} className="text-muted-foreground group-hover:text-[#8247e5] transition-colors" />
                <span className="font-mono text-[12px] text-muted-foreground group-hover:text-[#8247e5] transition-colors">지갑이 없습니다. 클릭하여 생성</span>
              </div>
            )}
          </div>

          {showCreateWallet && (
            <AdminCreateWalletModal
              onClose={() => setShowCreateWallet(false)}
              onSuccess={() => {
                setShowCreateWallet(false);
                if (userId) loadWallets(userId);
              }}
            />
          )}

          {/* Password Change */}
          <div className="space-y-2">
            <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">비밀번호 변경</div>
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="새 비밀번호 (최소 8자)"
                  value={pwForm.next}
                  autoComplete="new-password"
                  onChange={(e) => { setPwForm({ ...pwForm, next: e.target.value }); setPwError(""); }}
                  className="w-full bg-secondary border border-border rounded-sm px-3 pr-9 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <input
                type="password"
                placeholder="새 비밀번호 확인"
                value={pwForm.confirm}
                autoComplete="new-password"
                onChange={(e) => { setPwForm({ ...pwForm, confirm: e.target.value }); setPwError(""); }}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50"
              />
              {pwError && <div className="font-mono text-[12px] text-[#ef4444]">{pwError}</div>}
              {pwSaved && <div className="font-mono text-[12px] text-[#00d395]">비밀번호가 변경되었습니다.</div>}
              <button
                onClick={handlePasswordChange}
                disabled={pwSaving || !pwForm.next}
                className="w-full py-2.5 border border-[#8247e5]/40 text-[#8247e5] font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/10 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {pwSaving
                  ? <span className="w-3 h-3 border border-[#8247e5]/40 border-t-[#8247e5] rounded-full animate-spin inline-block" />
                  : pwSaved ? <Check size={13} /> : <Save size={13} />}
                {pwSaved ? "변경 완료" : "비밀번호 변경"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* 외부 클릭 시 닫기 */}
      <div className="fixed inset-0 z-[-1]" onClick={onClose} />
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
  const [userId, setUserId] = useState<string | null>(null);
  const [partnerRole, setPartnerRole] = useState<PartnerRole>("system_admin");
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
        setAdminToken(session.access_token);
        try {
          const res = await fetch(`${BASE}/partners/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!res.ok) {
            await supabase.auth.signOut();
            setUserEmail(null);
            setCheckingAuth(false);
            return;
          }
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
      if (!session) { setUserEmail(null); setUserId(null); setPartnerRole("system_admin"); setPartnerName(null); setPartnerId(null); setAdminToken(null); }
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
    setUserId(null);
    setPartnerRole("system_admin");
    setPartnerName(null);
    setPartnerId(null);
  };

  const allNavGroups = buildNavGroups(t);
  const navGroups = filterNavGroups(allNavGroups, partnerRole);

  if (checkingAuth) return <div className="min-h-screen bg-background flex items-center justify-center"><Spinner /></div>;

  const handleLogin = async (email: string, accessToken: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch(`${BASE}/partners/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      await supabase.auth.signOut();
      throw new Error("관리자 권한이 없는 계정입니다.");
    }
    const data: { role: PartnerRole; partner: { id: string; name: string } | null } = await res.json();
    setUserEmail(email);
    setAdminToken(accessToken);
    if (user?.id) setUserId(user.id);
    setPartnerRole(data.role ?? "system_admin");
    setPartnerName(data.partner?.name ?? null);
    setPartnerId(data.partner?.id ?? null);
    const allowed = ROLE_ALLOWED[data.role ?? "system_admin"];
    setActive(allowed[0] as NavSection);
  };

  if (!userEmail) return <LoginScreen onLogin={handleLogin} />;

  const renderSection = () => {
    switch (active) {
      case "dashboard":    return <DashboardSection role={partnerRole} partnerId={partnerId} partnerName={partnerName} />;
      case "users":        return <UsersSection adminEmail={userEmail} adminToken={adminToken} role={partnerRole} partnerId={partnerId} />;
      case "wallets":      return <WalletsSection adminEmail={userEmail} adminToken={adminToken} role={partnerRole} partnerId={partnerId} />;
      case "purchases":    return <PurchasesSection adminToken={adminToken} />;
      case "swaps":        return <SwapsSection adminToken={adminToken} />;
      case "transactions": return <TransactionsSection adminToken={adminToken} />;
      case "blockchain":   return <BlockchainSection />;
      case "webhooks":     return <WebhooksSection />;
      case "notices":      return <NoticesSection adminEmail={userEmail} />;
      case "push":         return <PushSection adminEmail={userEmail} />;
      case "support":      return <SupportSection adminEmail={userEmail} />;
      case "partners":     return <PartnersSection adminToken={adminToken} role={partnerRole} partnerId={partnerId} partnerName={partnerName} />;
      case "settlements":  return <SettlementsSection adminToken={adminToken} />;
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
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            title="My Profile"
          >
            <User size={13} />
            <span>{partnerName ?? userEmail}</span>
          </button>
          <LanguageSwitcher />
          <button onClick={handleLogout} className="font-mono text-[13px] text-muted-foreground hover:text-[#ef4444] transition-colors">{t("sign_out")}</button>
        </div>
      </header>
      {showProfile && userEmail && (
        <MyProfileModal
          email={userEmail}
          userId={userId}
          partnerRole={partnerRole}
          partnerName={partnerName}
          onClose={() => setShowProfile(false)}
        />
      )}

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
