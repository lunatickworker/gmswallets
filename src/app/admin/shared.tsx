import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

// ─── API client ───────────────────────────────────────────────────────────────

export const BASE = `https://${projectId}.supabase.co/functions/v1/server`;

export async function api(path: string, opts?: RequestInit) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${publicAnonKey}`, ...opts?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiAuth(path: string, token: string, opts?: RequestInit) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...opts?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "yellow" | "red" | "blue" | "purple" | "gray" }) {
  const v = {
    default: "bg-secondary text-muted-foreground border-border",
    green: "bg-[#00d395]/10 text-[#00d395] border-[#00d395]/30",
    yellow: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30",
    red: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30",
    blue: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30",
    purple: "bg-[#8247e5]/10 text-[#8247e5] border-[#8247e5]/30",
    gray: "bg-secondary/60 text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center border px-1.5 py-0.5 text-[13px] font-mono font-bold uppercase tracking-widest rounded-sm ${v[variant]}`}>
      {children}
    </span>
  );
}

export function StatusDot({ status }: { status: "online" | "degraded" | "offline" | "healthy" }) {
  const colors = { online: "#00d395", healthy: "#00d395", degraded: "#f59e0b", offline: "#ef4444" };
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: colors[status] }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: colors[status] }} />
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-[#8247e5]/30 border-t-[#8247e5] rounded-full animate-spin" />
    </div>
  );
}

export function StatCard({ label, value, delta, deltaUp, sub, accent }: {
  label: string; value: string; delta?: string; deltaUp?: boolean; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-sm p-4 hover:border-[#8247e5]/30 transition-colors">
      <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-2">{label}</div>
      <div className="font-['Barlow_Condensed'] text-3xl font-bold tracking-tight" style={{ color: accent || "var(--foreground)" }}>{value}</div>
      {delta && (
        <div className={`flex items-center gap-1 mt-1 font-mono text-[13px] ${deltaUp ? "text-[#00d395]" : "text-[#ef4444]"}`}>
          {deltaUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {delta}
        </div>
      )}
      {sub && <div className="font-mono text-[13px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export const METHOD_COLORS: Record<string, string> = {
  GET: "text-[#00d395]",
  POST: "text-[#8247e5]",
  PATCH: "text-[#f59e0b]",
  PUT: "text-[#3b82f6]",
  DELETE: "text-[#ef4444]",
};
