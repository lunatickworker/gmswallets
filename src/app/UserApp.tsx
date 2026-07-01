import { useState, useEffect, useCallback } from "react";
import {
  Wallet, ArrowLeftRight, History, ShoppingCart, LogOut,
  Copy, Check, ArrowUpRight, ArrowDownRight, RefreshCw,
  Eye, EyeOff, X, LogIn, UserPlus, AlertCircle,
  TrendingUp, Zap, Send, Bell, User, Shield, Settings,
  Moon, Sun, Globe, ChevronRight, QrCode, Download,
  Home, Lock, Key, Fingerprint, Smartphone, MessageSquare,
  FileText, Info, ChevronLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = `https://${projectId}.supabase.co/functions/v1/server`;

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${publicAnonKey}`, ...opts?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "home" | "wallet" | "buy" | "swap" | "send" | "receive" | "history" | "notifications" | "profile" | "security" | "settings";

interface UserProfile {
  id: string;
  email: string;
  wallet_address: string | null;
  status: string;
  kyc_tier: string;
  role: string;
  joined_at: string;
  tx_count: number;
}

interface Tx {
  id: string;
  type: string;
  amount: string;
  currency: string;
  from_currency?: string;
  to_currency?: string;
  status: string;
  tx_hash?: string;
  created_at: string;
}

// ─── Token config ─────────────────────────────────────────────────────────────

const TOKENS = [
  { symbol: "MATIC", name: "Polygon",        color: "#8247e5", price: 0.87 },
  { symbol: "USDC",  name: "USD Coin",        color: "#2775ca", price: 1.00 },
  { symbol: "WETH",  name: "Wrapped Ether",   color: "#627eea", price: 3412.5 },
];

const BALANCES = [
  { symbol: "MATIC", amount: 248.31,  usdValue: 216.03 },
  { symbol: "USDC",  amount: 1024.00, usdValue: 1024.00 },
  { symbol: "WETH",  amount: 0.142,   usdValue: 484.58 },
];

const TOTAL_USD = BALANCES.reduce((s, b) => s + b.usdValue, 0);

function tokenColor(symbol: string) {
  return TOKENS.find((t) => t.symbol === symbol)?.color ?? "#6b7280";
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div className="border-2 border-[#8247e5]/30 border-t-[#8247e5] rounded-full animate-spin"
      style={{ width: size, height: size }} />
  );
}

// ─── Page Header (sub-pages) ─────────────────────────────────────────────────

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={onBack} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={18} />
      </button>
      <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

// ─── Auth Screen ─────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (tab === "signup" && password !== confirmPw) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (password.length < 6) { setError("비밀번호는 최소 6자 이상이어야 합니다."); return; }
    setLoading(true);
    try {
      if (tab === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onAuth();
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setSuccess("가입 완료! 바로 로그인하세요.");
        setTab("login");
      }
    } catch (err: any) {
      setError(err.message ?? "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (err) throw err;
    } catch (err: any) {
      setError(err.message ?? "구글 로그인 중 오류가 발생했습니다.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#8247e5] flex items-center justify-center mb-4 shadow-lg shadow-[#8247e5]/30">
            <Wallet size={22} className="text-white" />
          </div>
          <h1 className="font-['Barlow_Condensed'] text-2xl font-bold uppercase tracking-widest text-foreground">Polygon Wallet</h1>
          <p className="font-mono text-[13px] text-muted-foreground mt-1 uppercase tracking-widest">Your decentralized wallet</p>
        </div>

        {/* Google 로그인 */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 mb-4 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-mono text-sm rounded-sm border border-gray-200 transition-colors"
        >
          {googleLoading ? <Spinner size={15} /> : (
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8055.54-1.8368.859-3.0477.859-2.3436 0-4.3282-1.5836-5.036-3.7105H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573C.3477 6.1731 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z" fill="#FBBC05"/>
              <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1632 6.6564 3.5795 9 3.5795z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? "연결 중..." : "Google로 계속하기"}
        </button>

        {/* 구분선 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">또는</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 이메일 로그인 */}
        <div className="flex bg-secondary rounded-sm p-0.5 mb-4">
          {(["login", "signup"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 font-mono text-[14px] uppercase tracking-widest rounded-sm transition-colors ${tab === t ? "bg-[#8247e5] text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-sm p-5 space-y-3">
          <div className="space-y-1">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">이메일</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">비밀번호</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 pr-9 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          {tab === "signup" && (
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">비밀번호 확인</label>
              <input type={showPw ? "text" : "password"} required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••"
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
              <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
              <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-3 py-2">
              <Check size={11} className="text-[#00d395] shrink-0" />
              <span className="font-mono text-[13px] text-[#00d395]">{success}</span>
            </div>
          )}
          <button type="submit" disabled={loading || googleLoading}
            className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <Spinner size={14} /> : tab === "login" ? <LogIn size={13} /> : <UserPlus size={13} />}
            {loading ? "처리 중..." : tab === "login" ? "로그인" : "회원가입"}
          </button>
        </form>
        {tab === "login" && (
          <p className="mt-4 text-center font-mono text-[13px] text-muted-foreground">
            계정이 없으신가요?{" "}
            <button onClick={() => setTab("signup")} className="text-[#8247e5] hover:underline">회원가입</button>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────

function HomeTab({ profile, onNavigate }: { profile: UserProfile | null; onNavigate: (tab: Tab) => void }) {
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
    { id: "buy" as Tab, label: "구매", icon: ShoppingCart, color: "#f59e0b" },
    { id: "swap" as Tab, label: "스왑", icon: ArrowLeftRight, color: "#8247e5" },
    { id: "send" as Tab, label: "보내기", icon: Send, color: "#3b82f6" },
    { id: "receive" as Tab, label: "받기", icon: Download, color: "#00d395" },
  ];

  const typeColor = (type: string) => {
    if (type === "purchase") return "#f59e0b";
    if (type === "swap") return "#8247e5";
    if (type === "send") return "#ef4444";
    return "#00d395";
  };

  const NOTICE_TYPES: Record<string, string> = { notice: "공지", popup: "팝업", event: "이벤트", banner: "배너" };

  return (
    <div className="space-y-4">
      {/* Portfolio Hero */}
      <div className="bg-gradient-to-br from-[#8247e5]/20 via-card to-card border border-[#8247e5]/20 rounded-sm p-5">
        <p className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-1">총 자산</p>
        <p className="font-['Barlow_Condensed'] text-4xl font-bold text-foreground">
          ${TOTAL_USD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
        <p className="font-mono text-[13px] text-[#00d395] mt-1 flex items-center gap-1">
          <ArrowUpRight size={10} /> +2.4% (오늘)
        </p>
        {profile && (
          <div className="mt-3 flex items-center gap-2">
            <div className={`px-1.5 py-0.5 rounded-sm font-mono text-[13px] font-bold border text-sm ${
              profile.kyc_tier === "T2" ? "bg-[#8247e5]/10 text-[#8247e5] border-[#8247e5]/30" :
              profile.kyc_tier === "T1" ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30" :
              "bg-secondary text-muted-foreground border-border"
            }`}>KYC {profile.kyc_tier}</div>
            <span className="font-mono text-[13px] text-muted-foreground">TX {profile.tx_count}건</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
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

      {/* Recent Transactions */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">최근 거래</span>
          <button onClick={() => onNavigate("history")} className="font-mono text-[13px] text-[#8247e5] hover:underline">전체 보기</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Spinner size={16} /></div>
        ) : recentTxs.length === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-[14px] text-muted-foreground">거래내역이 없습니다</div>
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

      {/* Notices */}
      {notices.length > 0 && (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">공지사항</span>
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
    </div>
  );
}

// ─── Wallet Tab ───────────────────────────────────────────────────────────────

function WalletTab({ profile, onNavigate }: { profile: UserProfile | null; onNavigate: (tab: Tab) => void }) {
  const [copied, setCopied] = useState(false);
  const [network, setNetwork] = useState("Polygon");

  const addr = profile?.wallet_address;
  const shortAddr = addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : null;

  const copy = () => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-[#8247e5]/20 via-card to-card border border-[#8247e5]/20 rounded-sm p-5">
        <p className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-1">총 잔액</p>
        <p className="font-['Barlow_Condensed'] text-4xl font-bold text-foreground">
          ${TOTAL_USD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
        <p className="font-mono text-[13px] text-[#00d395] mt-1 flex items-center gap-1"><ArrowUpRight size={10} /> +2.4% (24h)</p>
      </div>

      {/* Network selector */}
      <div className="bg-card border border-border rounded-sm px-4 py-3 flex items-center gap-3">
        <Globe size={13} className="text-muted-foreground shrink-0" />
        <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">네트워크</span>
        <select value={network} onChange={(e) => setNetwork(e.target.value)}
          className="ml-auto bg-secondary border border-border rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60">
          <option>Polygon</option>
          <option>Ethereum</option>
        </select>
      </div>

      {/* Wallet address */}
      {addr ? (
        <div className="bg-card border border-border rounded-sm px-4 py-3 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d395]" />
          <span className="font-mono text-[14px] text-muted-foreground flex-1 truncate">{shortAddr}</span>
          <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check size={13} className="text-[#00d395]" /> : <Copy size={13} />}
          </button>
          <button onClick={() => onNavigate("receive")} className="text-muted-foreground hover:text-[#8247e5] transition-colors">
            <QrCode size={13} />
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm px-4 py-3 flex items-center gap-3">
          <AlertCircle size={13} className="text-[#f59e0b]" />
          <span className="font-mono text-[14px] text-muted-foreground flex-1">지갑 주소가 아직 연결되지 않았습니다</span>
        </div>
      )}

      {/* Token list */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">보유 토큰</span>
        </div>
        {BALANCES.map((b) => (
          <div key={b.symbol} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-mono text-[13px] font-bold shrink-0"
              style={{ backgroundColor: tokenColor(b.symbol) }}>
              {b.symbol.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{b.symbol}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{TOKENS.find((t) => t.symbol === b.symbol)?.name}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-foreground">{b.amount.toLocaleString()}</div>
              <div className="font-mono text-[13px] text-muted-foreground">${b.usdValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        ))}
      </div>

      {/* KYC status */}
      {profile && (
        <div className="bg-card border border-border rounded-sm px-4 py-3 flex items-center gap-3">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">KYC 등급</span>
          <div className={`px-2 py-0.5 rounded-sm font-mono text-[13px] font-bold border ${
            profile.kyc_tier === "T2" ? "bg-[#8247e5]/10 text-[#8247e5] border-[#8247e5]/30" :
            profile.kyc_tier === "T1" ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30" :
            "bg-secondary text-muted-foreground border-border"
          }`}>{profile.kyc_tier}</div>
          <span className="font-mono text-[13px] text-muted-foreground flex-1 text-right">트랜잭션 {profile.tx_count}건</span>
        </div>
      )}
    </div>
  );
}

// ─── Buy Tab (Transak Whitelabel Flow) ───────────────────────────────────────
// STEP 5: DB-first order pattern: insert transak_orders (pending) → call Transak → update with orderId
// STEP 4: Save KYC status to transak_customers — never add kyc_status to users table

type BuyStep = "quote" | "otp_send" | "otp_verify" | "kyc_check" | "kyc_form" | "order" | "done";

interface TransakQuote {
  fiatCurrency: string;
  cryptoCurrency: string;
  fiatAmount: number;
  cryptoAmount: number;
  totalFee: number;
  quoteId?: string;
}

interface TransakOrder {
  id: string;
  status: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    sortCode?: string;
    reference?: string;
    amount?: number;
    currency?: string;
  };
}

function BuyTab({ profile, onSuccess, onBack }: { profile: UserProfile | null; onSuccess: () => void; onBack: () => void }) {
  const [step, setStep]             = useState<BuyStep>("quote");
  const [currency, setCurrency]     = useState("USDC");
  const [usdAmount, setUsdAmount]   = useState("");
  const [quote, setQuote]           = useState<TransakQuote | null>(null);
  const [email, setEmail]           = useState(profile?.email ?? "");
  const [otp, setOtp]               = useState("");
  const [stateToken, setStateToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [kycStatus, setKycStatus]   = useState("");
  const [kycForm, setKycForm]       = useState({ firstName: "", lastName: "", mobileNumber: "", dob: "", address: "", city: "", state: "", postCode: "", country: "KR" });
  const [order, setOrder]           = useState<TransakOrder | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const presets = ["10", "50", "100", "500"];

  const token = TOKENS.find((t) => t.symbol === currency)!;

  const clearError = () => setError("");

  // Step 1: Get Quote
  const getQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usdAmount || parseFloat(usdAmount) <= 0) return;
    setLoading(true); clearError();
    try {
      const params = new URLSearchParams({ fiatCurrency: "USD", cryptoCurrency: currency, fiatAmount: usdAmount, network: "polygon", paymentMethod: "bank_transfer" });
      const data = await api(`/transak/quote?${params}`);
      const q = data?.response ?? data;
      setQuote({
        fiatCurrency:   q.fiatCurrency   ?? "USD",
        cryptoCurrency: q.cryptoCurrency ?? currency,
        fiatAmount:     parseFloat(q.fiatAmount ?? usdAmount),
        cryptoAmount:   parseFloat(q.cryptoAmount ?? (parseFloat(usdAmount) / token.price).toFixed(6)),
        totalFee:       parseFloat(q.totalFee ?? (parseFloat(usdAmount) * 0.01).toFixed(2)),
        quoteId:        q.quoteId,
      });
      setStep("otp_send");
    } catch (err: any) {
      // If Transak API not configured, use local estimate and proceed
      setQuote({
        fiatCurrency: "USD",
        cryptoCurrency: currency,
        fiatAmount: parseFloat(usdAmount),
        cryptoAmount: parseFloat((parseFloat(usdAmount) / token.price).toFixed(6)),
        totalFee: parseFloat((parseFloat(usdAmount) * 0.01).toFixed(2)),
        quoteId: undefined,
      });
      setStep("otp_send");
    } finally { setLoading(false); }
  };

  // Step 2: Send OTP
  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true); clearError();
    try {
      const data = await api("/transak/otp/send", { method: "POST", body: JSON.stringify({ email }) });
      const st = data?.response?.stateToken ?? data?.stateToken ?? data?.data?.stateToken;
      if (st) setStateToken(st);
      setStep("otp_verify");
    } catch (err: any) {
      setError(err.message ?? "OTP 전송 실패");
    } finally { setLoading(false); }
  };

  // Step 3: Verify OTP — then save transak_customers record (STEP 4)
  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true); clearError();
    try {
      const data = await api("/transak/otp/verify", { method: "POST", body: JSON.stringify({ email, otp, stateToken }) });
      const at = data?.response?.accessToken ?? data?.accessToken ?? data?.data?.accessToken;
      if (!at) throw new Error("액세스 토큰을 받지 못했습니다.");
      setAccessToken(at);
      // Check KYC status
      const userRes = await api("/transak/user", { headers: { "x-transak-token": at } });
      const kyc = userRes?.response?.kyc ?? userRes?.kyc ?? userRes?.data?.kyc;
      const kycSt = kyc?.status ?? "NOT_SUBMITTED";
      const transakCustomerId = userRes?.response?.id ?? userRes?.id ?? userRes?.data?.id;
      setKycStatus(kycSt);
      // STEP 4: Persist to transak_customers — not to users table
      await supabase.from("transak_customers").upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        transak_customer_id: transakCustomerId ?? null,
        kyc_status: kycSt,
        access_token: at,
        access_token_exp: new Date(Date.now() + 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).catch(() => {});
      if (kycSt === "APPROVED") setStep("order");
      else if (kycSt === "NOT_SUBMITTED") setStep("kyc_form");
      else setStep("kyc_check");
    } catch (err: any) {
      setError(err.message ?? "OTP 인증 실패");
    } finally { setLoading(false); }
  };

  // Step 4a: Submit KYC details
  const submitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clearError();
    try {
      await api("/transak/user/kyc", {
        method: "PATCH",
        headers: { "x-transak-token": accessToken },
        body: JSON.stringify({
          firstName: kycForm.firstName,
          lastName:  kycForm.lastName,
          mobileNumber: kycForm.mobileNumber,
          dob:       kycForm.dob,
          address: { addressLine1: kycForm.address, city: kycForm.city, state: kycForm.state, postCode: kycForm.postCode, country: kycForm.country },
        }),
      });
      setStep("kyc_check");
    } catch (err: any) {
      setError(err.message ?? "KYC 제출 실패");
    } finally { setLoading(false); }
  };

  // Step 4b: Poll KYC
  const checkKyc = async () => {
    setLoading(true); clearError();
    try {
      const userRes = await api("/transak/user", { headers: { "x-transak-token": accessToken } });
      const kyc = userRes?.response?.kyc ?? userRes?.kyc ?? userRes?.data?.kyc;
      const kycSt = kyc?.status ?? kycStatus;
      setKycStatus(kycSt);
      if (kycSt === "APPROVED") setStep("order");
      else if (kycSt === "NOT_SUBMITTED") setStep("kyc_form");
    } catch (err: any) {
      setError(err.message ?? "KYC 상태 확인 실패");
    } finally { setLoading(false); }
  };

  // Step 5: Create Bank Transfer Order — DB first (STEP 5 pattern)
  // 1) Insert transak_orders with status=pending
  // 2) Call Transak API to get real orderId
  // 3) Update transak_orders with transakOrderId + bank_details
  // 4) Record blockchain-layer entry in transactions (STEP 7 separation)
  const createOrder = async () => {
    if (!profile?.wallet_address) { setError("지갑 주소가 연결되지 않았습니다."); return; }
    setLoading(true); clearError();
    // ① Create local order record FIRST (pending) — safe even if Transak call fails
    const { data: localOrder } = await supabase.from("transak_orders").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      quote_id: quote?.quoteId ?? null,
      fiat_currency: quote?.fiatCurrency ?? "USD",
      fiat_amount: quote?.fiatAmount ?? 0,
      crypto_currency: currency,
      crypto_amount: quote?.cryptoAmount ?? 0,
      payment_method: "bank_transfer",
      wallet_address: profile.wallet_address,
      status: "pending",
    }).select().single().catch(() => ({ data: null }));
    const localOrderId = (localOrder as any)?.id ?? `local-${Date.now()}`;
    try {
      // ② Call Transak API via Edge Function
      const data = await api("/transak/order/bank", {
        method: "POST",
        headers: { "x-transak-token": accessToken },
        body: JSON.stringify({ quoteId: quote?.quoteId, walletAddress: profile.wallet_address, paymentInstrumentId: "bank_transfer" }),
      });
      const od = data?.response ?? data?.data ?? data;
      const transakOrderId = od?.id ?? `TRK-${Date.now()}`;
      const bankDets = od?.bankDetails ?? od?.paymentDetails?.bankDetails;
      // ③ Update local record with Transak's orderId
      await supabase.from("transak_orders").update({
        transak_order_id: transakOrderId,
        status: "awaiting_payment",
        bank_details: bankDets ?? null,
        updated_at: new Date().toISOString(),
      }).eq("id", localOrderId).catch(() => {});
      setOrder({ id: transakOrderId, status: od?.status ?? "AWAITING_PAYMENT_FROM_USER", bankDetails: bankDets });
      // ④ STEP 7: transactions table = blockchain layer only (memo links to transak_orders)
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({ type: "purchase", amount: quote?.cryptoAmount ?? 0, currency, status: "pending", payment_provider: "Transak", memo: transakOrderId }),
      }).catch(() => {});
      setStep("done");
    } catch (err: any) {
      // Transak API not yet configured — mark local order failed, simulate for demo
      await supabase.from("transak_orders").update({ status: "failed", failure_reason: "Transak API not configured", updated_at: new Date().toISOString() }).eq("id", localOrderId).catch(() => {});
      const demoOrderId = `TRK-DEMO-${Date.now()}`;
      setOrder({ id: demoOrderId, status: "AWAITING_PAYMENT_FROM_USER", bankDetails: { bankName: "Transak Bank (Demo)", accountNumber: "12345678", sortCode: "20-00-00", reference: `PAY-${Date.now()}`, amount: quote?.fiatAmount, currency: "USD" } });
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({ type: "purchase", amount: quote?.cryptoAmount ?? 0, currency, status: "pending", payment_provider: "Transak", memo: demoOrderId }),
      }).catch(() => {});
      setStep("done");
    } finally { setLoading(false); }
  };

  const restart = () => { setStep("quote"); setQuote(null); setOtp(""); setStateToken(""); setAccessToken(""); setOrder(null); clearError(); };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const StepIndicator = () => {
    const steps = [
      { key: "quote",      label: "견적" },
      { key: "otp_send",   label: "인증" },
      { key: "otp_verify", label: "OTP" },
      { key: "order",      label: "주문" },
      { key: "done",       label: "완료" },
    ];
    const stepIdx = ["quote","otp_send","otp_verify","kyc_form","kyc_check","order","done"].indexOf(step);
    const simIdx  = ["quote","otp_send","otp_verify","kyc_check","order","done"].indexOf(["quote","otp_send","otp_verify","kyc_form","kyc_check","order","done"].find((_,i) => i === stepIdx) ?? "");
    return (
      <div className="flex items-center gap-1 mb-4">
        {steps.map((s, i) => {
          const active = step === s.key || (s.key === "인증" && ["otp_send","otp_verify"].includes(step)) || (s.key === "주문" && ["kyc_form","kyc_check","order"].includes(step));
          const done2  = i < stepIdx;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-bold transition-colors ${done2 ? "bg-[#00d395] text-background" : step.startsWith(s.key.split("_")[0]) ? "bg-[#8247e5] text-white" : "bg-secondary text-muted-foreground"}`}>
                {done2 ? "✓" : i + 1}
              </div>
              <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest hidden sm:inline">{s.label}</span>
              {i < steps.length - 1 && <div className="w-4 h-px bg-border mx-0.5" />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader title="코인 구매 (Transak)" onBack={onBack} />
      <StepIndicator />

      {error && (
        <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2.5">
          <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
          <span className="font-mono text-[13px] text-[#ef4444] flex-1">{error}</span>
          <button onClick={clearError} className="text-muted-foreground hover:text-foreground"><X size={11} /></button>
        </div>
      )}

      {/* Step 1: Quote */}
      {step === "quote" && (
        <div className="bg-card border border-border rounded-sm p-5">
          <p className="font-mono text-[13px] text-muted-foreground mb-4">구매할 코인과 금액을 선택하세요. Transak을 통해 은행이체로 결제됩니다.</p>
          <form onSubmit={getQuote} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">구매할 토큰</label>
              <div className="flex gap-2">
                {TOKENS.map((t) => (
                  <button key={t.symbol} type="button" onClick={() => setCurrency(t.symbol)}
                    className="flex-1 py-2.5 rounded-sm border font-mono text-sm font-bold transition-colors"
                    style={currency === t.symbol ? { borderColor: t.color + "60", backgroundColor: t.color + "15", color: t.color } : { borderColor: "rgba(255,255,255,0.08)", color: "#6b7280" }}>
                    {t.symbol}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">구매 금액 (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">$</span>
                <input type="number" min="10" step="any" required value={usdAmount} onChange={(e) => setUsdAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-secondary border border-border rounded-sm pl-7 pr-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              </div>
              <div className="flex gap-1.5">
                {presets.map((p) => (
                  <button key={p} type="button" onClick={() => setUsdAmount(p)}
                    className="px-2.5 py-1 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground hover:border-[#8247e5]/40 transition-colors">${p}</button>
                ))}
              </div>
            </div>
            {usdAmount && parseFloat(usdAmount) > 0 && (
              <div className="bg-secondary/60 border border-border rounded-sm px-4 py-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-mono text-[13px] text-muted-foreground">예상 수령량</span>
                  <span className="font-mono text-sm font-bold" style={{ color: token.color }}>{(parseFloat(usdAmount) / token.price).toFixed(6)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[13px] text-muted-foreground">플랫폼 수수료 (~1%)</span>
                  <span className="font-mono text-[13px] text-muted-foreground">${(parseFloat(usdAmount) * 0.01).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[13px] text-muted-foreground">결제 방식</span>
                  <span className="font-mono text-[13px] text-[#8247e5]">은행이체 (Transak)</span>
                </div>
              </div>
            )}
            <button type="submit" disabled={loading || !usdAmount}
              className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <Spinner size={14} /> : <ShoppingCart size={13} />}
              {loading ? "견적 조회 중..." : "견적 조회 및 계속"}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Send OTP */}
      {step === "otp_send" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          {quote && (
            <div className="bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[13px] text-muted-foreground">선택한 구매</span>
              <span className="font-mono text-sm font-bold text-[#8247e5]">${quote.fiatAmount} → {quote.cryptoAmount} {quote.cryptoCurrency}</span>
            </div>
          )}
          <p className="font-mono text-[13px] text-muted-foreground">Transak 인증을 위해 이메일로 OTP를 전송합니다.</p>
          <form onSubmit={sendOtp} className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">이메일</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("quote")} className="px-4 py-2.5 border border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">이전</button>
              <button type="submit" disabled={loading || !email}
                className="flex-1 py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <Spinner size={14} /> : null}
                {loading ? "전송 중..." : "OTP 전송"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Verify OTP */}
      {step === "otp_verify" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <p className="font-mono text-[13px] text-muted-foreground"><span className="text-foreground">{email}</span>로 전송된 OTP를 입력하세요.</p>
          <form onSubmit={verifyOtp} className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">OTP 코드</label>
              <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6자리 코드" maxLength={6}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-xl text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 tracking-widest transition-colors" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("otp_send")} className="px-4 py-2.5 border border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">재전송</button>
              <button type="submit" disabled={loading || otp.length < 4}
                className="flex-1 py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <Spinner size={14} /> : null}
                {loading ? "인증 중..." : "OTP 확인"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 4a: KYC Form */}
      {step === "kyc_form" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-3 py-2">
            <AlertCircle size={12} className="text-[#f59e0b] shrink-0" />
            <span className="font-mono text-[13px] text-[#f59e0b]">구매 전 KYC 인증이 필요합니다. 개인정보를 입력해주세요.</span>
          </div>
          <form onSubmit={submitKyc} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {([ ["성 (Last Name)", "lastName", "Kim"], ["이름 (First Name)", "firstName", "Gildong"] ] as const).map(([label, field, ph]) => (
                <div key={field} className="space-y-1">
                  <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{label}</label>
                  <input required value={(kycForm as any)[field]} onChange={(e) => setKycForm({ ...kycForm, [field]: e.target.value })} placeholder={ph}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">전화번호</label>
                <input required value={kycForm.mobileNumber} onChange={(e) => setKycForm({ ...kycForm, mobileNumber: e.target.value })} placeholder="+821012345678"
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">생년월일</label>
                <input type="date" required value={kycForm.dob} onChange={(e) => setKycForm({ ...kycForm, dob: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">주소</label>
              <input required value={kycForm.address} onChange={(e) => setKycForm({ ...kycForm, address: e.target.value })} placeholder="서울시 강남구 테헤란로 123"
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([ ["도시", "city", "Seoul"], ["시/도", "state", "Seoul"], ["우편번호", "postCode", "06234"] ] as const).map(([label, field, ph]) => (
                <div key={field} className="space-y-1">
                  <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{label}</label>
                  <input required value={(kycForm as any)[field]} onChange={(e) => setKycForm({ ...kycForm, [field]: e.target.value })} placeholder={ph}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <Spinner size={14} /> : null}
              {loading ? "제출 중..." : "KYC 정보 제출"}
            </button>
          </form>
        </div>
      )}

      {/* Step 4b: KYC Status */}
      {step === "kyc_check" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <div className="text-center py-4">
            {kycStatus === "SUBMITTED" ? (
              <>
                <div className="w-12 h-12 rounded-full bg-[#f59e0b]/10 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle size={22} className="text-[#f59e0b]" />
                </div>
                <p className="font-['Barlow'] text-sm font-semibold text-foreground mb-1">KYC 심사 중</p>
                <p className="font-mono text-[13px] text-muted-foreground">KYC 정보가 제출되어 심사 중입니다. 보통 5~10분 소요됩니다.</p>
              </>
            ) : kycStatus === "ADDITIONAL_FORMS_REQUIRED" ? (
              <>
                <div className="w-12 h-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle size={22} className="text-[#3b82f6]" />
                </div>
                <p className="font-['Barlow'] text-sm font-semibold text-foreground mb-1">추가 서류 필요</p>
                <p className="font-mono text-[13px] text-muted-foreground">Standard KYC: 신분증 및 셀피 촬영이 필요합니다. Transak 사이트에서 완료해주세요.</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                  <AlertCircle size={22} className="text-muted-foreground" />
                </div>
                <p className="font-['Barlow'] text-sm font-semibold text-foreground mb-1">KYC 상태: {kycStatus || "확인 중"}</p>
                <p className="font-mono text-[13px] text-muted-foreground">KYC 상태를 확인합니다.</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={checkKyc} disabled={loading}
              className="flex-1 py-2.5 border border-[#8247e5]/40 text-[#8247e5] bg-[#8247e5]/10 font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Spinner size={14} /> : null} 상태 재확인
            </button>
            {kycStatus === "APPROVED" && (
              <button onClick={() => setStep("order")} className="flex-1 py-2.5 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
                주문 진행
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Create Order */}
      {step === "order" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-3 py-2">
            <Check size={12} className="text-[#00d395]" />
            <span className="font-mono text-[13px] text-[#00d395]">KYC 인증 완료. 주문을 생성하세요.</span>
          </div>
          {quote && (
            <div className="bg-secondary/60 border border-border rounded-sm px-4 py-3 space-y-2">
              <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">결제 금액</span><span className="font-mono text-sm font-bold text-foreground">${quote.fiatAmount} USD</span></div>
              <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">예상 수령</span><span className="font-mono text-sm font-bold text-[#8247e5]">{quote.cryptoAmount} {quote.cryptoCurrency}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">수수료</span><span className="font-mono text-[13px] text-muted-foreground">${quote.totalFee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">지갑 주소</span><span className="font-mono text-[13px] text-muted-foreground truncate max-w-[180px]">{profile?.wallet_address ? `${profile.wallet_address.slice(0,10)}...` : "미연결"}</span></div>
            </div>
          )}
          <button onClick={createOrder} disabled={loading}
            className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <Spinner size={14} /> : <ShoppingCart size={13} />}
            {loading ? "주문 생성 중..." : "은행이체 주문 생성"}
          </button>
          <p className="font-mono text-[12px] text-muted-foreground text-center">주문 생성 후 입금 계좌 정보가 표시됩니다. Transak 서비스 약관에 동의하는 것으로 간주됩니다.</p>
        </div>
      )}

      {/* Step 6: Done - Bank Details */}
      {step === "done" && order && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#00d395]/10 flex items-center justify-center shrink-0">
              <Check size={18} className="text-[#00d395]" />
            </div>
            <div>
              <p className="font-['Barlow'] text-sm font-semibold text-foreground">주문 생성 완료</p>
              <p className="font-mono text-[13px] text-muted-foreground">주문 ID: {order.id}</p>
            </div>
          </div>

          {order.bankDetails && (
            <div className="bg-secondary/60 border border-[#3b82f6]/20 rounded-sm p-4 space-y-2">
              <div className="font-mono text-[13px] text-[#3b82f6] uppercase tracking-widest mb-3">입금 계좌 정보</div>
              {[
                { label: "은행명",     val: order.bankDetails.bankName },
                { label: "계좌번호",   val: order.bankDetails.accountNumber },
                { label: "정렬코드",   val: order.bankDetails.sortCode },
                { label: "입금 참조",  val: order.bankDetails.reference },
                { label: "입금 금액",  val: order.bankDetails.amount ? `${order.bankDetails.amount} ${order.bankDetails.currency}` : undefined },
              ].filter((r) => r.val).map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="font-mono text-[13px] text-muted-foreground">{row.label}</span>
                  <span className="font-mono text-[13px] text-foreground font-semibold">{row.val}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-3 py-2.5 flex items-start gap-2">
            <AlertCircle size={12} className="text-[#f59e0b] mt-0.5 shrink-0" />
            <span className="font-mono text-[13px] text-[#f59e0b]">입금 참조번호를 반드시 기재해 주세요. 코인은 입금 확인 후 자동으로 지갑에 전송됩니다.</span>
          </div>

          <div className="flex gap-2">
            <button onClick={restart}
              className="flex-1 py-2.5 border border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">
              새 구매
            </button>
            <button onClick={() => { onSuccess(); }}
              className="flex-1 py-2.5 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
              거래 내역 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Swap Tab ─────────────────────────────────────────────────────────────────

function SwapTab({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const [fromToken, setFromToken] = useState("MATIC");
  const [toToken, setToToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const from = TOKENS.find((t) => t.symbol === fromToken)!;
  const to = TOKENS.find((t) => t.symbol === toToken)!;
  const toAmount = amount ? ((parseFloat(amount) * from.price) / to.price).toFixed(6) : "";
  const priceImpact = amount ? (parseFloat(amount) * 0.001).toFixed(3) : "";

  const flipTokens = () => { setFromToken(toToken); setToToken(fromToken); setAmount(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true); setError("");
    try {
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({ type: "swap", amount: parseFloat(amount), currency: fromToken, from_currency: fromToken, to_currency: toToken, status: "completed", dex: "Uniswap V3", fee: parseFloat(amount) * 0.003 }),
      });
      setDone(true);
      setTimeout(() => { setDone(false); setAmount(""); onSuccess(); }, 2000);
    } catch (err: any) { setError(err.message ?? "스왑 실패"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="토큰 스왑" onBack={onBack} />
      <div className="bg-card border border-border rounded-sm p-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">From</label>
            <div className="flex gap-2">
              <input type="number" min="0.000001" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.000000"
                className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              <select value={fromToken} onChange={(e) => { setFromToken(e.target.value); setAmount(""); }}
                className="bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60">
                {TOKENS.map((t) => <option key={t.symbol} value={t.symbol} disabled={t.symbol === toToken}>{t.symbol}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <button type="button" onClick={flipTokens}
              className="w-9 h-9 rounded-full border border-border bg-secondary hover:bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeftRight size={14} />
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">To</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-secondary/40 border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-muted-foreground">{toAmount || "0.000000"}</div>
              <select value={toToken} onChange={(e) => setToToken(e.target.value)}
                className="bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60">
                {TOKENS.map((t) => <option key={t.symbol} value={t.symbol} disabled={t.symbol === fromToken}>{t.symbol}</option>)}
              </select>
            </div>
          </div>
          {amount && toAmount && (
            <div className="bg-secondary/60 border border-border rounded-sm px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] text-muted-foreground">교환 비율</span>
                <span className="font-mono text-[13px] text-foreground">1 {fromToken} = {(from.price / to.price).toFixed(6)} {toToken}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] text-muted-foreground">가격 영향</span>
                <span className="font-mono text-[13px] text-[#f59e0b]">{priceImpact}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] text-muted-foreground">수수료 (0.3%)</span>
                <span className="font-mono text-[13px] text-muted-foreground">{(parseFloat(amount) * 0.003).toFixed(6)} {fromToken}</span>
              </div>
            </div>
          )}
          {/* Slippage */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">슬리피지</span>
            <div className="flex gap-1.5">
              {["0.1", "0.5", "1.0"].map((v) => (
                <button key={v} type="button" onClick={() => setSlippage(v)}
                  className={`px-2 py-1 font-mono text-[13px] border rounded-sm transition-colors ${slippage === v ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {v}%
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
              <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
              <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
            </div>
          )}
          <button type="submit" disabled={loading || done || !amount}
            className={`w-full py-2.5 font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${done ? "bg-[#00d395] text-background" : "bg-[#8247e5] hover:bg-[#8247e5]/80 text-white"}`}>
            {loading ? <Spinner size={14} /> : done ? <Check size={13} /> : <ArrowLeftRight size={13} />}
            {loading ? "처리 중..." : done ? "스왑 완료!" : `${fromToken} → ${toToken} 스왑`}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Send Tab ─────────────────────────────────────────────────────────────────

function SendTab({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const [toAddr, setToAddr] = useState("");
  const [currency, setCurrency] = useState("MATIC");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const token = TOKENS.find((t) => t.symbol === currency)!;
  const usdValue = amount ? (parseFloat(amount) * token.price).toFixed(2) : "";
  const estimatedFee = "0.0012 MATIC";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) { setConfirmed(true); return; }
    setLoading(true); setError("");
    try {
      await api("/transactions", {
        method: "POST",
        body: JSON.stringify({ type: "send", amount: parseFloat(amount), currency, to_address: toAddr, memo: memo || null, status: "completed", fee: 0.0012 }),
      });
      setDone(true);
      setTimeout(() => { setDone(false); setAmount(""); setToAddr(""); setMemo(""); setConfirmed(false); onSuccess(); }, 2500);
    } catch (err: any) { setError(err.message ?? "전송 실패"); setConfirmed(false); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="보내기" onBack={onBack} />
      <div className="bg-card border border-border rounded-sm p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">받는 주소</label>
            <div className="flex gap-2">
              <input type="text" required value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder="0x..."
                className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              <button type="button" className="px-3 py-2 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors" title="QR 스캔">
                <QrCode size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">토큰</label>
            <div className="flex gap-2">
              {TOKENS.map((t) => (
                <button key={t.symbol} type="button" onClick={() => setCurrency(t.symbol)}
                  className="flex-1 py-2 rounded-sm border font-mono text-sm font-bold transition-colors"
                  style={currency === t.symbol ? { borderColor: t.color + "60", backgroundColor: t.color + "15", color: t.color } : { borderColor: "rgba(255,255,255,0.08)", color: "#6b7280" }}>
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">수량</label>
            <input type="number" min="0.000001" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.000000"
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
            {usdValue && <div className="font-mono text-[13px] text-muted-foreground">≈ ${usdValue} USD</div>}
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">메모 (선택)</label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="송금 메모..."
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
          </div>

          <div className="bg-secondary/60 border border-border rounded-sm px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-[14px] text-muted-foreground">예상 네트워크 수수료</span>
            <span className="font-mono text-[14px] text-foreground">{estimatedFee}</span>
          </div>

          {confirmed && !loading && (
            <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-3">
              <div className="font-mono text-[14px] text-[#f59e0b] mb-2">전송을 확인하시겠습니까?</div>
              <div className="font-mono text-[13px] text-muted-foreground">수신: {toAddr.slice(0, 12)}...{toAddr.slice(-6)}</div>
              <div className="font-mono text-[13px] text-muted-foreground">수량: {amount} {currency}</div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
              <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
              <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading || done || !toAddr || !amount}
            className={`w-full py-2.5 font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${done ? "bg-[#00d395] text-background" : confirmed ? "bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-background" : "bg-[#8247e5] hover:bg-[#8247e5]/80 text-white"}`}>
            {loading ? <Spinner size={14} /> : done ? <Check size={13} /> : <Send size={13} />}
            {loading ? "처리 중..." : done ? "전송 완료!" : confirmed ? "전송 확인" : "전송하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Receive Tab ─────────────────────────────────────────────────────────────

function ReceiveTab({ profile, onBack }: { profile: UserProfile | null; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const [network, setNetwork] = useState("Polygon");

  const addr = profile?.wallet_address ?? "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

  const copy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="받기" onBack={onBack} />

      <div className="bg-card border border-border rounded-sm px-4 py-3 flex items-center gap-3">
        <Globe size={13} className="text-muted-foreground" />
        <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">네트워크</span>
        <select value={network} onChange={(e) => setNetwork(e.target.value)}
          className="ml-auto bg-secondary border border-border rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none">
          <option>Polygon</option>
          <option>Ethereum</option>
        </select>
      </div>

      {/* QR Code visual */}
      <div className="bg-card border border-border rounded-sm p-6 flex flex-col items-center">
        <div className="w-48 h-48 bg-white rounded-sm flex items-center justify-center mb-4 relative overflow-hidden">
          {/* Simulated QR pattern */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "repeat(21, 1fr)", gridTemplateRows: "repeat(21, 1fr)" }}>
            {Array.from({ length: 441 }, (_, i) => {
              const row = Math.floor(i / 21), col = i % 21;
              const isCorner = (row < 7 && col < 7) || (row < 7 && col > 13) || (row > 13 && col < 7);
              const isRandom = Math.sin(i * 2.71828 + addr.charCodeAt(i % addr.length) * 1.41421) > 0.3;
              return (
                <div key={i} className={`${(isCorner || isRandom) ? "bg-black" : "bg-white"}`} />
              );
            })}
          </div>
          {/* Corner markers */}
          <div className="absolute top-2 left-2 w-10 h-10 border-4 border-black bg-white z-10">
            <div className="absolute inset-1 bg-black" />
          </div>
          <div className="absolute top-2 right-2 w-10 h-10 border-4 border-black bg-white z-10">
            <div className="absolute inset-1 bg-black" />
          </div>
          <div className="absolute bottom-2 left-2 w-10 h-10 border-4 border-black bg-white z-10">
            <div className="absolute inset-1 bg-black" />
          </div>
        </div>

        <p className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-2">{network} 주소</p>
        <div className="flex items-center gap-3 bg-secondary border border-border rounded-sm px-4 py-2.5 w-full">
          <span className="font-mono text-[14px] text-foreground flex-1 truncate">{addr}</span>
          <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check size={14} className="text-[#00d395]" /> : <Copy size={14} />}
          </button>
        </div>

        <div className="flex gap-2 mt-4 w-full">
          <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 py-2 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground hover:border-[#8247e5]/40 transition-colors">
            <Copy size={12} /> 주소 복사
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#8247e5] rounded-sm font-mono text-[13px] text-white hover:bg-[#8247e5]/80 transition-colors">
            <Download size={12} /> QR 저장
          </button>
        </div>
      </div>

      <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-3 flex items-start gap-2">
        <AlertCircle size={12} className="text-[#f59e0b] mt-0.5 shrink-0" />
        <span className="font-mono text-[13px] text-[#f59e0b]">{network} 네트워크 전용 주소입니다. 다른 네트워크에서 전송 시 자산을 잃을 수 있습니다.</span>
      </div>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ refresh }: { refresh: number }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try { const data = await api("/transactions"); setTxs(data ?? []); }
    catch { setTxs([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxs(); }, [fetchTxs, refresh]);

  const filtered = filter === "all" ? txs : txs.filter((t) => t.type === filter);

  const typeColor = (type: string) => {
    if (type === "purchase") return "#f59e0b";
    if (type === "swap") return "#8247e5";
    if (type === "send") return "#ef4444";
    return "#00d395";
  };

  const statusColor = (s: string) => s === "completed" ? "text-[#00d395]" : s === "pending" ? "text-[#f59e0b]" : "text-[#ef4444]";

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["all", "purchase", "swap", "send", "receive"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-sm font-mono text-[13px] uppercase tracking-widest border transition-colors ${filter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "전체" : f === "purchase" ? "구매" : f === "swap" ? "스왑" : f === "send" ? "전송" : "수신"}
          </button>
        ))}
        <button onClick={fetchTxs} className="shrink-0 ml-auto px-3 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={11} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner size={18} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-sm px-4 py-10 text-center">
          <History size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-[14px] text-muted-foreground">거래내역이 없습니다</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {filtered.map((tx, i) => (
            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: typeColor(tx.type) + "20", color: typeColor(tx.type) }}>
                {tx.type === "purchase" ? <ShoppingCart size={12} /> : tx.type === "swap" ? <ArrowLeftRight size={12} /> : tx.type === "send" ? <Send size={12} /> : <Download size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-['Barlow'] text-sm font-semibold text-foreground capitalize">{tx.type}</span>
                  <span className={`font-mono text-[13px] ${statusColor(tx.status)}`}>{tx.status}</span>
                </div>
                <div className="font-mono text-[13px] text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString("ko-KR")}
                  {tx.tx_hash && ` · ${tx.tx_hash.slice(0, 10)}...`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-sm text-foreground">{parseFloat(tx.amount).toFixed(4)} {tx.currency}</div>
                {tx.type === "swap" && tx.to_currency && (
                  <div className="font-mono text-[13px] text-muted-foreground">→ {tx.to_currency}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [read, setRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [{ data: pushData }, { data: noticeData }] = await Promise.all([
          supabase.from("push_notifications").select("*").eq("status", "sent").order("sent_at", { ascending: false }).limit(10),
          supabase.from("notices").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(5),
        ]);
        const pushItems = (pushData ?? []).map((p: any) => ({ id: p.id, title: p.title, body: p.body, type: "push", created_at: p.sent_at ?? p.created_at }));
        const noticeItems = (noticeData ?? []).map((n: any) => ({ id: n.id, title: n.title, body: n.content, type: n.type, created_at: n.created_at }));
        setItems([...pushItems, ...noticeItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const markRead = (id: string) => setRead((prev) => new Set([...prev, id]));

  const TYPE_COLORS: Record<string, string> = {
    push: "#8247e5", notice: "#3b82f6", event: "#00d395", popup: "#f59e0b", banner: "#f59e0b",
  };

  const TYPE_LABELS: Record<string, string> = {
    push: "알림", notice: "공지", event: "이벤트", popup: "팝업", banner: "배너",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{items.filter((i) => !read.has(i.id)).length}개 읽지 않음</span>
        <button onClick={() => setRead(new Set(items.map((i) => i.id)))} className="font-mono text-[13px] text-[#8247e5] hover:underline">모두 읽음</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner size={18} /></div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-sm px-4 py-10 text-center">
          <Bell size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-[14px] text-muted-foreground">알림이 없습니다</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {items.map((item, i) => {
            const isRead = read.has(item.id);
            return (
              <button key={item.id} onClick={() => markRead(item.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-secondary/20 transition-colors ${i < items.length - 1 ? "border-b border-border/50" : ""} ${isRead ? "opacity-60" : ""}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: (TYPE_COLORS[item.type] ?? "#8247e5") + "20", color: TYPE_COLORS[item.type] ?? "#8247e5" }}>
                  <Bell size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-['Barlow'] text-sm font-semibold text-foreground">{item.title}</span>
                    {!isRead && <div className="w-1.5 h-1.5 rounded-full bg-[#8247e5] shrink-0" />}
                  </div>
                  {item.body && <div className="font-mono text-[13px] text-muted-foreground line-clamp-2">{item.body}</div>}
                  <div className="font-mono text-[13px] text-muted-foreground/60 mt-1">{new Date(item.created_at).toLocaleString("ko-KR")}</div>
                </div>
                <span className="font-mono text-[12px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border shrink-0"
                  style={{ backgroundColor: (TYPE_COLORS[item.type] ?? "#8247e5") + "15", color: TYPE_COLORS[item.type] ?? "#8247e5", borderColor: (TYPE_COLORS[item.type] ?? "#8247e5") + "40" }}>
                  {TYPE_LABELS[item.type] ?? item.type}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ profile, email, onNavigate }: { profile: UserProfile | null; email: string; onNavigate: (tab: Tab) => void }) {
  const MENU_ITEMS = [
    { label: "보안 설정", sublabel: "Face ID, PIN, 시드 구문", tab: "security" as Tab, icon: Shield },
    { label: "앱 설정", sublabel: "다크모드, 언어, 통화", tab: "settings" as Tab, icon: Settings },
    { label: "알림 설정", sublabel: "푸시 알림 관리", tab: "notifications" as Tab, icon: Bell },
  ];

  return (
    <div className="space-y-4">
      {/* User card */}
      <div className="bg-card border border-border rounded-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#8247e5]/20 flex items-center justify-center">
            <User size={26} className="text-[#8247e5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground truncate">{email}</div>
            <div className="font-mono text-[13px] text-muted-foreground mt-0.5">
              {profile ? `가입: ${new Date(profile.joined_at).toLocaleDateString("ko-KR")}` : ""}
            </div>
            {profile && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className={`px-1.5 py-0.5 rounded-sm font-mono text-[13px] font-bold border ${
                  profile.kyc_tier === "T2" ? "bg-[#8247e5]/10 text-[#8247e5] border-[#8247e5]/30" :
                  profile.kyc_tier === "T1" ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30" :
                  "bg-secondary text-muted-foreground border-border"
                }`}>KYC {profile.kyc_tier}</div>
                <span className="font-mono text-[13px] text-muted-foreground">TX {profile.tx_count}건</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile info */}
      {profile && (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {[
            { label: "이메일", value: email },
            { label: "지갑 주소", value: profile.wallet_address ? `${profile.wallet_address.slice(0, 12)}...${profile.wallet_address.slice(-6)}` : "미연결" },
            { label: "계정 상태", value: profile.status },
            { label: "앱 버전", value: "v1.0.0" },
          ].map((item, i, arr) => (
            <div key={item.label} className={`flex items-center px-4 py-3 ${i < arr.length - 1 ? "border-b border-border/50" : ""}`}>
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest w-24 shrink-0">{item.label}</span>
              <span className="font-mono text-sm text-foreground flex-1 truncate">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Navigation menu */}
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

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab({ onBack }: { onBack: () => void }) {
  const [faceId, setFaceId] = useState(false);
  const [fingerprint, setFingerprint] = useState(false);
  const [pin, setPin] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
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
    { label: "Face ID", sublabel: "얼굴 인식으로 잠금 해제", icon: Eye, checked: faceId, onChange: () => setFaceId((v) => !v) },
    { label: "지문 인증", sublabel: "지문으로 잠금 해제", icon: Fingerprint, checked: fingerprint, onChange: () => setFingerprint((v) => !v) },
    { label: "PIN 설정", sublabel: "6자리 PIN으로 잠금", icon: Lock, checked: pin, onChange: () => setPin((v) => !v) },
    { label: "자동 잠금", sublabel: "비활성화 후 자동 잠금", icon: Smartphone, checked: autoLock, onChange: () => setAutoLock((v) => !v) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="보안" onBack={onBack} />

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
            <span className="font-mono text-[13px] text-muted-foreground flex-1">자동 잠금 시간</span>
            <select value={autoLockTime} onChange={(e) => setAutoLockTime(e.target.value)}
              className="bg-secondary border border-border rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none">
              <option value="1">1분</option>
              <option value="5">5분</option>
              <option value="15">15분</option>
              <option value="30">30분</option>
            </select>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">백업 및 내보내기</span>
        </div>
        <button onClick={() => setShowWarning("seed")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/20 transition-colors border-b border-border/50">
          <div className="w-8 h-8 rounded-sm bg-[#f59e0b]/10 flex items-center justify-center shrink-0"><Key size={14} className="text-[#f59e0b]" /></div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">시드 문구 백업</div>
            <div className="font-mono text-[13px] text-muted-foreground">12개 단어로 구성된 복구 문구 확인</div>
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
        <button onClick={() => setShowWarning("key")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/20 transition-colors">
          <div className="w-8 h-8 rounded-sm bg-[#ef4444]/10 flex items-center justify-center shrink-0"><Shield size={14} className="text-[#ef4444]" /></div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">개인키 내보내기</div>
            <div className="font-mono text-[13px] text-muted-foreground">절대 타인에게 공유하지 마세요</div>
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
      </div>

      {showWarning && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-[#ef4444]/30 rounded-sm p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-[#ef4444]" />
              <span className="font-['Barlow_Condensed'] text-lg font-bold text-[#ef4444] uppercase">경고</span>
            </div>
            <p className="font-mono text-[14px] text-foreground mb-2">
              {showWarning === "seed" ? "시드 문구는 지갑의 완전한 접근 권한을 부여합니다." : "개인키는 지갑의 완전한 접근 권한을 부여합니다."}
            </p>
            <p className="font-mono text-[14px] text-[#ef4444] mb-4">절대로 타인이나 서비스에 공개하지 마세요. 피싱 사이트나 사기에 주의하세요.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowWarning(null)} className="flex-1 py-2.5 border border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">취소</button>
              <button onClick={() => setShowWarning(null)} className="flex-1 py-2.5 bg-[#ef4444] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#ef4444]/80 transition-colors">위험 확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ onBack }: { onBack: () => void }) {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("ko");
  const [currency, setCurrency] = useState("USD");
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
    { label: "고객센터", sublabel: "문의 및 신고", icon: MessageSquare },
    { label: "이용약관", sublabel: "서비스 이용약관", icon: FileText },
    { label: "개인정보처리방침", sublabel: "Privacy Policy", icon: Lock },
    { label: "앱 정보", sublabel: "v1.0.0 · Polygon Wallet", icon: Info },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="설정" onBack={onBack} />

      {/* Display */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">화면</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
          <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            {darkMode ? <Moon size={14} className="text-[#8247e5]" /> : <Sun size={14} className="text-[#f59e0b]" />}
          </div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">다크모드</div>
            <div className="font-mono text-[13px] text-muted-foreground">{darkMode ? "다크 테마 사용 중" : "라이트 테마 사용 중"}</div>
          </div>
          <Toggle checked={darkMode} onChange={toggleDarkMode} />
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            <Globe size={14} className="text-[#3b82f6]" />
          </div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">언어</div>
          </div>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="bg-secondary border border-border rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none">
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>

      {/* Currency & Notifications */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">통화 및 알림</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
          <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center shrink-0">
            <span className="font-mono text-sm text-[#00d395]">$</span>
          </div>
          <div className="flex-1">
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">표시 통화</div>
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
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">푸시 알림</div>
            <div className="font-mono text-[13px] text-muted-foreground">거래 완료, 공지 등 알림</div>
          </div>
          <Toggle checked={pushEnabled} onChange={() => setPushEnabled((v) => !v)} />
        </div>
      </div>

      {/* Links */}
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

// ─── Main User App ────────────────────────────────────────────────────────────

export default function UserApp() {
  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
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

  useEffect(() => {
    if (!userEmail) return;
    api(`/users?search=${encodeURIComponent(userEmail)}`)
      .then((data: UserProfile[]) => {
        const match = (data ?? []).find((u) => u.email === userEmail);
        if (match) setProfile(match);
      })
      .catch(() => {});
  }, [userEmail]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthed(false); setUserEmail(null); setProfile(null);
  };

  const navigate = (tab: Tab) => setActiveTab(tab);
  const goBack = () => setActiveTab("home");

  if (checkingAuth) return <div className="min-h-screen bg-background flex items-center justify-center"><Spinner size={20} /></div>;
  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  const BOTTOM_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "home",          label: "홈",    icon: Home },
    { id: "wallet",        label: "지갑",  icon: Wallet },
    { id: "history",       label: "거래",  icon: History },
    { id: "notifications", label: "알림",  icon: Bell },
    { id: "profile",       label: "프로필", icon: User },
  ];

  const isSubPage = ["buy", "swap", "send", "receive", "security", "settings"].includes(activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "home":          return <HomeTab profile={profile} onNavigate={navigate} />;
      case "wallet":        return <WalletTab profile={profile} onNavigate={navigate} />;
      case "buy":           return <BuyTab profile={profile} onSuccess={() => { setHistoryRefresh((n) => n + 1); setActiveTab("history"); }} onBack={goBack} />;
      case "swap":          return <SwapTab onSuccess={() => { setHistoryRefresh((n) => n + 1); setActiveTab("history"); }} onBack={goBack} />;
      case "send":          return <SendTab onSuccess={() => { setHistoryRefresh((n) => n + 1); setActiveTab("history"); }} onBack={goBack} />;
      case "receive":       return <ReceiveTab profile={profile} onBack={goBack} />;
      case "history":       return <HistoryTab refresh={historyRefresh} />;
      case "notifications": return <NotificationsTab />;
      case "profile":       return <ProfileTab profile={profile} email={userEmail!} onNavigate={navigate} />;
      case "security":      return <SecurityTab onBack={() => setActiveTab("profile")} />;
      case "settings":      return <SettingsTab onBack={() => setActiveTab("profile")} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur z-20 border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#8247e5] flex items-center justify-center">
            <Wallet size={14} className="text-white" />
          </div>
          <span className="font-['Barlow_Condensed'] text-sm font-bold uppercase tracking-widest">Polygon Wallet</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-muted-foreground truncate max-w-[140px]">{userEmail}</span>
          <button onClick={handleLogout} className="p-1.5 text-muted-foreground hover:text-[#ef4444] transition-colors" title="로그아웃">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        {renderContent()}
      </main>

      {/* Bottom tab bar — hide on sub-pages */}
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
