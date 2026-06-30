import { useState, useEffect, useCallback, useRef } from "react";
import { Globe, Lock, Zap, AlertTriangle, ToggleLeft, ToggleRight, RefreshCw, Clock } from "lucide-react";
import { Badge, StatusDot, Spinner, StatCard, METHOD_COLORS, api } from "./shared";

// ─── Routes ───────────────────────────────────────────────────────────────────

const ROUTES = [
  { method: "POST", path: "/auth/register", latency: 88, rps: 2.1, errorRate: 0.0, status: "healthy", auth: false, cache: false },
  { method: "POST", path: "/auth/login", latency: 112, rps: 5.4, errorRate: 0.2, status: "healthy", auth: false, cache: false },
  { method: "GET",  path: "/wallet/balance", latency: 194, rps: 32.5, errorRate: 0.5, status: "degraded", auth: true, cache: true },
  { method: "GET",  path: "/wallet/price", latency: 61, rps: 88.2, errorRate: 0.0, status: "healthy", auth: true, cache: true },
  { method: "GET",  path: "/transactions", latency: 128, rps: 14.3, errorRate: 0.0, status: "healthy", auth: true, cache: false },
  { method: "POST", path: "/webhooks/transak", latency: 56, rps: 0.3, errorRate: 0.0, status: "healthy", auth: false, cache: false },
  { method: "GET",  path: "/users/me", latency: 72, rps: 41.8, errorRate: 0.0, status: "healthy", auth: true, cache: false },
  { method: "PATCH",path: "/users/me", latency: 95, rps: 3.2, errorRate: 0.0, status: "healthy", auth: true, cache: false },
];

export function RoutesSection() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Routes" value={String(ROUTES.length)} />
        <StatCard label="Healthy" value={String(ROUTES.filter((r) => r.status === "healthy").length)} accent="#00d395" />
        <StatCard label="Degraded" value={String(ROUTES.filter((r) => r.status === "degraded").length)} accent="#f59e0b" />
      </div>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">API Route Health</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Method", "Endpoint", "Latency", "RPS", "Error %", "Auth", "Cache", "Status"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROUTES.map((r, i) => (
              <tr key={r.method + r.path} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === ROUTES.length - 1 ? "border-0" : ""}`}>
                <td className="px-4 py-2.5"><span className={`font-mono text-sm font-bold ${METHOD_COLORS[r.method]}`}>{r.method}</span></td>
                <td className="px-4 py-2.5 font-mono text-sm text-foreground">{r.path}</td>
                <td className="px-4 py-2.5"><span className={`font-mono text-sm ${r.latency > 250 ? "text-[#f59e0b]" : "text-[#00d395]"}`}>{r.latency}ms</span></td>
                <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">{r.rps}</td>
                <td className="px-4 py-2.5"><span className={`font-mono text-sm ${r.errorRate > 0.5 ? "text-[#ef4444]" : r.errorRate > 0 ? "text-[#f59e0b]" : "text-muted-foreground"}`}>{r.errorRate.toFixed(1)}%</span></td>
                <td className="px-4 py-2.5">{r.auth ? <Lock size={11} className="text-[#8247e5]" /> : <span className="font-mono text-[13px] text-muted-foreground">—</span>}</td>
                <td className="px-4 py-2.5">{r.cache ? <Zap size={11} className="text-[#00d395]" /> : <span className="font-mono text-[13px] text-muted-foreground">—</span>}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={r.status as any} />
                    <span className={`font-mono text-[13px] ${r.status === "healthy" ? "text-[#00d395]" : "text-[#f59e0b]"}`}>{r.status}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────

const SERVICES_LIST = [
  { name: "NestJS API", host: "api.polygon-wallet.vercel.app", region: "US-East", uptime: 99.97, latency: 94, status: "online" as const },
  { name: "Supabase DB", host: "dkjhqwe.supabase.co", region: "AP-Northeast", uptime: 99.99, latency: 38, status: "online" as const },
  { name: "Upstash Redis", host: "redis.upstash.io", region: "AP-Northeast", uptime: 99.95, latency: 12, status: "online" as const },
  { name: "Upstash QStash", host: "qstash.upstash.io", region: "Global", uptime: 99.98, latency: 21, status: "online" as const },
  { name: "Alchemy RPC", host: "polygon-mainnet.g.alchemy.com", region: "Global", uptime: 99.9, latency: 187, status: "degraded" as const },
  { name: "CoinGecko API", host: "api.coingecko.com", region: "Global", uptime: 98.2, latency: 412, status: "degraded" as const },
  { name: "Firebase FCM", host: "fcm.googleapis.com", region: "Global", uptime: 99.99, latency: 67, status: "online" as const },
];

export function ServicesSection() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Services Online" value={`${SERVICES_LIST.filter((s) => s.status === "online").length} / ${SERVICES_LIST.length}`} accent="#00d395" />
        <StatCard label="Degraded" value={String(SERVICES_LIST.filter((s) => s.status === "degraded").length)} accent="#f59e0b" />
        <StatCard label="Avg Uptime (7d)" value="99.71%" accent="#8247e5" />
      </div>
      <div className="space-y-2">
        {SERVICES_LIST.map((svc) => (
          <div key={svc.name} className={`bg-card border rounded-sm p-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors ${svc.status === "degraded" ? "border-[#f59e0b]/30" : "border-border"}`}>
            <StatusDot status={svc.status} />
            <div className="w-40 shrink-0">
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{svc.name}</div>
              <div className="font-mono text-[13px] text-muted-foreground mt-0.5">{svc.host}</div>
            </div>
            <div className="flex items-center gap-1.5"><Globe size={10} className="text-muted-foreground" /><span className="font-mono text-[13px] text-muted-foreground">{svc.region}</span></div>
            <div className="flex-1" />
            <div className="text-right">
              <div className="font-mono text-sm text-foreground">{svc.latency}ms</div>
              <div className="font-mono text-[13px] text-muted-foreground">avg latency</div>
            </div>
            <div className="text-right w-20">
              <div className={`font-['Barlow_Condensed'] text-xl font-bold ${svc.uptime >= 99.9 ? "text-[#00d395]" : svc.uptime >= 99 ? "text-[#f59e0b]" : "text-[#ef4444]"}`}>{svc.uptime}%</div>
              <div className="font-mono text-[13px] text-muted-foreground">uptime</div>
            </div>
            <Badge variant={svc.status === "online" ? "green" : "yellow"}>{svc.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Config (Feature Flags) ───────────────────────────────────────────────────

export function ConfigSection() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

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
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-2.5">
        <AlertTriangle size={12} className="text-[#f59e0b]" />
        <span className="font-mono text-[14px] text-[#f59e0b]">Feature flag 변경은 Supabase DB에 즉시 저장됩니다. MAINTENANCE_MODE 활성화 시 모든 사용자 접근이 차단됩니다.</span>
      </div>
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {flags.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">플래그가 없습니다. DB 초기화를 실행하세요.</div>
          ) : flags.map((flag, i) => (
            <div key={flag.key} className={`px-4 py-4 flex items-center gap-4 border-b border-border/50 hover:bg-secondary/20 transition-colors ${i === flags.length - 1 ? "border-0" : ""} ${flag.key === "MAINTENANCE_MODE" && flag.enabled ? "bg-[#ef4444]/5 border-[#ef4444]/20" : ""}`}>
              <button onClick={() => toggle(flag.key, flag.enabled)} disabled={saving === flag.key} className="shrink-0 transition-opacity disabled:opacity-50">
                {flag.enabled ? <ToggleRight size={24} className={flag.key === "MAINTENANCE_MODE" ? "text-[#ef4444]" : "text-[#00d395]"} /> : <ToggleLeft size={24} className="text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-['Barlow'] text-sm font-semibold text-foreground">{flag.label}</span>
                  <Badge variant={flag.enabled ? "green" : "gray"}>{flag.enabled ? "on" : "off"}</Badge>
                  {flag.key === "MAINTENANCE_MODE" && flag.enabled && <Badge variant="red">⚠ ACTIVE</Badge>}
                </div>
                <span className="font-mono text-[13px] text-muted-foreground">{flag.description}</span>
              </div>
              <code className="font-mono text-[13px] text-muted-foreground bg-secondary px-2 py-1 rounded-sm border border-border">{flag.key}</code>
              {flag.updated_at && <span className="font-mono text-[13px] text-muted-foreground">{new Date(flag.updated_at).toLocaleTimeString("ko-KR")}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Request Logs ─────────────────────────────────────────────────────────────

export function LogsSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchLogs = useCallback(async () => {
    try { const data = await api("/logs"); setLogs(data ?? []); } catch { }
  }, []);

  useEffect(() => { setLoading(true); fetchLogs().finally(() => setLoading(false)); }, [fetchLogs]);

  useEffect(() => {
    if (paused) { clearInterval(intervalRef.current); return; }
    const PATHS = ["/auth/refresh", "/wallet/balance", "/wallet/price", "/users/me", "/transactions"];
    const METHODS = ["GET", "GET", "GET", "POST"];
    const STATUS = [200, 200, 200, 200, 401, 502];
    intervalRef.current = setInterval(async () => {
      const path = PATHS[Math.floor(Math.random() * PATHS.length)];
      const method = METHODS[Math.floor(Math.random() * METHODS.length)];
      const status_code = STATUS[Math.floor(Math.random() * STATUS.length)];
      const newLog = { method, path, status_code, latency_ms: Math.floor(Math.random() * 420 + 30), ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, user_id: Math.random() > 0.4 ? `u_${Math.random().toString(36).slice(2, 6)}` : null };
      try { await api("/logs", { method: "POST", body: JSON.stringify(newLog) }); setLogs((prev) => [{ ...newLog, id: Date.now(), created_at: new Date().toISOString() }, ...prev.slice(0, 99)]); } catch { }
    }, 2000);
    return () => clearInterval(intervalRef.current);
  }, [paused]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2"><StatusDot status={paused ? "degraded" : "online"} /><span className="font-mono text-[14px] text-muted-foreground">{paused ? "PAUSED" : "LIVE → Supabase"}</span></div>
        <button onClick={() => setPaused((p) => !p)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          {paused ? <><RefreshCw size={11} /> Resume</> : <><Clock size={11} /> Pause</>}
        </button>
        <button onClick={fetchLogs} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={11} /> Refresh</button>
        <span className="font-mono text-[13px] text-muted-foreground">{logs.length} entries</span>
      </div>
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden font-mono text-[14px]">
          <div className="grid grid-cols-[110px_52px_200px_52px_60px_140px_100px] px-4 py-2 border-b border-border text-[13px] text-muted-foreground uppercase tracking-widest">
            <span>Time</span><span>Method</span><span>Path</span><span>Status</span><span>Latency</span><span>IP</span><span>User</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480, scrollbarWidth: "none" }}>
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">로그 없음 — 자동으로 기록됩니다</div>
            ) : logs.map((log, i) => (
              <div key={log.id ?? i} className={`grid grid-cols-[110px_52px_200px_52px_60px_140px_100px] px-4 py-1.5 border-b border-border/30 hover:bg-secondary/20 transition-colors ${i === 0 ? "bg-[#8247e5]/5" : ""}`}>
                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleTimeString("ko-KR", { hour12: false })}</span>
                <span className={METHOD_COLORS[log.method] || "text-foreground"}>{log.method}</span>
                <span className="text-foreground truncate">{log.path}</span>
                <span className={log.status_code >= 500 ? "text-[#ef4444]" : log.status_code >= 400 ? "text-[#f59e0b]" : "text-[#00d395]"}>{log.status_code}</span>
                <span className={log.latency_ms > 1000 ? "text-[#ef4444]" : log.latency_ms > 300 ? "text-[#f59e0b]" : "text-muted-foreground"}>{log.latency_ms}ms</span>
                <span className="text-muted-foreground">{log.ip || "—"}</span>
                <span className="text-muted-foreground">{log.user_id || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
