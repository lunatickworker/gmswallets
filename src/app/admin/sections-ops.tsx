import { useState, useEffect, useCallback } from "react";
import { ToggleLeft, ToggleRight, RefreshCw, Key, Eye, Monitor, Cpu, Globe, Database, AlertCircle, Check, ShoppingCart, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard, METHOD_COLORS, api } from "./shared";

export function CoinsSection({ adminEmail }: { adminEmail: string }) {
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchCoins = useCallback(async () => {
    setLoading(true);
    try { const { data } = await supabase.from("coins").select("*").order("symbol"); setCoins(data ?? []); }
    catch { setCoins([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCoins(); }, [fetchCoins]);

  const toggle = async (coin: any, field: "is_purchase_enabled" | "is_swap_enabled") => {
    setSaving(coin.id + field);
    try {
      await supabase.from("coins").update({ [field]: !coin[field] }).eq("id", coin.id);
      await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: `toggle_coin_${field}`, target_type: "coin", target_id: coin.id, detail: { symbol: coin.symbol, field, value: !coin[field] } });
      fetchCoins();
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="지원 코인 수" value={String(coins.length)} />
        <StatCard label="구매 가능" value={String(coins.filter((c) => c.is_purchase_enabled).length)} accent="#00d395" />
        <StatCard label="스왑 가능" value={String(coins.filter((c) => c.is_swap_enabled).length)} accent="#8247e5" />
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["심볼", "이름", "네트워크", "Decimals", "구매 가능", "스왑 가능", "등록일"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coins.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">코인 없음 (DB 초기화 필요)</td></tr>
              ) : coins.map((c, i) => (
                <tr key={c.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === coins.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-mono text-sm font-bold text-[#8247e5]">{c.symbol}</td>
                  <td className="px-4 py-3 font-['Barlow'] text-sm text-foreground">{c.name}</td>
                  <td className="px-4 py-3"><Badge variant="purple">{c.network}</Badge></td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{c.decimals}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(c, "is_purchase_enabled")} disabled={saving === c.id + "is_purchase_enabled"} className="shrink-0 transition-opacity disabled:opacity-50">
                      {c.is_purchase_enabled ? <ToggleRight size={22} className="text-[#00d395]" /> : <ToggleLeft size={22} className="text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(c, "is_swap_enabled")} disabled={saving === c.id + "is_swap_enabled"} className="shrink-0 transition-opacity disabled:opacity-50">
                      {c.is_swap_enabled ? <ToggleRight size={22} className="text-[#00d395]" /> : <ToggleLeft size={22} className="text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function OpLogsSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"admin" | "system" | "api">("admin");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "admin") {
        const { data } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(100);
        setLogs(data ?? []);
      } else if (tab === "api") {
        const data = await api("/logs");
        setLogs((data ?? []).filter((l: any) => l.status_code >= 400));
      } else {
        const { data } = await supabase.from("admin_logs").select("*").ilike("action", "%system%").order("created_at", { ascending: false }).limit(50);
        setLogs(data ?? []);
      }
    } catch { setLogs([]); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const ACTION_COLORS: Record<string, string> = {
    admin_login: "text-[#00d395]",
    delete_user: "text-[#ef4444]",
    suspend_user: "text-[#f59e0b]",
    activate_user: "text-[#3b82f6]",
    create_user: "text-[#8247e5]",
    send_push: "text-[#8247e5]",
    edit_notice: "text-[#f59e0b]",
    create_notice: "text-[#00d395]",
    delete_notice: "text-[#ef4444]",
    update_fee: "text-[#f59e0b]",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["admin", "api", "system"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${tab === t ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {t === "admin" ? "관리자 작업" : t === "api" ? "API 오류" : "시스템 로그"}
          </button>
        ))}
        <button onClick={fetchLogs} className="ml-auto p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={11} /></button>
      </div>

      {loading ? <Spinner /> : tab === "admin" ? (
        <div className="bg-card border border-border rounded-sm overflow-hidden font-mono text-[14px]">
          <div className="grid grid-cols-[160px_160px_200px_1fr_80px] px-4 py-2 border-b border-border text-[13px] text-muted-foreground uppercase tracking-widest">
            <span>시간</span><span>관리자</span><span>액션</span><span>상세</span><span>대상</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">로그 없음</div>
            ) : logs.map((log, i) => (
              <div key={log.id ?? i} className="grid grid-cols-[160px_160px_200px_1fr_80px] px-4 py-2.5 border-b border-border/30 hover:bg-secondary/20 transition-colors items-start">
                <span className="text-muted-foreground whitespace-nowrap text-[13px]">{new Date(log.created_at).toLocaleString("sv-SE").replace("T", " ")}</span>
                <span className="text-foreground truncate pr-2">{log.admin_email}</span>
                <span className={`truncate pr-2 ${ACTION_COLORS[log.action] ?? "text-foreground"}`}>{log.action}</span>
                <span className="text-muted-foreground text-[12px] min-w-0 break-all">{log.detail ? Object.entries(log.detail).map(([k, v]) => `${k}: ${v}`).join(" · ") : "—"}</span>
                <span className="text-muted-foreground truncate">{log.target_type ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : tab === "api" ? (
        <div className="bg-card border border-border rounded-sm overflow-hidden font-mono text-[14px]">
          <div className="grid grid-cols-[110px_52px_200px_52px_60px_140px] px-4 py-2 border-b border-border text-[13px] text-muted-foreground uppercase tracking-widest">
            <span>Time</span><span>Method</span><span>Path</span><span>Status</span><span>Latency</span><span>IP</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">API 오류 없음</div>
            ) : logs.map((log, i) => (
              <div key={log.id ?? i} className="grid grid-cols-[110px_52px_200px_52px_60px_140px] px-4 py-1.5 border-b border-border/30 hover:bg-secondary/20">
                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleTimeString("ko-KR")}</span>
                <span className={METHOD_COLORS[log.method] || "text-foreground"}>{log.method}</span>
                <span className="text-foreground truncate">{log.path}</span>
                <span className={log.status_code >= 500 ? "text-[#ef4444]" : "text-[#f59e0b]"}>{log.status_code}</span>
                <span className="text-muted-foreground">{log.latency_ms}ms</span>
                <span className="text-muted-foreground">{log.ip || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm p-6 text-center font-mono text-[14px] text-muted-foreground">
          <Cpu size={24} className="mx-auto mb-2 opacity-30" />
          <div>시스템 로그는 서버에서 직접 수집됩니다</div>
          <div className="mt-1 text-[13px]">Supabase Functions 로그: Supabase Dashboard {">"} Functions에서 확인</div>
        </div>
      )}
    </div>
  );
}

export function SysConfigSection({ adminEmail }: { adminEmail: string }) {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [appVersion] = useState("1.0.0");
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  const API_KEYS = [
    { name: "Alchemy RPC", key: "alch_***************************", lastRotated: "2026-06-01" },
    { name: "Transak API", key: "trx_****************************", lastRotated: "2026-05-15" },
    { name: "Firebase FCM", key: "fcm_****************************", lastRotated: "2026-06-10" },
    { name: "CoinGecko API", key: "cg_******************************", lastRotated: "2026-04-20" },
  ];

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try { const data = await api("/flags"); setFlags(data ?? []); }
    catch { setFlags([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggle = async (key: string, current: boolean) => {
    setSaving(key);
    try {
      const updated = await api(`/flags/${key}`, { method: "PATCH", body: JSON.stringify({ enabled: !current }) });
      setFlags((prev) => prev.map((f) => f.key === key ? updated : f));
      await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "toggle_flag", target_type: "feature_flag", target_id: key, detail: { enabled: !current } });
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-5">
      {/* App version */}
      <div className="bg-card border border-border rounded-sm p-4 flex items-center gap-4">
        <Monitor size={20} className="text-muted-foreground" />
        <div>
          <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">앱 버전</div>
          <div className="font-['Barlow_Condensed'] text-2xl font-bold text-foreground">v{appVersion}</div>
        </div>
        <div className="ml-auto">
          <Badge variant="green">Latest</Badge>
        </div>
      </div>

      {/* Feature flags (maintenance mode focus) */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">시스템 설정 / 점검 모드</span>
        </div>
        {loading ? <Spinner /> : flags.length === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-[13px] text-muted-foreground">DB 초기화가 필요합니다</div>
        ) : flags.map((flag, i) => (
          <div key={flag.key} className={`px-4 py-4 flex items-center gap-4 border-b border-border/50 ${i === flags.length - 1 ? "border-0" : ""} ${flag.key === "MAINTENANCE_MODE" && flag.enabled ? "bg-[#ef4444]/5" : ""} hover:bg-secondary/20 transition-colors`}>
            <button onClick={() => toggle(flag.key, flag.enabled)} disabled={saving === flag.key} className="shrink-0 transition-opacity disabled:opacity-50">
              {flag.enabled ? <ToggleRight size={24} className={flag.key === "MAINTENANCE_MODE" ? "text-[#ef4444]" : "text-[#00d395]"} /> : <ToggleLeft size={24} className="text-muted-foreground" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-['Barlow'] text-sm font-semibold text-foreground">{flag.label}</span>
                <Badge variant={flag.enabled ? "green" : "gray"}>{flag.enabled ? "on" : "off"}</Badge>
                {flag.key === "MAINTENANCE_MODE" && flag.enabled && <Badge variant="red">⚠ ACTIVE</Badge>}
              </div>
              <span className="font-mono text-[13px] text-muted-foreground">{flag.description}</span>
            </div>
            <code className="font-mono text-[13px] text-muted-foreground bg-secondary px-2 py-1 rounded-sm border border-border">{flag.key}</code>
          </div>
        ))}
      </div>

      {/* API Key management */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Key size={12} className="text-muted-foreground" />
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">API Key 관리</span>
        </div>
        {API_KEYS.map((k, i) => (
          <div key={k.name} className={`flex items-center gap-4 px-4 py-3.5 border-b border-border/50 hover:bg-secondary/20 transition-colors ${i === API_KEYS.length - 1 ? "border-0" : ""}`}>
            <div className="w-8 h-8 rounded-sm bg-[#8247e5]/10 flex items-center justify-center shrink-0">
              <Key size={12} className="text-[#8247e5]" />
            </div>
            <div className="flex-1">
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{k.name}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{showApiKey === k.name ? k.key : k.key.slice(0, 8) + "••••••••••••••••••••••"}</div>
            </div>
            <div className="font-mono text-[13px] text-muted-foreground">마지막 교체: {k.lastRotated}</div>
            <button onClick={() => setShowApiKey(showApiKey === k.name ? null : k.name)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              {showApiKey === k.name ? <Eye size={12} /> : <Eye size={12} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STEP 2: Transak Lookup Sync ─────────────────────────────────────────────
// Admin-triggered sync of Transak Lookup API data into DB cache tables.
// Frontend reads from DB cache — never calls Transak Lookup API directly.

export function TransakSyncSection({ adminEmail }: { adminEmail: string }) {
  const [syncLog, setSyncLog]   = useState<any[]>([]);
  const [counts, setCounts]     = useState({ countries: 0, fiats: 0, cryptos: 0, networks: 0 });
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState<"success" | "error" | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: countries },
        { count: fiats },
        { count: cryptos },
        { count: networks },
        { data: logs },
      ] = await Promise.all([
        supabase.from("supported_country").select("id", { count: "exact", head: true }),
        supabase.from("supported_fiat").select("id", { count: "exact", head: true }),
        supabase.from("supported_crypto").select("id", { count: "exact", head: true }),
        supabase.from("supported_network").select("id", { count: "exact", head: true }),
        supabase.from("transak_sync_log").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setCounts({ countries: countries ?? 0, fiats: fiats ?? 0, cryptos: cryptos ?? 0, networks: networks ?? 0 });
      setSyncLog(logs ?? []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      await api("/transak/sync", { method: "POST" });
      await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "transak_lookup_sync", target_type: "transak", detail: { triggered_at: new Date().toISOString() } });
      setSyncResult("success");
      setTimeout(fetchData, 1000);
    } catch {
      setSyncResult("error");
    } finally { setSyncing(false); }
  };

  const CACHE_ITEMS = [
    { label: "지원 국가",   count: counts.countries, icon: Globe,    color: "#3b82f6" },
    { label: "Fiat 통화",  count: counts.fiats,     icon: Database,  color: "#f59e0b" },
    { label: "Crypto 자산", count: counts.cryptos,   icon: ShoppingCart, color: "#8247e5" },
    { label: "네트워크",    count: counts.networks,  icon: Cpu,       color: "#00d395" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-4 py-3">
        <AlertCircle size={14} className="text-[#8247e5] mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-mono text-[14px] text-[#8247e5] font-semibold mb-0.5">STEP 2 — Transak Lookup Cache</div>
          <div className="font-mono text-[13px] text-muted-foreground">Transak Lookup API 데이터를 DB에 캐싱합니다. 프론트엔드는 항상 이 캐시를 읽습니다. 매일 새벽 또는 이 버튼으로 동기화하세요.</div>
        </div>
        <button onClick={runSync} disabled={syncing}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors shrink-0">
          {syncing ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw size={11} />}
          {syncing ? "동기화 중..." : "Lookup 동기화"}
        </button>
      </div>

      {syncResult === "success" && (
        <div className="flex items-center gap-2 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-4 py-2.5">
          <Check size={11} className="text-[#00d395]" />
          <span className="font-mono text-[14px] text-[#00d395]">동기화 완료 — Transak Lookup 데이터가 DB에 저장되었습니다.</span>
        </div>
      )}
      {syncResult === "error" && (
        <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-4 py-2.5">
          <AlertCircle size={11} className="text-[#ef4444]" />
          <span className="font-mono text-[14px] text-[#ef4444]">동기화 실패 — Transak API 키 및 IP 화이트리스트를 확인하세요.</span>
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-4 gap-3">
            {CACHE_ITEMS.map(({ label, count, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{label}</span>
                </div>
                <div className={`font-['Barlow_Condensed'] text-3xl font-bold ${count > 0 ? "text-foreground" : "text-muted-foreground"}`}>{count}</div>
                <div className="font-mono text-[12px] text-muted-foreground mt-0.5">{count > 0 ? "캐시됨" : "미동기화"}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Clock size={11} className="text-muted-foreground" />
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">동기화 이력</span>
            </div>
            {syncLog.length === 0 ? (
              <div className="px-4 py-6 text-center font-mono text-[13px] text-muted-foreground">동기화 기록 없음 — 위 버튼으로 첫 동기화를 실행하세요</div>
            ) : syncLog.map((log, i) => (
              <div key={log.id} className={`flex items-center gap-4 px-4 py-3 border-b border-border/30 ${i === syncLog.length - 1 ? "border-0" : ""} hover:bg-secondary/20 transition-colors`}>
                <Badge variant={log.status === "success" ? "green" : "red"}>{log.status}</Badge>
                <span className="font-mono text-[13px] text-muted-foreground">{new Date(log.created_at).toLocaleString("ko-KR")}</span>
                <span className="font-mono text-[13px] text-foreground flex-1">
                  국가 {log.countries} · Fiat {log.fiats} · Crypto {log.cryptos} · 네트워크 {log.networks}
                </span>
                {log.synced_by && <span className="font-mono text-[13px] text-muted-foreground">{log.synced_by}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── STEP 4+5+6: Transak Orders & KYC Management ────────────────────────────
// Admin views transak_orders and transak_customers from DB only — never calls Transak API.

export function TransakOrdersSection() {
  const [orders, setOrders]     = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [tab, setTab]           = useState<"orders" | "kyc">("orders");
  const [loading, setLoading]   = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "orders") {
        const { data } = await supabase.from("transak_orders").select("*, users(email)").order("created_at", { ascending: false }).limit(100);
        setOrders(data ?? []);
      } else {
        const { data } = await supabase.from("transak_customers").select("*, users(email)").order("updated_at", { ascending: false }).limit(100);
        setCustomers(data ?? []);
      }
    } catch { } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const STATUS_COLORS: Record<string, string> = {
    pending:          "gray",
    awaiting_payment: "yellow",
    processing:       "purple",
    completed:        "green",
    failed:           "red",
    cancelled:        "gray",
  };

  const KYC_COLORS: Record<string, string> = {
    APPROVED:                "green",
    SUBMITTED:               "purple",
    NOT_SUBMITTED:           "gray",
    ADDITIONAL_FORMS_REQUIRED: "yellow",
    REJECTED:                "red",
  };

  const totalOrders = orders.length;
  const completed   = orders.filter((o) => o.status === "completed").length;
  const pending     = orders.filter((o) => ["pending", "awaiting_payment"].includes(o.status)).length;
  const kycApproved = customers.filter((c) => c.kyc_status === "APPROVED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="총 주문"        value={String(totalOrders)} />
        <StatCard label="완료"           value={String(completed)}  accent="#00d395" />
        <StatCard label="대기 중"        value={String(pending)}    accent="#f59e0b" />
        <StatCard label="KYC 승인"       value={String(kycApproved)} accent="#8247e5" />
      </div>

      <div className="flex gap-2">
        {(["orders", "kyc"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${tab === t ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {t === "orders" ? "Transak 주문" : "KYC 고객"}
          </button>
        ))}
        <button onClick={fetchData} className="ml-auto p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={11} /></button>
      </div>

      {loading ? <Spinner /> : tab === "orders" ? (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">주문 없음 (DB 마이그레이션 후 사용 가능)</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["생성시각", "이메일", "Transak ID", "금액", "코인", "결제방식", "상태"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === orders.length - 1 ? "border-0" : ""}`}>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleString("sv-SE").slice(0, 16)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{(o.users as any)?.email ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{o.transak_order_id ? `${o.transak_order_id.slice(0, 12)}…` : <span className="text-[#f59e0b]">대기중</span>}</td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">${o.fiat_amount}</td>
                      <td className="px-4 py-3"><span className="font-mono text-sm font-bold text-[#8247e5]">{o.crypto_currency}</span></td>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{o.payment_method}</td>
                      <td className="px-4 py-3"><Badge variant={(STATUS_COLORS[o.status] ?? "gray") as any}>{o.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {customers.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">KYC 고객 없음 (DB 마이그레이션 후 사용 가능)</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["이메일", "Transak Customer ID", "KYC 상태", "KYC 유형", "토큰 만료", "최종 업데이트"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === customers.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{(c.users as any)?.email ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{c.transak_customer_id ? `${c.transak_customer_id.slice(0, 14)}…` : "—"}</td>
                    <td className="px-4 py-3"><Badge variant={(KYC_COLORS[c.kyc_status] ?? "gray") as any}>{c.kyc_status}</Badge></td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{c.kyc_type ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">
                      {c.access_token_exp ? (new Date(c.access_token_exp) > new Date() ? <span className="text-[#00d395]">유효</span> : <span className="text-[#ef4444]">만료</span>) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(c.updated_at).toLocaleString("sv-SE").slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
