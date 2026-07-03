import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, Building2, Wallet, TrendingUp, DollarSign, Clock,
  ShieldCheck, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Store, Network, CircleDollarSign, Activity,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { projectId } from "../../../utils/supabase/info";
import { StatusDot, Spinner, api } from "./shared";
import { useI18n } from "../../lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n}`;
}

function fmtUsd(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const KRW_RATE = 1380;
function fmtKrw(n: number | null | undefined) {
  if (n == null) return "—";
  return `₩${Math.round(Number(n) * KRW_RATE).toLocaleString("ko-KR")}`;
}

function dayKey(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildDayRange(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    return dayKey(d);
  });
}

// ─── Mini KPI card ────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, accent = "#8247e5", delta, deltaUp, secondaryValue,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent?: string; delta?: string; deltaUp?: boolean; secondaryValue?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-sm p-4 flex flex-col gap-2 hover:border-[#8247e5]/25 transition-colors">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{label}</span>
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div className="font-['Barlow_Condensed'] text-[34px] font-bold leading-none" style={{ color: accent }}>{value}</div>
      {secondaryValue && <div className="font-mono text-[12px] text-muted-foreground/70">{secondaryValue}</div>}
      {delta && (
        <div className={`flex items-center gap-1 font-mono text-[13px] ${deltaUp ? "text-[#00d395]" : "text-[#ef4444]"}`}>
          {deltaUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {delta}
        </div>
      )}
      {sub && !delta && <div className="font-mono text-[13px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{title}</span>
      {sub && <><div className="h-px flex-1 bg-border/40" /><span className="font-mono text-[12px] text-muted-foreground/60">{sub}</span></>}
      {!sub && <div className="h-px flex-1 bg-border/40" />}
    </div>
  );
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function fetchDailyTxChart(days = 14, partnerIds?: string[]) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let q = supabase.from("transactions").select("created_at, amount_usd").gte("created_at", since);
  if (partnerIds?.length) q = q.in("partner_id", partnerIds);
  const { data } = await q;
  const keys = buildDayRange(days);
  const map: Record<string, { volume: number; fee: number }> = {};
  for (const tx of data ?? []) {
    const k = dayKey(new Date(tx.created_at));
    if (!map[k]) map[k] = { volume: 0, fee: 0 };
    const amt = Number(tx.amount_usd ?? 0);
    map[k].volume += amt;
    map[k].fee += amt * 0.025;
  }
  return keys.map((k) => ({ d: k, volume: map[k]?.volume ?? 0, fee: map[k]?.fee ?? 0 }));
}

async function fetchDailyUserChart(days = 14, partnerIds?: string[]) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let q = supabase.from("users").select("created_at").gte("created_at", since);
  if (partnerIds?.length) q = q.in("partner_id", partnerIds);
  const { data } = await q;
  const keys = buildDayRange(days);
  const map: Record<string, number> = {};
  for (const u of data ?? []) {
    const k = dayKey(new Date(u.created_at));
    map[k] = (map[k] ?? 0) + 1;
  }
  return keys.map((k) => ({ d: k, users: map[k] ?? 0 }));
}

async function fetchApiHourChart() {
  const since = new Date(Date.now() - 24 * 3600000).toISOString();
  const { data } = await supabase.from("logs").select("created_at, status_code").gte("created_at", since);
  const map: Record<number, { req: number; err: number }> = {};
  for (const log of data ?? []) {
    const h = new Date(log.created_at).getHours();
    if (!map[h]) map[h] = { req: 0, err: 0 };
    map[h].req++;
    if (log.status_code >= 400) map[h].err++;
  }
  return Array.from({ length: 24 }, (_, h) => ({
    h: `${h}:00`,
    req: map[h]?.req ?? 0,
    err: map[h]?.err ?? 0,
  }));
}

// ─── System Admin Dashboard ───────────────────────────────────────────────────

function SystemAdminDashboard({ stats, loading }: { stats: any; loading: boolean }) {
  const { t, lang } = useI18n();
  const [partners, setPartners] = useState<any[]>([]);
  const [pendingWallets, setPendingWallets] = useState(0);
  const [activeWallets, setActiveWallets] = useState<number | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [newUsersToday, setNewUsersToday] = useState<number | null>(null);
  const [newUsersYesterday, setNewUsersYesterday] = useState<number | null>(null);
  const [volMonth, setVolMonth] = useState<number | null>(null);
  const [feeMonth, setFeeMonth] = useState<number | null>(null);
  const [errorCount24h, setErrorCount24h] = useState<number | null>(null);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [dailyChart, setDailyChart] = useState<any[]>([]);
  const [usersDailyChart, setUsersDailyChart] = useState<any[]>([]);
  const [apiChart, setApiChart] = useState<any[]>([]);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const since24h = new Date(Date.now() - 24 * 3600000).toISOString();

        const [
          partnersData,
          { count: pending },
          { count: active },
          { data: recent },
          { count: todayCount },
          { count: yesterdayCount },
          { data: monthlyTx },
          { count: errCount },
          { data: errLogs },
          dailyTxData,
          dailyUserData,
          apiHourData,
        ] = await Promise.all([
          api("/partners"),
          supabase.from("wallets").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("wallets").select("*", { count: "exact", head: true }).neq("status", "pending"),
          supabase.from("users").select("id, email, created_at, role").order("created_at", { ascending: false }).limit(6),
          supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
          supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
          supabase.from("transactions").select("amount_usd").gte("created_at", monthStart.toISOString()),
          supabase.from("logs").select("*", { count: "exact", head: true }).gte("created_at", since24h).gte("status_code", 400),
          supabase.from("logs").select("method, path, status_code, latency_ms, created_at").gte("created_at", since24h).gte("status_code", 400).order("created_at", { ascending: false }).limit(5),
          fetchDailyTxChart(14),
          fetchDailyUserChart(14),
          fetchApiHourChart(),
        ]);

        setPartners(partnersData ?? []);
        setPendingWallets(pending ?? 0);
        setActiveWallets(active ?? 0);
        setRecentUsers(recent ?? []);
        setNewUsersToday(todayCount ?? 0);
        setNewUsersYesterday(yesterdayCount ?? 0);

        const mv = (monthlyTx ?? []).reduce((s: number, tx: any) => s + Number(tx.amount_usd ?? 0), 0);
        setVolMonth(mv);
        setFeeMonth(mv * 0.025);

        setErrorCount24h(errCount ?? 0);
        setRecentErrors(errLogs ?? []);
        setDailyChart(dailyTxData);
        setUsersDailyChart(dailyUserData);
        setApiChart(apiHourData);
      } catch { /* silent */ }
      finally { setInfoLoading(false); }
    })();
  }, []);

  const masters = partners.filter((p) => p.type === "master");
  const distributors = partners.filter((p) => p.type === "distributor");
  const stores = partners.filter((p) => p.type === "store");

  const totalUsers = stats?.totalUsers ?? null;
  const t2Users = stats?.t2Users ?? null;
  const totalTx = stats?.totalTx ?? null;
  const vol24 = stats?.volume24h ? parseFloat(stats.volume24h) : null;
  const fee24 = vol24 != null ? vol24 * 0.025 : null;

  const newUsersDelta = newUsersToday != null && newUsersYesterday != null && newUsersYesterday > 0
    ? `${newUsersYesterday > 0 ? ((newUsersToday - newUsersYesterday) / newUsersYesterday * 100).toFixed(1) : "0"}% ${t("dash_vs_yesterday")}`
    : undefined;
  const newUsersDeltaUp = newUsersToday != null && newUsersYesterday != null ? newUsersToday >= newUsersYesterday : undefined;

  const STATUS_COLOR: Record<number, string> = { 2: "#00d395", 3: "#f59e0b", 4: "#f59e0b", 5: "#ef4444" };

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className="flex items-center gap-3 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-4 py-2.5">
        <StatusDot status="online" />
        <span className="font-mono text-[13px] text-[#00d395]">LIVE</span>
        <div className="flex-1" />
        <span className="font-mono text-[12px] text-muted-foreground">Refreshed {new Date().toLocaleTimeString("ko-KR")}</span>
      </div>

      {/* KPI — Members / Partners */}
      <div>
        <SectionHeader title={t("dash_members_partners")} />
        <div className="grid grid-cols-4 gap-3">
          <KpiCard icon={Users} label={t("dash_total_users")} value={loading ? "…" : fmt(totalUsers)} sub={`T2 KYC: ${t2Users ?? "—"}`} accent="#8247e5" />
          <KpiCard
            icon={Users} label={t("dash_today_new")}
            value={infoLoading ? "…" : fmt(newUsersToday)}
            sub={t("dash_since_midnight")}
            accent="#8247e5"
            delta={newUsersDelta}
            deltaUp={newUsersDeltaUp}
          />
          <KpiCard icon={Wallet} label={t("dash_active_wallets")} value={infoLoading ? "…" : fmt(activeWallets)} sub={`Pending: ${pendingWallets}`} accent="#3b82f6" />
          <KpiCard icon={Building2} label={t("dash_total_partners")} value={infoLoading ? "…" : String(partners.length)} sub={`Master ${masters.length} · Dist. ${distributors.length} · Store ${stores.length}`} accent="#00d395" />
        </div>
      </div>

      {/* KPI — Deposits / Fees */}
      <div>
        <SectionHeader title={t("dash_deposit_fee")} />
        <div className="grid grid-cols-4 gap-3">
          <KpiCard icon={DollarSign} label={t("dash_daily_vol")} value={loading ? "…" : (lang === "ko" ? fmtKrw(vol24) : fmtUsd(vol24))} secondaryValue={loading ? undefined : (lang === "ko" ? fmtUsd(vol24) : fmtKrw(vol24))} sub="24h USDC" accent="#00d395" />
          <KpiCard icon={CircleDollarSign} label={t("dash_daily_fee")} value={loading ? "…" : (lang === "ko" ? fmtKrw(fee24) : fmtUsd(fee24))} secondaryValue={loading ? undefined : (lang === "ko" ? fmtUsd(fee24) : fmtKrw(fee24))} sub={t("dash_system_fee")} accent="#00d395" />
          <KpiCard icon={TrendingUp} label={t("dash_monthly_vol")} value={infoLoading ? "…" : (lang === "ko" ? fmtKrw(volMonth) : fmtUsd(volMonth))} secondaryValue={infoLoading ? undefined : (lang === "ko" ? fmtUsd(volMonth) : fmtKrw(volMonth))} sub={`${new Date().getMonth() + 1} ${t("dash_month_accum")}`} accent="#f59e0b" />
          <KpiCard icon={TrendingUp} label={t("dash_monthly_fee")} value={infoLoading ? "…" : (lang === "ko" ? fmtKrw(feeMonth) : fmtUsd(feeMonth))} secondaryValue={infoLoading ? undefined : (lang === "ko" ? fmtUsd(feeMonth) : fmtKrw(feeMonth))} sub={`${new Date().getMonth() + 1} ${t("dash_month_accum")}`} accent="#f59e0b" />
        </div>
      </div>

      {/* KPI — Transactions / Approvals */}
      <div>
        <SectionHeader title={t("dash_tx_approval")} />
        <div className="grid grid-cols-4 gap-3">
          <KpiCard icon={Activity} label={t("dash_total_tx")} value={loading ? "…" : fmt(totalTx)} sub={t("dash_all_accum")} accent="#8247e5" />
          <KpiCard icon={Clock} label={t("dash_wallet_pending_card")} value={infoLoading ? "…" : String(pendingWallets)} sub={t("dash_manual_approve")} accent={pendingWallets > 0 ? "#ef4444" : "#00d395"} />
          <KpiCard icon={ShieldCheck} label={t("dash_webhook_rate")} value={loading ? "…" : `${stats?.webhookSuccessRate ?? "—"}%`} sub={`Retry: ${stats?.retryingWebhooks ?? "—"}`} accent="#00d395" />
          <KpiCard icon={AlertTriangle} label={t("dash_error_24h")} value={infoLoading ? "…" : String(errorCount24h ?? 0)} sub={t("dash_api_4xx5xx")} accent={errorCount24h ? "#ef4444" : "#00d395"} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-card border border-border rounded-sm p-4">
          <SectionHeader title={t("dash_vol_chart")} />
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={dailyChart} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8247e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8247e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d395" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d395" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={(v) => v === 0 ? "0" : `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#e2e4e9" }} labelStyle={{ color: "#6b7280" }} formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name === "volume" ? t("dash_deposit_label") : t("dash_fee_label")]} />
              <Area type="monotone" dataKey="volume" stroke="#8247e5" strokeWidth={1.5} fill="url(#volGrad)" name="volume" />
              <Area type="monotone" dataKey="fee" stroke="#00d395" strokeWidth={1} fill="url(#feeGrad)" name="fee" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-2 bg-card border border-border rounded-sm p-4">
          <SectionHeader title={t("dash_new_users_chart")} />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={usersDailyChart} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#e2e4e9" }} labelStyle={{ color: "#6b7280" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => [v, t("dash_new_user_label")]} />
              <Bar dataKey="users" fill="#8247e5" opacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* API requests chart */}
      <div className="bg-card border border-border rounded-sm p-4">
        <SectionHeader title={t("dash_api_chart")} sub={t("dash_logs_table")} />
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={apiChart} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="h" tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} interval={3} />
            <YAxis tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#e2e4e9" }} labelStyle={{ color: "#6b7280" }} />
            <Area type="monotone" dataKey="req" stroke="#3b82f6" strokeWidth={1.5} fill="url(#reqGrad)" name={t("dash_req_label")} />
            <Area type="monotone" dataKey="err" stroke="#ef4444" strokeWidth={1} fill="url(#errGrad)" name={t("dash_err_label")} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Partner hierarchy */}
        <div className="bg-card border border-border rounded-sm p-4">
          <SectionHeader title={t("dash_partner_hierarchy")} />
          {infoLoading ? <Spinner /> : (
            <div className="space-y-2">
              {[
                { label: t("role_master"), count: masters.length, color: "#8247e5", icon: Network },
                { label: t("role_distributor"), count: distributors.length, color: "#3b82f6", icon: Building2 },
                { label: t("role_store"), count: stores.length, color: "#00d395", icon: Store },
              ].map(({ label, count, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <Icon size={13} style={{ color }} />
                  <span className="font-mono text-[13px] text-foreground flex-1">{label}</span>
                  <span className="font-['Barlow_Condensed'] text-lg font-bold" style={{ color }}>{count}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 px-3 py-2 mt-1 border-t border-border/40">
                <Clock size={13} className="text-[#ef4444]" />
                <span className="font-mono text-[13px] text-foreground flex-1">{t("dash_wallet_approval_queue")}</span>
                <span className="font-['Barlow_Condensed'] text-lg font-bold text-[#ef4444]">{pendingWallets}</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent new users */}
        <div className="bg-card border border-border rounded-sm p-4">
          <SectionHeader title={t("dash_recent_new_users")} />
          {infoLoading ? <Spinner /> : (
            <div className="space-y-1.5">
              {recentUsers.length === 0 && <div className="font-mono text-[13px] text-muted-foreground">{t("dash_no_data")}</div>}
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-[#8247e5]/20 flex items-center justify-center shrink-0">
                    <span className="font-mono text-[10px] text-[#8247e5]">{(u.email?.[0] ?? "?").toUpperCase()}</span>
                  </div>
                  <span className="font-mono text-[12px] text-foreground flex-1 truncate">{u.email}</span>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent API errors */}
        <div className="bg-card border border-border rounded-sm p-4">
          <SectionHeader title={t("dash_recent_api_errors")} />
          {infoLoading ? <Spinner /> : recentErrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[120px] gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00d395]" />
              <span className="font-mono text-[13px] text-[#00d395]">{t("dash_no_errors")}</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentErrors.map((log, i) => {
                const statusGroup = Math.floor((log.status_code ?? 0) / 100);
                const color = STATUS_COLOR[statusGroup] ?? "#6b7280";
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <span className="font-mono text-[11px] font-bold shrink-0" style={{ color }}>{log.status_code}</span>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-10">{log.method}</span>
                    <span className="font-mono text-[11px] text-foreground flex-1 truncate">{log.path}</span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">{log.latency_ms}ms</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Partner Dashboard ────────────────────────────────────────────────────────

function PartnerDashboard({
  role, partnerId, partnerName,
}: {
  role: string; partnerId: string | null; partnerName?: string | null;
}) {
  const [stats, setStats] = useState<any>(null);
  const [subPartners, setSubPartners] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [walletCount, setWalletCount] = useState<number | null>(null);
  const [pendingWallets, setPendingWallets] = useState(0);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [dailyChart, setDailyChart] = useState<any[]>([]);
  const [usersDailyChart, setUsersDailyChart] = useState<any[]>([]);
  const [volMonth, setVolMonth] = useState<number | null>(null);
  const [newUsersToday, setNewUsersToday] = useState<number | null>(null);
  const [newUsersYesterday, setNewUsersYesterday] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const { t, lang } = useI18n();
  const ROLE_KO: Record<string, string> = { master: t("role_master"), distributor: t("role_distributor"), store: t("role_store") };
  const roleLabel = ROLE_KO[role] ?? role;

  const buildAllowedIds = useCallback((all: any[]) => {
    if (!partnerId) return null;
    const ids = new Set<string>([partnerId]);
    for (const p of all) {
      if (p.parent_id === partnerId) {
        ids.add(p.id);
        for (const pp of all) {
          if (pp.parent_id === p.id) ids.add(pp.id);
        }
      }
    }
    return ids;
  }, [partnerId]);

  useEffect(() => {
    if (!partnerId) return;
    (async () => {
      try {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

        const [allPartners, globalStats] = await Promise.all([
          api("/partners"),
          api("/stats").catch(() => null),
        ]);

        setStats(globalStats);
        const allowedIds = buildAllowedIds(allPartners ?? []);
        const idList = allowedIds ? Array.from(allowedIds) : [partnerId];

        const sub = (allPartners ?? []).filter((p: any) => p.parent_id === partnerId);
        setSubPartners(sub);

        const [
          { count: mc },
          { count: wc },
          { count: pending },
          { data: recent },
          { count: todayCount },
          { count: yesterdayCount },
          { data: monthlyTx },
          dailyTxData,
          dailyUserData,
        ] = await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }).eq("partner_id", partnerId),
          supabase.from("wallets").select("*", { count: "exact", head: true }).in("partner_id", idList).neq("status", "pending"),
          supabase.from("wallets").select("*", { count: "exact", head: true }).eq("status", "pending").eq("partner_id", partnerId),
          supabase.from("users").select("id, email, created_at, kyc_tier").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(6),
          supabase.from("users").select("*", { count: "exact", head: true }).eq("partner_id", partnerId).gte("created_at", todayStart.toISOString()),
          supabase.from("users").select("*", { count: "exact", head: true }).eq("partner_id", partnerId).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
          supabase.from("transactions").select("amount_usd").in("partner_id", idList).gte("created_at", monthStart.toISOString()),
          fetchDailyTxChart(14, idList),
          fetchDailyUserChart(14, [partnerId]),
        ]);

        setMemberCount(mc ?? 0);
        setWalletCount(wc ?? 0);
        setPendingWallets(pending ?? 0);
        setRecentUsers(recent ?? []);
        setNewUsersToday(todayCount ?? 0);
        setNewUsersYesterday(yesterdayCount ?? 0);
        setVolMonth((monthlyTx ?? []).reduce((s: number, tx: any) => s + Number(tx.amount_usd ?? 0), 0));
        setDailyChart(dailyTxData);
        setUsersDailyChart(dailyUserData);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [partnerId, buildAllowedIds]);

  const roleColor = role === "master" ? "#8247e5" : role === "distributor" ? "#3b82f6" : "#00d395";
  const feeRate = role === "master" ? 0.015 : role === "distributor" ? 0.010 : 0.005;

  const vol24 = stats?.volume24h ? parseFloat(stats.volume24h) : null;
  const fee24 = vol24 != null && memberCount != null && (stats?.totalUsers ?? 0) > 0
    ? vol24 * feeRate * memberCount / stats.totalUsers
    : null;
  const feeMonthCalc = volMonth != null ? volMonth * feeRate : null;
  const walletRate = memberCount && walletCount != null ? ((walletCount / memberCount) * 100).toFixed(1) : null;

  const newUsersDelta = newUsersToday != null && newUsersYesterday != null && newUsersYesterday > 0
    ? `${((newUsersToday - newUsersYesterday) / newUsersYesterday * 100).toFixed(1)}% ${t("dash_vs_yesterday")}`
    : undefined;
  const newUsersDeltaUp = newUsersToday != null && newUsersYesterday != null ? newUsersToday >= newUsersYesterday : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 border border-border rounded-sm px-4 py-2.5" style={{ background: `${roleColor}08`, borderColor: `${roleColor}25` }}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: roleColor }} />
        <span className="font-mono text-[13px] font-bold uppercase tracking-widest" style={{ color: roleColor }}>{roleLabel}</span>
        <div className="h-3 w-px bg-border" />
        <span className="font-mono text-[13px] text-foreground">{partnerName ?? t("dash_my_partner")}</span>
        <div className="flex-1" />
        <span className="font-mono text-[12px] text-muted-foreground">{t("dash_org_isolated")}</span>
        <div className="h-3 w-px bg-border" />
        <span className="font-mono text-[12px] text-muted-foreground">{t("dash_updated")} {new Date().toLocaleTimeString()}</span>
      </div>

      <div>
        <SectionHeader title={t("dash_my_org")} />
        <div className="grid grid-cols-4 gap-3">
          <KpiCard icon={Users} label={t("dash_my_members")} value={loading ? "…" : fmt(memberCount)} sub={t("dash_direct_members")} accent={roleColor} />
          <KpiCard icon={Users} label={t("dash_today_new")} value={loading ? "…" : fmt(newUsersToday)} sub={t("dash_since_midnight")} accent={roleColor} delta={newUsersDelta} deltaUp={newUsersDeltaUp} />
          <KpiCard icon={Wallet} label={t("dash_active_wallets")} value={loading ? "…" : fmt(walletCount)} sub={walletRate ? `${t("dash_wallet_owned")} ${walletRate}%` : undefined} accent="#3b82f6" />
          <KpiCard icon={Building2} label={t("dash_direct_sub_partners")} value={loading ? "…" : String(subPartners.length)} sub={role === "master" ? t("dash_distributor_count_label") : t("dash_store_count_label")} accent="#00d395" />
        </div>
      </div>

      <div>
        <SectionHeader title={t("dash_fee_finance")} />
        <div className="grid grid-cols-4 gap-3">
          <KpiCard icon={CircleDollarSign} label={t("dash_my_fee_daily")} value={loading ? "…" : (lang === "ko" ? fmtKrw(fee24) : fmtUsd(fee24))} secondaryValue={loading ? undefined : (lang === "ko" ? fmtUsd(fee24) : fmtKrw(fee24))} sub={`${t("dash_fee_rate_label")} ${(feeRate * 100).toFixed(1)}%`} accent="#00d395" />
          <KpiCard icon={TrendingUp} label={t("dash_my_fee_monthly")} value={loading ? "…" : (lang === "ko" ? fmtKrw(feeMonthCalc) : fmtUsd(feeMonthCalc))} secondaryValue={loading ? undefined : (lang === "ko" ? fmtUsd(feeMonthCalc) : fmtKrw(feeMonthCalc))} sub={`${new Date().getMonth() + 1} ${t("dash_month_accum")}`} accent="#f59e0b" />
          <KpiCard icon={DollarSign} label={t("dash_org_vol_monthly")} value={loading ? "…" : (lang === "ko" ? fmtKrw(volMonth) : fmtUsd(volMonth))} secondaryValue={loading ? undefined : (lang === "ko" ? fmtUsd(volMonth) : fmtKrw(volMonth))} sub={`${new Date().getMonth() + 1} ${t("dash_month_accum")}`} accent="#00d395" />
          <KpiCard icon={Activity} label={t("dash_processed_tx")} value={loading || !stats ? "…" : fmt(stats.totalTx)} sub={t("dash_overall_basis")} accent="#8247e5" />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-card border border-border rounded-sm p-4">
          <SectionHeader title={t("dash_fee_trend")} />
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={dailyChart} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="p-feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={roleColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={roleColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={(v) => v === 0 ? "0" : `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#e2e4e9" }} labelStyle={{ color: "#6b7280" }} formatter={(v: number) => [`$${v.toLocaleString()}`, t("dash_fee_label")]} />
              <Area type="monotone" dataKey="fee" stroke={roleColor} strokeWidth={1.5} fill="url(#p-feeGrad)" name="fee" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-2 bg-card border border-border rounded-sm p-4">
          <SectionHeader title={t("dash_new_sub_members")} />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={usersDailyChart} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#e2e4e9" }} labelStyle={{ color: "#6b7280" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => [v, t("dash_new_user_label")]} />
              <Bar dataKey="users" fill={roleColor} opacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-sm p-4">
          <SectionHeader title={role === "master" ? t("dash_sub_distributors") : t("dash_sub_stores")} />
          {loading ? <Spinner /> : subPartners.length === 0 ? (
            <div className="font-mono text-[13px] text-muted-foreground py-4 text-center">{t("dash_no_sub_partners")}</div>
          ) : (
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {subPartners.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: roleColor }} />
                  <span className="font-mono text-[12px] text-foreground flex-1">{p.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{p.code}</span>
                  <div className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${p.status === "active" ? "text-[#00d395] bg-[#00d395]/10" : "text-[#ef4444] bg-[#ef4444]/10"}`}>
                    {p.status === "active" ? t("dash_active_status") : t("dash_inactive_status")}
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{p.fee_rate}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-sm p-4">
          <SectionHeader title={t("dash_recent_sub_members")} />
          {loading ? <Spinner /> : (
            <div className="space-y-1.5">
              {recentUsers.length === 0 && <div className="font-mono text-[13px] text-muted-foreground py-4 text-center">{t("dash_no_sub_members")}</div>}
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${roleColor}20` }}>
                    <span className="font-mono text-[10px]" style={{ color: roleColor }}>{(u.email?.[0] ?? "?").toUpperCase()}</span>
                  </div>
                  <span className="font-mono text-[12px] text-foreground flex-1 truncate">{u.email}</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground">{u.kyc_tier ?? "T0"}</span>
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function DashboardSection({
  role = "system_admin",
  partnerId = null,
  partnerName = null,
}: {
  role?: string;
  partnerId?: string | null;
  partnerName?: string | null;
}) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api("/stats");
      setStats(data);
    } catch { setStats(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, [fetchStats]);

  if (role === "system_admin") {
    return <SystemAdminDashboard stats={stats} loading={loading} />;
  }

  return <PartnerDashboard role={role} partnerId={partnerId} partnerName={partnerName} />;
}
