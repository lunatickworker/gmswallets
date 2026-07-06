import { useState, useEffect, useCallback, useRef } from "react";
import { Globe, Lock, Zap, AlertTriangle, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import { Badge, StatusDot, Spinner, StatCard, METHOD_COLORS, api } from "./shared";
import { supabase } from "../../lib/supabase";
import { useI18n } from "../../lib/i18n";

// ─── Uptime history (localStorage) ───────────────────────────────────────────

const UPTIME_KEY = "gms_svc_uptime_v2";
const MAX_HISTORY = 120; // ~1h at 30s interval

function loadHistory(): Record<string, boolean[]> {
  try { return JSON.parse(localStorage.getItem(UPTIME_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveHistory(h: Record<string, boolean[]>) {
  try { localStorage.setItem(UPTIME_KEY, JSON.stringify(h)); } catch {}
}

function calcUptime(history: boolean[]): number {
  if (!history.length) return 100;
  return parseFloat(((history.filter(Boolean).length / history.length) * 100).toFixed(2));
}

function pushHistory(h: Record<string, boolean[]>, name: string, ok: boolean) {
  const arr = [...(h[name] ?? []), ok].slice(-MAX_HISTORY);
  return { ...h, [name]: arr };
}

// ─── Service check functions ──────────────────────────────────────────────────

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; latency: number; ok: boolean }> {
  const start = performance.now();
  try {
    const result = await fn();
    return { result, latency: Math.round(performance.now() - start), ok: true };
  } catch {
    return { result: null, latency: Math.round(performance.now() - start), ok: false };
  }
}

async function checkEdgeAPI(): Promise<{ latency: number; ok: boolean }> {
  const { latency, ok } = await timed(() => api("/health"));
  return { latency, ok };
}

async function checkTransak(): Promise<{ latency: number; ok: boolean }> {
  const { latency, ok } = await timed(() =>
    fetch("https://api.transak.com/api/v2/currencies/crypto-currencies", {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    }).then((r) => { if (!r.ok) throw new Error(String(r.status)); })
  );
  return { latency, ok };
}

async function checkSupabase(): Promise<{ latency: number; ok: boolean }> {
  const { latency, ok } = await timed(async () => {
    const { error } = await supabase.from("feature_flags").select("id").limit(1);
    if (error) throw error;
  });
  return { latency, ok };
}

async function checkCoinGecko(): Promise<{ latency: number; ok: boolean }> {
  const { latency, ok } = await timed(() =>
    fetch("https://api.coingecko.com/api/v3/ping", {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    }).then((r) => { if (!r.ok) throw new Error(String(r.status)); })
  );
  return { latency, ok };
}

// ─── Service definitions ──────────────────────────────────────────────────────

interface ServiceDef {
  name: string;
  host: string;
  region: string;
  checker: "edge" | "supabase" | "coingecko" | "transak";
}

const SERVICE_DEFS: ServiceDef[] = [
  { name: "Edge API",      host: "supabase.co/functions/v1/server", region: "AP-Northeast", checker: "edge" },
  { name: "Supabase DB",   host: "*.supabase.co",                   region: "AP-Northeast", checker: "supabase" },
  { name: "CoinGecko API", host: "api.coingecko.com",               region: "Global",       checker: "coingecko" },
  { name: "Transak",       host: "api.transak.com",                 region: "Global",       checker: "transak" },
];

interface ServiceState {
  name: string;
  host: string;
  region: string;
  latency: number;
  uptime: number;
  status: "online" | "degraded" | "offline" | "checking";
}

function deriveStatus(latency: number, ok: boolean, uptime: number): "online" | "degraded" | "offline" {
  if (!ok) return uptime < 95 ? "offline" : "degraded";
  if (latency > 500 || uptime < 99) return "degraded";
  return "online";
}

// ─── Services Section ─────────────────────────────────────────────────────────

export function ServicesSection() {
  const [services, setServices] = useState<ServiceState[]>(
    SERVICE_DEFS.map((s) => ({ name: s.name, host: s.host, region: s.region, latency: 0, uptime: 100, status: "checking" as const }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const historyRef = useRef<Record<string, boolean[]>>(loadHistory());

  const runChecks = useCallback(async () => {
    setChecking(true);

    const [edgeResult, supaResult, geckoResult, transakResult] = await Promise.all([
      checkEdgeAPI(),
      checkSupabase(),
      checkCoinGecko(),
      checkTransak(),
    ]);

    const results: Record<string, { latency: number; ok: boolean }> = {
      "Edge API":      edgeResult,
      "Supabase DB":   supaResult,
      "CoinGecko API": geckoResult,
      "Transak":       transakResult,
    };

    let h = historyRef.current;
    for (const [name, r] of Object.entries(results)) {
      h = pushHistory(h, name, r.ok);
    }
    historyRef.current = h;
    saveHistory(h);

    setServices(SERVICE_DEFS.map((def) => {
      const r = results[def.name];
      const history = h[def.name] ?? [];
      const uptime = calcUptime(history);
      if (!r) return { name: def.name, host: def.host, region: def.region, latency: 0, uptime: 100, status: "checking" as const };
      return { name: def.name, host: def.host, region: def.region, latency: r.latency, uptime, status: deriveStatus(r.latency, r.ok, uptime) };
    }));

    setLastChecked(new Date());
    setChecking(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    runChecks();
    const id = setInterval(runChecks, 30_000);
    return () => clearInterval(id);
  }, [runChecks]);

  const online = services.filter((s) => s.status === "online").length;
  const degraded = services.filter((s) => s.status === "degraded" || s.status === "offline").length;
  const avgUptime = services.length
    ? parseFloat((services.reduce((a, s) => a + s.uptime, 0) / services.length).toFixed(2))
    : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {checking && <div className="w-3 h-3 border border-[#8247e5]/40 border-t-[#8247e5] rounded-full animate-spin" />}
          {lastChecked && (
            <span className="font-mono text-[13px] text-muted-foreground">
              Last check: {lastChecked.toLocaleTimeString(undefined, { hour12: false })}
            </span>
          )}
        </div>
        <button
          onClick={runChecks}
          disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={checking ? "animate-spin" : ""} /> Recheck
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Services Online" value={`${online} / ${services.length}`} accent="#00d395" />
        <StatCard label="Degraded" value={String(degraded)} accent="#f59e0b" />
        <StatCard label="Avg Uptime (rolling)" value={`${avgUptime}%`} accent="#8247e5" />
      </div>

      <div className="space-y-2">
        {services.map((svc) => (
          <div
            key={svc.name}
            className={`bg-card border rounded-sm p-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors ${
              svc.status === "degraded" ? "border-[#f59e0b]/30" :
              svc.status === "offline"  ? "border-[#ef4444]/30" : "border-border"
            }`}
          >
            {svc.status === "checking"
              ? <div className="w-2 h-2 border border-[#6b7280]/40 border-t-[#6b7280] rounded-full animate-spin shrink-0" />
              : <StatusDot status={svc.status === "offline" ? "offline" : svc.status} />
            }
            <div className="w-44 shrink-0">
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{svc.name}</div>
              <div className="font-mono text-[13px] text-muted-foreground mt-0.5">{svc.host}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe size={10} className="text-muted-foreground" />
              <span className="font-mono text-[13px] text-muted-foreground">{svc.region}</span>
            </div>
            <div className="flex-1" />
            <div className="text-right">
              <div className={`font-mono text-sm ${
                svc.status === "checking" ? "text-muted-foreground" :
                svc.latency > 500 ? "text-[#ef4444]" :
                svc.latency > 200 ? "text-[#f59e0b]" : "text-foreground"
              }`}>
                {svc.status === "checking" ? "…" : `${svc.latency}ms`}
              </div>
              <div className="font-mono text-[13px] text-muted-foreground">avg latency</div>
            </div>
            <div className="text-right w-20">
              <div className={`font-['Barlow_Condensed'] text-xl font-bold ${
                svc.uptime >= 99.9 ? "text-[#00d395]" :
                svc.uptime >= 99   ? "text-[#f59e0b]" : "text-[#ef4444]"
              }`}>
                {svc.status === "checking" ? "—" : `${svc.uptime}%`}
              </div>
              <div className="font-mono text-[13px] text-muted-foreground">uptime</div>
            </div>
            <Badge variant={
              svc.status === "online"   ? "green" :
              svc.status === "offline"  ? "red"   :
              svc.status === "checking" ? "gray"  : "yellow"
            }>
              {svc.status}
            </Badge>
          </div>
        ))}
      </div>

    </div>
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const STATIC_ROUTES = [
  { method: "POST", path: "/auth/register", auth: false, cache: false },
  { method: "POST", path: "/auth/login",    auth: false, cache: false },
  { method: "GET",  path: "/wallet/balance", auth: true,  cache: true  },
  { method: "GET",  path: "/wallet/price",   auth: true,  cache: true  },
  { method: "GET",  path: "/transactions",   auth: true,  cache: false },
  { method: "POST", path: "/webhooks/transak", auth: false, cache: false },
  { method: "GET",  path: "/users/me",       auth: true,  cache: false },
  { method: "PATCH",path: "/users/me",       auth: true,  cache: false },
];

interface RouteState {
  method: string; path: string; auth: boolean; cache: boolean;
  latency: number | null; rps: number | null; errorRate: number | null;
  status: "healthy" | "degraded" | "unknown";
}

export function RoutesSection() {
  const [routes, setRoutes] = useState<RouteState[]>(
    STATIC_ROUTES.map((r) => ({ ...r, latency: null, rps: null, errorRate: null, status: "unknown" as const }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [backendSupported, setBackendSupported] = useState<boolean | null>(null);

  const runChecks = useCallback(async () => {
    setChecking(true);
    try {
      const backendRoutes = await api("/health/routes");
      setBackendSupported(true);

      if (Array.isArray(backendRoutes) && backendRoutes.length > 0) {
        setRoutes(STATIC_ROUTES.map((r) => {
          const br = backendRoutes.find((x: any) => x.path === r.path && x.method === r.method);
          if (!br) return { ...r, latency: null, rps: null, errorRate: null, status: "unknown" as const };
          const status: "healthy" | "degraded" | "unknown" = br.errorRate > 0.5 || br.latency > 400 ? "degraded" : "healthy";
          return { ...r, latency: br.latency, rps: br.rps ?? null, errorRate: br.errorRate ?? 0, status };
        }));
      } else {
        // Backend alive but no traffic yet — leave status as "unknown"
        setRoutes(STATIC_ROUTES.map((r) => ({ ...r, latency: null, rps: null, errorRate: null, status: "unknown" as const })));
      }
    } catch {
      setBackendSupported(false);
      setRoutes(STATIC_ROUTES.map((r) => ({ ...r, latency: null, rps: null, errorRate: null, status: "unknown" as const })));
    }

    setLastChecked(new Date());
    setChecking(false);
  }, []);

  useEffect(() => {
    runChecks();
    const id = setInterval(runChecks, 60_000);
    return () => clearInterval(id);
  }, [runChecks]);

  const healthy = routes.filter((r) => r.status === "healthy").length;
  const degraded = routes.filter((r) => r.status === "degraded").length;

  return (
    <div className="space-y-4">
      {backendSupported === false && (
        <div className="flex items-center gap-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-2.5">
          <AlertTriangle size={12} className="text-[#f59e0b]" />
          <span className="font-mono text-[13px] text-[#f59e0b]">
            Cannot connect to backend. Check if Edge Function is deployed.
          </span>
        </div>
      )}
      {backendSupported === true && routes.every((r) => r.status === "unknown") && (
        <div className="flex items-center gap-3 bg-secondary/50 border border-border rounded-sm px-4 py-2.5">
          <span className="font-mono text-[13px] text-muted-foreground">
            No traffic data yet. Will update automatically when API requests occur.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {checking && <div className="w-3 h-3 border border-[#8247e5]/40 border-t-[#8247e5] rounded-full animate-spin" />}
          {lastChecked && (
            <span className="font-mono text-[13px] text-muted-foreground">
              Last measured: {lastChecked.toLocaleTimeString(undefined, { hour12: false })}
            </span>
          )}
        </div>
        <button
          onClick={runChecks}
          disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={checking ? "animate-spin" : ""} /> Recheck
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Routes" value={String(routes.length)} />
        <StatCard label="Healthy" value={String(healthy)} accent="#00d395" />
        <StatCard label="Degraded" value={String(degraded)} accent="#f59e0b" />
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
            {routes.map((r, i) => (
              <tr key={r.method + r.path} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === routes.length - 1 ? "border-0" : ""}`}>
                <td className="px-4 py-2.5"><span className={`font-mono text-sm font-bold ${METHOD_COLORS[r.method]}`}>{r.method}</span></td>
                <td className="px-4 py-2.5 font-mono text-sm text-foreground">{r.path}</td>
                <td className="px-4 py-2.5">
                  {r.latency == null
                    ? <span className="font-mono text-sm text-muted-foreground">…</span>
                    : <span className={`font-mono text-sm ${r.latency > 400 ? "text-[#ef4444]" : r.latency > 200 ? "text-[#f59e0b]" : "text-[#00d395]"}`}>{r.latency}ms</span>
                  }
                </td>
                <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">{r.rps ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {r.errorRate == null
                    ? <span className="font-mono text-sm text-muted-foreground">—</span>
                    : <span className={`font-mono text-sm ${r.errorRate > 0.5 ? "text-[#ef4444]" : r.errorRate > 0 ? "text-[#f59e0b]" : "text-muted-foreground"}`}>{r.errorRate.toFixed(1)}%</span>
                  }
                </td>
                <td className="px-4 py-2.5">{r.auth ? <Lock size={11} className="text-[#8247e5]" /> : <span className="font-mono text-[13px] text-muted-foreground">—</span>}</td>
                <td className="px-4 py-2.5">{r.cache ? <Zap size={11} className="text-[#00d395]" /> : <span className="font-mono text-[13px] text-muted-foreground">—</span>}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {r.status !== "unknown" && <StatusDot status={r.status} />}
                    <span className={`font-mono text-[13px] ${r.status === "healthy" ? "text-[#00d395]" : r.status === "degraded" ? "text-[#f59e0b]" : "text-muted-foreground"}`}>
                      {r.status === "unknown" ? "—" : r.status}
                    </span>
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
        <span className="font-mono text-[14px] text-[#f59e0b]">Feature flag changes are saved immediately to Supabase DB. Enabling MAINTENANCE_MODE blocks all user access.</span>
      </div>
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {flags.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">No flags. Run DB initialization.</div>
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

  const fetchLogs = useCallback(async () => {
    try { const data = await api("/logs"); setLogs(data ?? []); } catch { }
  }, []);

  useEffect(() => { setLoading(true); fetchLogs().finally(() => setLoading(false)); }, [fetchLogs]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2"><StatusDot status="online" /><span className="font-mono text-[14px] text-muted-foreground">LIVE → Supabase</span></div>
        <button onClick={fetchLogs} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh</button>
        <span className="font-mono text-[13px] text-muted-foreground">{logs.length} entries</span>
      </div>
      {loading && logs.length === 0 ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden font-mono text-[14px]">
          <div className="grid grid-cols-[110px_52px_200px_52px_60px_140px_100px] px-4 py-2 border-b border-border text-[13px] text-muted-foreground uppercase tracking-widest">
            <span>Time</span><span>Method</span><span>Path</span><span>Status</span><span>Latency</span><span>IP</span><span>User</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480, scrollbarWidth: "none" }}>
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">No logs — recorded automatically</div>
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
