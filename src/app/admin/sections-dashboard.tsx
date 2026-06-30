import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { projectId } from "../../../utils/supabase/info";
import { Badge, StatusDot, Spinner, StatCard, api } from "./shared";

const CHART_HOURS = Array.from({ length: 24 }, (_, i) => ({ h: `${i}:00`, req: 0, err: 0 }));

export function DashboardSection() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiChart] = useState(() =>
    CHART_HOURS.map((h) => ({ ...h, req: Math.floor(Math.random() * 860 + 120), err: Math.floor(Math.random() * 40) }))
  );
  const [latencyChart] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      d: `Jun ${i + 15}`,
      p50: Math.floor(Math.random() * 52 + 38),
      p95: Math.floor(Math.random() * 200 + 120),
      p99: Math.floor(Math.random() * 370 + 280),
    }))
  );

  const fetchStats = useCallback(async () => {
    try {
      const data = await api("/stats");
      setStats(data);
    } catch { setStats(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); const id = setInterval(fetchStats, 15000); return () => clearInterval(id); }, [fetchStats]);

  const SERVICES = [
    { name: "NestJS API", latency: 94, uptime: 99.97, status: "online" as const },
    { name: "Supabase DB", latency: 38, uptime: 99.99, status: "online" as const },
    { name: "Upstash Redis", latency: 12, uptime: 99.95, status: "online" as const },
    { name: "Alchemy RPC", latency: 187, uptime: 99.9, status: "degraded" as const },
    { name: "CoinGecko API", latency: 412, uptime: 98.2, status: "degraded" as const },
    { name: "Firebase FCM", latency: 67, uptime: 99.99, status: "online" as const },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-4 py-2.5">
        <StatusDot status="online" />
        <span className="font-mono text-[14px] text-[#00d395]">LIVE — Supabase Connected</span>
        <div className="h-3 w-px bg-border" />
        <span className="font-mono text-[14px] text-muted-foreground">Project: {projectId}</span>
        <div className="flex-1" />
        <span className="font-mono text-[13px] text-muted-foreground">Updated {new Date().toLocaleTimeString("ko-KR")}</span>
      </div>

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total Users" value={stats ? String(stats.totalUsers) : "—"} sub={stats ? `T2 KYC: ${stats.t2Users}` : ""} />
          <StatCard label="Total Transactions" value={stats ? String(stats.totalTx) : "—"} sub={stats ? `$${stats.volume24h} USDC (24h)` : ""} accent="#8247e5" />
          <StatCard label="Webhook Success" value={stats ? `${stats.webhookSuccessRate}%` : "—"} sub={stats ? `${stats.retryingWebhooks} retrying` : ""} accent="#00d395" />
          <StatCard label="DB Status" value="Online" sub="Supabase PostgreSQL" accent="#3b82f6" />
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-card border border-border rounded-sm p-4">
          <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-4">API Requests — 24h (Simulated)</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={apiChart} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="dash-reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8247e5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8247e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dash-errGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#e2e4e9" }} labelStyle={{ color: "#6b7280" }} />
              <Area type="monotone" dataKey="req" stroke="#8247e5" strokeWidth={1.5} fill="url(#dash-reqGrad)" name="Requests" />
              <Area type="monotone" dataKey="err" stroke="#ef4444" strokeWidth={1} fill="url(#dash-errGrad)" name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-2 bg-card border border-border rounded-sm p-4">
          <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-4">Latency Percentiles — 14d</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={latencyChart} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="dash-p50g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d395" stopOpacity={0.3} /><stop offset="95%" stopColor="#00d395" stopOpacity={0} /></linearGradient>
                <linearGradient id="dash-p95g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8247e5" stopOpacity={0.25} /><stop offset="95%" stopColor="#8247e5" stopOpacity={0} /></linearGradient>
                <linearGradient id="dash-p99g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} unit="ms" />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#e2e4e9" }} labelStyle={{ color: "#6b7280" }} />
              <Area type="monotone" dataKey="p50" stroke="#00d395" strokeWidth={1.5} fill="url(#dash-p50g)" name="p50" />
              <Area type="monotone" dataKey="p95" stroke="#8247e5" strokeWidth={1.5} fill="url(#dash-p95g)" name="p95" />
              <Area type="monotone" dataKey="p99" stroke="#f59e0b" strokeWidth={1} fill="url(#dash-p99g)" name="p99" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">External Service Health</span>
        </div>
        <div className="grid grid-cols-2">
          {SERVICES.map((svc, i) => (
            <div key={svc.name} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "border-r border-border/50" : ""} border-b border-border/30`}>
              <StatusDot status={svc.status} />
              <span className="font-['Barlow'] text-sm text-foreground font-medium w-32 shrink-0">{svc.name}</span>
              <span className="font-mono text-[13px] text-muted-foreground flex-1">{svc.latency}ms</span>
              <span className="font-mono text-[13px] text-muted-foreground">{svc.uptime}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
