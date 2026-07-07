import { useState, useEffect, useCallback, Fragment } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard, apiAuth, api } from "./shared";
import { useI18n } from "../../lib/i18n";

// ─── Date helpers ──────────────────────────────────────────────────────────────
type DatePreset = "today" | "yesterday" | "week" | "month" | "custom";

function getDateBounds(preset: DatePreset, from: string, to: string) {
  const now = new Date();
  const d2s = (d: Date) => d.toISOString().slice(0, 10);
  const today = d2s(now);
  if (preset === "today")     return { from: today, to: today };
  if (preset === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const ys = d2s(y); return { from: ys, to: ys };
  }
  if (preset === "week") {
    const w = new Date(now); w.setDate(w.getDate() - 6);
    return { from: d2s(w), to: today };
  }
  if (preset === "month") {
    return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: today };
  }
  return { from, to };
}

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "금일", yesterday: "어제", week: "7일", month: "이번달", custom: "기간설정",
};

const TX_TYPE_KO: Record<string, string>   = { purchase: "구매", swap: "스왑", send: "전송", receive: "수신" };
const TX_TYPE_VAR: Record<string, "yellow" | "purple" | "blue" | "green"> = {
  purchase: "yellow", swap: "purple", send: "blue", receive: "green",
};

// ─── DateFilter shared UI ─────────────────────────────────────────────────────
function DateFilter({
  preset, setPreset, from, setFrom, to, setTo,
}: {
  preset: DatePreset; setPreset: (p: DatePreset) => void;
  from: string; setFrom: (s: string) => void;
  to: string; setTo: (s: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[13px] text-muted-foreground">기간</span>
      {(["today", "yesterday", "week", "month", "custom"] as DatePreset[]).map((p) => (
        <button key={p} onClick={() => setPreset(p)}
          className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${preset === p ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
          {PRESET_LABELS[p]}
        </button>
      ))}
      {preset === "custom" && (
        <>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-secondary border border-border rounded-sm px-3 py-1.5 font-mono text-[13px] text-foreground focus:outline-none" />
          <span className="text-muted-foreground font-mono text-[13px]">~</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-secondary border border-border rounded-sm px-3 py-1.5 font-mono text-[13px] text-foreground focus:outline-none" />
        </>
      )}
    </div>
  );
}

// ─── PurchasesSection ─────────────────────────────────────────────────────────
export function PurchasesSection({ adminToken }: { adminToken?: string | null }) {
  const { t } = useI18n();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      // apiAuth 사용 → 서버에서 조직격리 적용
      const data = adminToken
        ? await apiAuth("/transactions?type=purchase", adminToken)
        : await api("/transactions?type=purchase");
      setTxs(data ?? []);
    } catch { setTxs([]); } finally { setLoading(false); }
  }, [adminToken]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const { from, to } = getDateBounds(datePreset, dateFrom, dateTo);
  const dateBounded = txs.filter((t) => {
    const d = t.created_at?.slice(0, 10) ?? "";
    return d >= from && d <= to;
  });
  const filtered = statusFilter === "all" ? dateBounded : dateBounded.filter((t) => t.status === statusFilter);
  const completed = filtered.filter((t) => t.status === "completed");
  const failed = filtered.filter((t) => t.status === "failed");
  const totalVolume = completed.reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t("tx_total_purchase")} value={String(filtered.length)} />
        <StatCard label={t("tx_completed")} value={String(completed.length)} accent="#00d395" sub={`$${totalVolume.toFixed(0)}`} />
        <StatCard label={t("tx_failed_label")} value={String(failed.length)} accent="#ef4444" />
        <StatCard label={t("tx_pending_label")} value={String(filtered.filter((tx) => tx.status === "pending").length)} accent="#f59e0b" />
      </div>

      <DateFilter preset={datePreset} setPreset={setDatePreset} from={dateFrom} setFrom={setDateFrom} to={dateTo} setTo={setDateTo} />

      <div className="flex items-center gap-2">
        {["all", "completed", "pending", "failed"].map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${statusFilter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? t("con_all") : f}
          </button>
        ))}
        <button onClick={fetchTxs} className="ml-auto p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={11} className={loading ? "animate-spin" : ""} /></button>
      </div>

      {loading && txs.length === 0 ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[t("tx_col_amount"), t("tx_col_coin"), t("tx_col_provider"), t("tx_col_status"), t("tx_col_fail_reason"), t("tx_col_date")].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("tx_no_purchase")}</td></tr>
              ) : filtered.map((tx, i) => (
                <tr key={tx.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{parseFloat(tx.amount).toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{tx.currency}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{tx.payment_provider ?? "Transak"}</td>
                  <td className="px-4 py-3"><Badge variant={tx.status === "completed" ? "green" : tx.status === "pending" ? "yellow" : "red"}>{tx.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[#ef4444]">{tx.failure_reason ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── SwapsSection ─────────────────────────────────────────────────────────────
export function SwapsSection({ adminToken }: { adminToken?: string | null }) {
  const { t } = useI18n();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const data = adminToken
        ? await apiAuth("/transactions?type=swap", adminToken)
        : await api("/transactions?type=swap");
      setTxs(data ?? []);
    } catch { setTxs([]); } finally { setLoading(false); }
  }, [adminToken]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const { from, to } = getDateBounds(datePreset, dateFrom, dateTo);
  const filtered = txs.filter((t) => {
    const d = t.created_at?.slice(0, 10) ?? "";
    return d >= from && d <= to;
  });
  const success = filtered.filter((t) => t.status === "completed").length;
  const successRate = filtered.length ? ((success / filtered.length) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t("tx_total_swap")} value={String(filtered.length)} />
        <StatCard label={t("tx_success")} value={String(success)} accent="#00d395" />
        <StatCard label={t("tx_failed_label")} value={String(filtered.filter((tx) => tx.status === "failed").length)} accent="#ef4444" />
        <StatCard label={t("tx_success_rate")} value={`${successRate}%`} accent="#8247e5" />
      </div>

      <DateFilter preset={datePreset} setPreset={setDatePreset} from={dateFrom} setFrom={setDateFrom} to={dateTo} setTo={setDateTo} />

      <div className="flex justify-end">
        <button onClick={fetchTxs} className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && txs.length === 0 ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["From", "To", t("tx_col_qty"), "DEX", t("tx_col_dex_fee"), "TX Hash", t("tx_col_status"), t("tx_col_date")].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("tx_no_swap")}</td></tr>
              ) : filtered.map((tx, i) => (
                <tr key={tx.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{tx.from_currency ?? tx.currency}</td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{tx.to_currency ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{parseFloat(tx.amount).toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{tx.dex ?? "Uniswap V3"}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{parseFloat(tx.fee ?? 0).toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{tx.tx_hash ? `${tx.tx_hash.slice(0, 10)}...` : "—"}</td>
                  <td className="px-4 py-3"><Badge variant={tx.status === "completed" ? "green" : tx.status === "pending" ? "yellow" : "red"}>{tx.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── TransactionsSection (전체거래) ───────────────────────────────────────────
export function TransactionsSection({ adminToken }: { adminToken?: string | null }) {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [coinFilter, setCoinFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      // 조직격리: adminToken으로 허용된 파트너 ID 목록을 먼저 가져옴
      let allowedPartnerIds: string[] | null = null;
      if (adminToken) {
        const partners = await apiAuth("/partners", adminToken);
        if (Array.isArray(partners)) {
          allowedPartnerIds = partners.map((p: any) => p.id);
        }
      }

      let q = supabase
        .from("transactions")
        .select(`
          *,
          user:user_id(email, wallet_address),
          partner:partner_id(id, name, type,
            parent:parent_id(id, name, type,
              parent:parent_id(id, name, type)
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      // 비-system_admin: 허용된 파트너 소속 거래만 조회
      if (allowedPartnerIds !== null) {
        q = q.in("partner_id", allowedPartnerIds);
      }

      const { data } = await q;
      setTxs(data ?? []);
    } catch { setTxs([]); } finally { setLoading(false); }
  }, [adminToken]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  // Helper: extract partner chain names
  const getStoreName  = (tx: any) => tx.partner?.name ?? "—";
  const getDistName   = (tx: any) => tx.partner?.type === "store" ? (tx.partner?.parent?.name ?? "—") : "—";
  const getMasterName = (tx: any) => {
    const p = tx.partner;
    if (!p) return "—";
    if (p.type === "store") return p.parent?.parent?.name ?? p.parent?.name ?? "—";
    return "—";
  };

  const getCoinLabel = (tx: any) => {
    if (tx.type === "swap") return `${tx.from_currency ?? "?"} → ${tx.to_currency ?? "?"}`;
    return tx.currency ?? "—";
  };

  const getTargetInfo = (tx: any) => {
    if (tx.type === "send" && tx.to_address) return { label: "받는주소", val: tx.to_address };
    if (tx.tx_hash) return { label: "TX Hash", val: tx.tx_hash };
    return { label: "—", val: "—" };
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const fmtAmount = (n: number, decimals = 4) =>
    n.toLocaleString(undefined, { maximumFractionDigits: decimals });

  // Filter
  const { from, to } = getDateBounds(datePreset, dateFrom, dateTo);
  const coinOptions  = Array.from(new Set(txs.map((t) => t.currency ?? t.from_currency).filter(Boolean)));
  const storeOptions = Array.from(new Set(txs.map((t) => t.partner?.name).filter(Boolean)));

  const filtered = txs.filter((tx) => {
    const txDate = tx.created_at?.slice(0, 10) ?? "";
    if (txDate < from || txDate > to) return false;
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;
    if (coinFilter !== "all" && tx.currency !== coinFilter && tx.from_currency !== coinFilter) return false;
    if (storeFilter !== "all" && getStoreName(tx) !== storeFilter) return false;
    return true;
  });

  const purchasedQty  = filtered.filter((t) => t.type === "purchase").length;
  const swappedQty    = filtered.filter((t) => t.type === "swap").length;
  const sentQty       = filtered.filter((t) => t.type === "send").length;
  const totalVol      = filtered
    .filter((t) => t.type === "purchase" && t.status === "completed")
    .reduce((s, t) => s + parseFloat(t.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="전체 거래" value={String(filtered.length)} sub="필터 기준" />
        <StatCard label="구매" value={String(purchasedQty)} accent="#f59e0b" sub="Purchase" />
        <StatCard label="스왑" value={String(swappedQty)} accent="#8247e5" sub="Swap" />
        <StatCard label="전송" value={String(sentQty)} accent="#3b82f6" sub="Send" />
        <StatCard label="완료 구매액" value={`$${fmtAmount(totalVol, 0)}`} accent="#00d395" sub="USDC completed" />
      </div>

      {/* Date filter */}
      <DateFilter preset={datePreset} setPreset={setDatePreset} from={dateFrom} setFrom={setDateFrom} to={dateTo} setTo={setDateTo} />

      {/* Type / Status / Coin / Store filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type */}
        {(["all", "purchase", "swap", "send", "receive"]).map((f) => (
          <button key={f} onClick={() => setTypeFilter(f)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${typeFilter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "전체" : TX_TYPE_KO[f] ?? f}
          </button>
        ))}
        <div className="w-px h-4 bg-border" />
        {/* Status */}
        {(["all", "completed", "pending", "failed"]).map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${statusFilter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "전체상태" : f === "completed" ? "완료" : f === "pending" ? "대기" : "실패"}
          </button>
        ))}
        <div className="w-px h-4 bg-border" />
        {/* Coin */}
        <select value={coinFilter} onChange={(e) => setCoinFilter(e.target.value)}
          className="bg-secondary border border-border rounded-sm px-3 py-1.5 font-mono text-[13px] text-foreground focus:outline-none">
          <option value="all">전체 코인</option>
          {coinOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Store */}
        <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}
          className="bg-secondary border border-border rounded-sm px-3 py-1.5 font-mono text-[13px] text-foreground focus:outline-none">
          <option value="all">전체 매장</option>
          {storeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={fetchTxs} className="p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /></button>
        <span className="font-mono text-[13px] text-muted-foreground ml-auto">{filtered.length}건</span>
      </div>

      {loading && txs.length === 0 ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["매장 / 총판", "사용자", "유형", "코인", "수량", "대상 / TX", "상태", "일시", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">거래 내역 없음</td>
                </tr>
              ) : filtered.map((tx, i) => {
                const target = getTargetInfo(tx);
                return (
                  <Fragment key={tx.id}>
                    <tr
                      className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${i === filtered.length - 1 && expanded !== tx.id ? "border-0" : ""}`}
                      onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}>

                      {/* 매장 / 총판 */}
                      <td className="px-3 py-3">
                        <div className="font-['Barlow'] text-sm font-semibold text-foreground leading-tight">{getStoreName(tx)}</div>
                        <div className="font-mono text-[12px] text-muted-foreground">{getDistName(tx)}</div>
                      </td>

                      {/* 사용자 */}
                      <td className="px-3 py-3">
                        <div className="font-mono text-[13px] text-foreground leading-tight">{tx.user?.email ?? "—"}</div>
                        {tx.user?.wallet_address && (
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {tx.user.wallet_address.slice(0, 6)}…{tx.user.wallet_address.slice(-4)}
                          </div>
                        )}
                      </td>

                      {/* 유형 */}
                      <td className="px-3 py-3">
                        <Badge variant={TX_TYPE_VAR[tx.type] ?? "yellow"}>{TX_TYPE_KO[tx.type] ?? tx.type}</Badge>
                      </td>

                      {/* 코인 */}
                      <td className="px-3 py-3 font-mono text-[13px] text-[#8247e5] font-semibold whitespace-nowrap">{getCoinLabel(tx)}</td>

                      {/* 수량 */}
                      <td className="px-3 py-3 font-['Barlow_Condensed'] text-lg font-bold text-foreground whitespace-nowrap">
                        {fmtAmount(parseFloat(tx.amount ?? 0))}
                      </td>

                      {/* 대상 / TX */}
                      <td className="px-3 py-3 max-w-[160px]">
                        <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-wide">{target.label}</div>
                        <div className="font-mono text-[12px] text-foreground truncate" title={target.val}>
                          {target.val !== "—" ? `${target.val.slice(0, 16)}…` : "—"}
                        </div>
                      </td>

                      {/* 상태 */}
                      <td className="px-3 py-3">
                        <Badge variant={tx.status === "completed" ? "green" : tx.status === "pending" ? "yellow" : "red"}>
                          {tx.status === "completed" ? "완료" : tx.status === "pending" ? "대기" : "실패"}
                        </Badge>
                      </td>

                      {/* 일시 */}
                      <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground whitespace-nowrap">{fmtDate(tx.created_at)}</td>

                      {/* expand */}
                      <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{expanded === tx.id ? "▲" : "▼"}</td>
                    </tr>

                    {/* ── Expanded detail ── */}
                    {expanded === tx.id && (
                      <tr className="border-b border-border/30 bg-secondary/20">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-6">
                            {/* 파트너 계층 */}
                            <div>
                              <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-2">파트너 계층</div>
                              <div className="space-y-1.5">
                                {[
                                  { label: "시스템", val: "System Admin" },
                                  { label: "마스터", val: getMasterName(tx) },
                                  { label: "총판", val: getDistName(tx) },
                                  { label: "매장", val: getStoreName(tx) },
                                ].map((r) => (
                                  <div key={r.label} className="flex justify-between font-mono text-[13px]">
                                    <span className="text-muted-foreground">{r.label}</span>
                                    <span className="text-foreground">{r.val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 사용자 정보 */}
                            <div>
                              <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-2">사용자 정보</div>
                              <div className="space-y-1.5">
                                {[
                                  { label: "이메일", val: tx.user?.email ?? "—" },
                                  { label: "내 지갑", val: tx.user?.wallet_address ?? "—" },
                                  { label: "받는 주소", val: tx.to_address ?? "—" },
                                  { label: "결제 수단", val: tx.payment_provider ?? "—" },
                                ].map((r) => (
                                  <div key={r.label} className="flex justify-between items-start font-mono text-[13px] gap-2">
                                    <span className="text-muted-foreground shrink-0">{r.label}</span>
                                    <span className="text-foreground text-[12px] break-all text-right" title={r.val}>{r.val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 블록체인 정보 */}
                            <div>
                              <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-2">블록체인 정보</div>
                              <div className="space-y-1.5">
                                {[
                                  { label: "TX Hash", val: tx.tx_hash ?? "—" },
                                  { label: "수수료", val: tx.fee ? `${tx.fee} ${tx.currency ?? ""}` : "—" },
                                  { label: "DEX", val: tx.dex ?? "—" },
                                  { label: "실패 사유", val: tx.failure_reason ?? "—" },
                                ].map((r) => (
                                  <div key={r.label} className="flex justify-between items-start font-mono text-[13px] gap-2">
                                    <span className="text-muted-foreground shrink-0">{r.label}</span>
                                    <span className="text-foreground text-[12px] break-all text-right" title={r.val}>{r.val}</span>
                                  </div>
                                ))}
                              </div>
                              {tx.tx_hash && (
                                <a
                                  href={`https://polygonscan.com/tx/${tx.tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 flex items-center gap-1.5 font-mono text-[12px] text-[#8247e5] hover:underline"
                                  onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink size={11} /> Polygonscan에서 보기
                                </a>
                              )}
                            </div>
                          </div>

                          {/* 메모 */}
                          {tx.memo && (
                            <div className="mt-3 pt-3 border-t border-border/30 font-mono text-[13px]">
                              <span className="text-muted-foreground">메모: </span>
                              <span className="text-foreground">{tx.memo}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
