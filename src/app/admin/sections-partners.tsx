import { useState, useEffect, useCallback, Fragment } from "react";
import { AlertTriangle, ChevronRight, Circle, Plus, X, Edit3, Check, RefreshCw, Copy, KeyRound } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard, api } from "./shared";

// ─── Partner types and mock data ──────────────────────────────────────────────

export type PartnerType = "master" | "distributor" | "store";

export interface Partner {
  id: string;
  name: string;
  code: string;
  type: PartnerType;
  parent_id: string | null;
  parent_name: string | null;
  grandparent_name: string | null;
  fee_rate: number;
  sub_count: number;
  status: "active" | "inactive";
  phone: string;
  email?: string;
  created_at: string;
}

export const MOCK_MASTERS: Partner[] = [
  { id: "m1", name: "강남마스터", code: "MAS-001", type: "master", parent_id: null, parent_name: null, grandparent_name: null, fee_rate: 2.0, sub_count: 2, status: "active", phone: "010-1234-5678", created_at: "2024-01-10T09:00:00Z" },
  { id: "m2", name: "서초마스터", code: "MAS-002", type: "master", parent_id: null, parent_name: null, grandparent_name: null, fee_rate: 1.5, sub_count: 3, status: "active", phone: "010-2345-6789", created_at: "2024-02-15T10:00:00Z" },
  { id: "m3", name: "송파마스터", code: "MAS-003", type: "master", parent_id: null, parent_name: null, grandparent_name: null, fee_rate: 1.8, sub_count: 1, status: "inactive", phone: "010-3456-7890", created_at: "2024-03-20T11:00:00Z" },
];

export const MOCK_DISTRIBUTORS: Partner[] = [
  { id: "d1", name: "강남총판A", code: "DIS-001", type: "distributor", parent_id: "m1", parent_name: "강남마스터", grandparent_name: null, fee_rate: 1.5, sub_count: 3, status: "active", phone: "010-4567-8901", created_at: "2024-01-20T09:00:00Z" },
  { id: "d2", name: "강남총판B", code: "DIS-002", type: "distributor", parent_id: "m1", parent_name: "강남마스터", grandparent_name: null, fee_rate: 1.0, sub_count: 2, status: "active", phone: "010-5678-9012", created_at: "2024-02-01T09:00:00Z" },
  { id: "d3", name: "서초총판A", code: "DIS-003", type: "distributor", parent_id: "m2", parent_name: "서초마스터", grandparent_name: null, fee_rate: 1.2, sub_count: 4, status: "active", phone: "010-6789-0123", created_at: "2024-03-05T09:00:00Z" },
  { id: "d4", name: "서초총판B", code: "DIS-004", type: "distributor", parent_id: "m2", parent_name: "서초마스터", grandparent_name: null, fee_rate: 1.0, sub_count: 1, status: "active", phone: "010-7890-1234", created_at: "2024-04-10T09:00:00Z" },
  { id: "d5", name: "송파총판A", code: "DIS-005", type: "distributor", parent_id: "m3", parent_name: "송파마스터", grandparent_name: null, fee_rate: 1.3, sub_count: 2, status: "inactive", phone: "010-8901-2345", created_at: "2024-04-20T09:00:00Z" },
];

export const MOCK_STORES: Partner[] = [
  { id: "s1", name: "강남카페01", code: "STR-001", type: "store", parent_id: "d1", parent_name: "강남총판A", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "active", phone: "010-0001-0001", created_at: "2024-02-01T09:00:00Z" },
  { id: "s2", name: "강남편의점02", code: "STR-002", type: "store", parent_id: "d1", parent_name: "강남총판A", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "active", phone: "010-0001-0002", created_at: "2024-02-05T09:00:00Z" },
  { id: "s3", name: "강남약국03", code: "STR-003", type: "store", parent_id: "d1", parent_name: "강남총판A", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "active", phone: "010-0001-0003", created_at: "2024-02-10T09:00:00Z" },
  { id: "s4", name: "강남서점04", code: "STR-004", type: "store", parent_id: "d2", parent_name: "강남총판B", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "active", phone: "010-0002-0001", created_at: "2024-02-15T09:00:00Z" },
  { id: "s5", name: "강남헬스05", code: "STR-005", type: "store", parent_id: "d2", parent_name: "강남총판B", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "inactive", phone: "010-0002-0002", created_at: "2024-03-01T09:00:00Z" },
  { id: "s6", name: "서초식당06", code: "STR-006", type: "store", parent_id: "d3", parent_name: "서초총판A", grandparent_name: "서초마스터", fee_rate: 0, sub_count: 0, status: "active", phone: "010-0003-0001", created_at: "2024-03-10T09:00:00Z" },
  { id: "s7", name: "서초카페07", code: "STR-007", type: "store", parent_id: "d3", parent_name: "서초총판A", grandparent_name: "서초마스터", fee_rate: 0, sub_count: 0, status: "active", phone: "010-0003-0002", created_at: "2024-03-15T09:00:00Z" },
  { id: "s8", name: "서초마트08", code: "STR-008", type: "store", parent_id: "d4", parent_name: "서초총판B", grandparent_name: "서초마스터", fee_rate: 0, sub_count: 0, status: "active", phone: "010-0004-0001", created_at: "2024-04-20T09:00:00Z" },
];

// System-level fee rates (applied on top of partner fees)
export const SYSTEM_FEE_RATE = 1.0; // 1.0%

export function calcFees(grossKRW: number, masterRate: number, distRate: number) {
  const systemFee = grossKRW * (SYSTEM_FEE_RATE / 100);
  const masterFee = grossKRW * (masterRate / 100);
  const distFee   = grossKRW * (distRate / 100);
  const net       = grossKRW - systemFee - masterFee - distFee;
  return { systemFee, masterFee, distFee, net };
}

// ─── PartnerFormModal ─────────────────────────────────────────────────────────

export function PartnerFormModal({
  type, item, masters, distributors, onSave, onClose,
}: {
  type: PartnerType; item: Partner | null;
  masters: Partner[]; distributors: Partner[];
  onSave: (p: Partner) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    code: item?.code ?? "",
    parent_id: item?.parent_id ?? "",
    fee_rate: item ? String(item.fee_rate) : "1.0",
    phone: item?.phone ?? "",
    email: item?.email ?? "",
    status: item?.status ?? "active",
  });

  const parentOptions = type === "distributor" ? masters : type === "store" ? distributors : [];
  const parentLabel   = type === "distributor" ? "소속 마스터" : type === "store" ? "소속 총판" : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parentPartner = parentOptions.find((p) => p.id === form.parent_id);
    const grandparent = type === "store"
      ? masters.find((m) => m.id === (distributors.find((d) => d.id === form.parent_id)?.parent_id))?.name ?? null
      : null;
    onSave({
      id: item?.id ?? `new_${Date.now()}`,
      name: form.name, code: form.code, type,
      parent_id: form.parent_id || null,
      parent_name: parentPartner?.name ?? null,
      grandparent_name: grandparent,
      fee_rate: parseFloat(form.fee_rate) || 0,
      sub_count: item?.sub_count ?? 0,
      status: form.status as "active" | "inactive",
      phone: form.phone,
      email: form.email,
      created_at: item?.created_at ?? new Date().toISOString(),
    });
  };

  const TYPE_KO: Record<PartnerType, string> = { master: "마스터", distributor: "총판", store: "매장" };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-sm p-6 w-[440px] space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">
            {item ? `${TYPE_KO[type]} 수정` : `${TYPE_KO[type]} 추가`}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">이름</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">코드</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
            </div>
          </div>
          {parentLabel && (
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{parentLabel}</label>
              <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50">
                <option value="">선택</option>
                {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
          )}
          {/* 이메일 — 어드민 로그인 계정으로 사용됨 */}
          <div className="space-y-1">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">
              이메일 <span className="text-[#8247e5]">(어드민 로그인 ID)</span>
            </label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="partner@example.com"
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {type !== "store" && (
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">수수료율 (%)</label>
                <input type="number" step="0.1" min="0" max="10" value={form.fee_rate}
                  onChange={(e) => setForm({ ...form, fee_rate: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
              </div>
            )}
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">연락처</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">상태</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50">
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
          </div>
          {!item && form.email && (
            <div className="bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-3 py-2 font-mono text-[12px] text-[#8247e5]">
              저장 후 임시 비밀번호가 화면에 표시됩니다. 파트너에게 직접 전달해 주세요.
            </div>
          )}
          <button type="submit" className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
            저장
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── PartnersSection ──────────────────────────────────────────────────────────

// ─── TempPasswordModal ────────────────────────────────────────────────────────

function TempPasswordModal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-sm p-6 w-[420px] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#00d395]/10 flex items-center justify-center">
            <KeyRound size={15} className="text-[#00d395]" />
          </div>
          <span className="font-mono text-[13px] text-foreground uppercase tracking-widest">파트너 계정 생성 완료</span>
        </div>

        <div className="bg-secondary border border-border rounded-sm px-4 py-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">이메일 (로그인 ID)</span>
            <span className="font-mono text-[13px] text-foreground">{email}</span>
          </div>
          <div className="border-t border-border" />
          <div className="flex justify-between items-center gap-3">
            <span className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">임시 비밀번호</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[14px] font-bold text-[#8247e5] tracking-wider">{password}</span>
              <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check size={13} className="text-[#00d395]" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-3 py-2">
          <p className="font-mono text-[12px] text-[#f59e0b]">
            이 비밀번호는 지금만 표시됩니다. 파트너에게 직접 전달해 주세요.
          </p>
        </div>

        <button onClick={onClose} className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
          확인
        </button>
      </div>
    </div>
  );
}

// ─── PartnersSection ──────────────────────────────────────────────────────────

export function PartnersSection() {
  type Tab = "master" | "distributor" | "store";
  const [tab, setTab] = useState<Tab>("master");
  const [allPartners, setAllPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item: Partner | null }>({ open: false, item: null });
  const [tempPwModal, setTempPwModal] = useState<{ email: string; password: string } | null>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/partners");
      setAllPartners(data ?? []);
    } catch { setAllPartners([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const masters      = allPartners.filter((p) => p.type === "master");
  const distributors = allPartners.filter((p) => p.type === "distributor");
  const stores       = allPartners.filter((p) => p.type === "store");

  const listMap: Record<Tab, Partner[]> = { master: masters, distributor: distributors, store: stores };
  const list = listMap[tab];

  const handleSave = async (p: Partner) => {
    try {
      if (p.id.startsWith("new_")) {
        const result = await api("/partners", {
          method: "POST",
          body: JSON.stringify({ name: p.name, code: p.code, type: p.type, parent_id: p.parent_id || null, fee_rate: p.fee_rate, status: p.status, phone: p.phone, email: p.email }),
        });
        setModal({ open: false, item: null });
        fetchPartners();
        if (result?.temp_password && p.email) {
          setTempPwModal({ email: p.email, password: result.temp_password });
        }
      } else {
        await api(`/partners/${p.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: p.name, code: p.code, parent_id: p.parent_id || null, fee_rate: p.fee_rate, status: p.status, phone: p.phone, email: p.email }),
        });
        setModal({ open: false, item: null });
        fetchPartners();
      }
    } catch (err: any) { alert(err.message ?? "저장 실패"); }
  };

  const TABS: { id: Tab; label: string; color: string }[] = [
    { id: "master", label: "마스터", color: "#8247e5" },
    { id: "distributor", label: "총판", color: "#3b82f6" },
    { id: "store", label: "매장", color: "#00d395" },
  ];

  return (
    <div className="space-y-4">
      {/* Hierarchy visual */}
      <div className="bg-card border border-border rounded-sm px-5 py-4">
        <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-3">수수료 계층 구조</div>
        <div className="flex items-center gap-0 overflow-x-auto">
          {[
            { label: "시스템 관리자", rate: `${SYSTEM_FEE_RATE}%`, color: "#ef4444", count: 1 },
            { label: "마스터", rate: `avg ${masters.length ? (masters.reduce((s, m) => s + m.fee_rate, 0) / masters.length).toFixed(1) : "0.0"}%`, color: "#8247e5", count: masters.length },
            { label: "총판", rate: `avg ${distributors.length ? (distributors.reduce((s, d) => s + d.fee_rate, 0) / distributors.length).toFixed(1) : "0.0"}%`, color: "#3b82f6", count: distributors.length },
            { label: "매장", rate: "순정산", color: "#00d395", count: stores.length },
          ].map((node, i, arr) => (
            <div key={node.label} className="flex items-center">
              <div className="flex flex-col items-center px-4 py-2 bg-secondary rounded-sm border border-border min-w-[100px]">
                <span className="font-mono text-[13px] font-bold" style={{ color: node.color }}>{node.label}</span>
                <span className="font-['Barlow_Condensed'] text-xl font-bold text-foreground">{node.rate}</span>
                <span className="font-mono text-[12px] text-muted-foreground">{node.count}개</span>
              </div>
              {i < arr.length - 1 && (
                <div className="flex items-center px-1">
                  <div className="w-6 h-px bg-border" />
                  <ChevronRight size={12} className="text-muted-foreground -ml-1" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="마스터 수" value={String(masters.filter((m) => m.status === "active").length)} sub={`전체 ${masters.length}개`} accent="#8247e5" />
        <StatCard label="총판 수" value={String(distributors.filter((d) => d.status === "active").length)} sub={`전체 ${distributors.length}개`} accent="#3b82f6" />
        <StatCard label="매장 수" value={String(stores.filter((s) => s.status === "active").length)} sub={`전체 ${stores.length}개`} accent="#00d395" />
        <StatCard label="활성 파트너" value={String(masters.filter((m) => m.status === "active").length + distributors.filter((d) => d.status === "active").length + stores.filter((s) => s.status === "active").length)} sub="전체 합산" />
      </div>

      {/* Tabs + Add */}
      <div className="flex items-center gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${tab === t.id ? "border-[#8247e5]/40 text-[#8247e5] bg-[#8247e5]/10" : "border-border text-muted-foreground hover:text-foreground"}`}
            style={tab === t.id ? { borderColor: `${t.color}40`, color: t.color, backgroundColor: `${t.color}10` } : {}}>
            {t.label} <span className="ml-1 opacity-60">({listMap[t.id].length})</span>
          </button>
        ))}
        <button onClick={fetchPartners} className="p-2 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors" title="새로고침">
          <RefreshCw size={12} />
        </button>
        <button onClick={() => setModal({ open: true, item: null })}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
          <Plus size={12} /> {TABS.find((t) => t.id === tab)?.label} 추가
        </button>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : (
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {(tab === "store"
                ? ["매장명", "코드", "소속 총판", "소속 마스터", "연락처", "상태", "등록일", ""]
                : tab === "distributor"
                  ? ["총판명", "코드", "소속 마스터", "수수료율", "하위 매장", "연락처", "상태", "등록일", ""]
                  : ["마스터명", "코드", "수수료율", "하위 총판", "연락처", "상태", "등록일", ""]
              ).map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">등록된 파트너 없음</td></tr>
            ) : list.map((p, i) => (
              <tr key={p.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === list.length - 1 ? "border-0" : ""}`}>
                <td className="px-4 py-3 font-['Barlow'] text-sm font-semibold text-foreground">{p.name}</td>
                <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{p.code}</td>
                {tab === "store" && <td className="px-4 py-3 font-mono text-sm text-[#3b82f6]">{p.parent_name ?? "—"}</td>}
                {tab === "store" && <td className="px-4 py-3 font-mono text-sm text-[#8247e5]">{p.grandparent_name ?? "—"}</td>}
                {tab === "distributor" && <td className="px-4 py-3 font-mono text-sm text-[#8247e5]">{p.parent_name ?? "—"}</td>}
                {tab !== "store" && (
                  <td className="px-4 py-3">
                    <span className="font-['Barlow_Condensed'] text-xl font-bold" style={{ color: tab === "master" ? "#8247e5" : "#3b82f6" }}>{p.fee_rate.toFixed(1)}%</span>
                  </td>
                )}
                {tab !== "store" && <td className="px-4 py-3 font-mono text-sm text-foreground">{p.sub_count}개</td>}
                <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{p.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.status === "active" ? "green" : "gray"}>{p.status === "active" ? "활성" : "비활성"}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ko-KR")}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setModal({ open: true, item: p })} className="p-1 text-muted-foreground hover:text-[#8247e5] transition-colors"><Edit3 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {tempPwModal && (
        <TempPasswordModal
          email={tempPwModal.email}
          password={tempPwModal.password}
          onClose={() => setTempPwModal(null)}
        />
      )}

      {modal.open && (
        <PartnerFormModal
          type={tab} item={modal.item}
          masters={masters} distributors={distributors}
          onSave={handleSave} onClose={() => setModal({ open: false, item: null })}
        />
      )}
    </div>
  );
}

// ─── SettlementsSection ───────────────────────────────────────────────────────

interface Settlement {
  id: string;
  store_id: string;
  store_name: string;
  distributor_name: string;
  master_name: string;
  user_id: string;
  user_email: string;
  purchase_id: string;
  gross_krw: number;
  coin_symbol: string;
  coin_amount: number;
  system_fee_rate: number;
  master_fee_rate: number;
  dist_fee_rate: number;
  system_fee_amt: number;
  master_fee_amt: number;
  dist_fee_amt: number;
  net_krw: number;
  status: "pending" | "settled";
  created_at: string;
}

function generateMockSettlements(): Settlement[] {
  const entries: Settlement[] = [];
  const storePool = [
    { id: "s1", name: "강남카페01", dist: "강남총판A", master: "강남마스터", masterRate: 2.0, distRate: 1.5 },
    { id: "s2", name: "강남편의점02", dist: "강남총판A", master: "강남마스터", masterRate: 2.0, distRate: 1.5 },
    { id: "s4", name: "강남서점04", dist: "강남총판B", master: "강남마스터", masterRate: 2.0, distRate: 1.0 },
    { id: "s6", name: "서초식당06", dist: "서초총판A", master: "서초마스터", masterRate: 1.5, distRate: 1.2 },
    { id: "s7", name: "서초카페07", dist: "서초총판A", master: "서초마스터", masterRate: 1.5, distRate: 1.2 },
  ];
  const users = [
    { id: "u_a1b2", email: "kim@example.com" },
    { id: "u_c3d4", email: "lee@example.com" },
    { id: "u_e5f6", email: "park@example.com" },
    { id: "u_g7h8", email: "choi@example.com" },
  ];
  const coins = [
    { symbol: "MATIC", rate: 950 },
    { symbol: "USDT", rate: 1340 },
  ];
  const baseDate = new Date("2024-06-01T09:00:00Z");
  for (let i = 0; i < 20; i++) {
    const store = storePool[i % storePool.length];
    const user  = users[i % users.length];
    const coin  = coins[i % coins.length];
    const grossKRW = [10000, 20000, 50000, 100000, 30000][i % 5];
    const { systemFee, masterFee, distFee, net } = calcFees(grossKRW, store.masterRate, store.distRate);
    const dt = new Date(baseDate.getTime() + i * 3.6e6 * 5);
    entries.push({
      id: `set_${i + 1}`,
      store_id: store.id, store_name: store.name,
      distributor_name: store.dist, master_name: store.master,
      user_id: user.id, user_email: user.email,
      purchase_id: `pch_${100 + i}`,
      gross_krw: grossKRW,
      coin_symbol: coin.symbol,
      coin_amount: parseFloat((grossKRW / coin.rate).toFixed(4)),
      system_fee_rate: SYSTEM_FEE_RATE,
      master_fee_rate: store.masterRate,
      dist_fee_rate: store.distRate,
      system_fee_amt: Math.round(systemFee),
      master_fee_amt: Math.round(masterFee),
      dist_fee_amt: Math.round(distFee),
      net_krw: Math.round(net),
      status: i < 14 ? "settled" : "pending",
      created_at: dt.toISOString(),
    });
  }
  return entries.reverse();
}

export function SettlementsSection() {
  const [rawSettlements, setRawSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeFilter, setStoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "settled">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/settlements");
      setRawSettlements(data ?? []);
    } catch { setRawSettlements([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  // Map API response to Settlement UI shape
  const settlements: Settlement[] = rawSettlements.map((s: any) => {
    const partner = s.partner ?? {};
    const parentPartner = partner.parent ?? {};
    const grandPartner  = parentPartner.parent ?? {};
    const storeName = partner.name ?? "—";
    const distName  = partner.type === "store" ? parentPartner.name ?? "—" : (partner.type === "distributor" ? partner.name : "—");
    const masterName = partner.type === "store" ? grandPartner.name ?? parentPartner.name ?? "—" : (partner.type === "master" ? partner.name : parentPartner.name ?? "—");
    return {
      id: s.id,
      store_id: partner.id ?? "",
      store_name: storeName,
      distributor_name: distName,
      master_name: masterName,
      user_id: s.transaction_id ?? "—",
      user_email: "—",
      purchase_id: s.transaction_id ?? "—",
      gross_krw: parseFloat(s.gross_amount ?? 0),
      coin_symbol: s.coin_symbol ?? "USDC",
      coin_amount: parseFloat(s.coin_amount ?? 0),
      system_fee_rate: SYSTEM_FEE_RATE,
      master_fee_rate: 0,
      dist_fee_rate: 0,
      system_fee_amt: parseFloat(s.system_fee ?? 0),
      master_fee_amt: parseFloat(s.master_fee ?? 0),
      dist_fee_amt: parseFloat(s.dist_fee ?? 0),
      net_krw: parseFloat(s.net_amount ?? 0),
      status: s.status === "completed" ? "settled" : "pending",
      created_at: s.created_at,
    };
  });

  // If no real settlements, show mock data as a demo
  const displaySettlements = settlements.length > 0 ? settlements : generateMockSettlements();

  const storeOptions = Array.from(new Set(displaySettlements.map((s) => s.store_name)));
  const filtered = displaySettlements.filter((s) => {
    if (storeFilter !== "all" && s.store_name !== storeFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const settlePending = async () => {
    if (!confirm("미정산 건을 일괄 처리하시겠습니까?")) return;
    setSettling(true);
    try {
      const pendingIds = rawSettlements.filter((s) => s.status === "pending").map((s) => s.partner_id);
      if (pendingIds.length > 0) {
        await api("/settlements/bulk", { method: "POST", body: JSON.stringify({ partner_ids: pendingIds, memo: "일괄정산" }) });
        await fetchSettlements();
      }
    } finally { setSettling(false); }
  };

  const totalGross  = filtered.reduce((s, r) => s + r.gross_krw, 0);
  const totalSystem = filtered.reduce((s, r) => s + r.system_fee_amt, 0);
  const totalMaster = filtered.reduce((s, r) => s + r.master_fee_amt, 0);
  const totalDist   = filtered.reduce((s, r) => s + r.dist_fee_amt, 0);
  const totalNet    = filtered.reduce((s, r) => s + r.net_krw, 0);

  const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-[#3b82f6]/5 border border-[#3b82f6]/20 rounded-sm px-4 py-2.5">
        <Circle size={8} className="text-[#3b82f6] fill-[#3b82f6]" />
        <span className="font-mono text-[14px] text-[#3b82f6]">
          사용자 충전 금액은 원본 그대로 표시되며, 수수료는 입금 즉시 자동 차감됩니다. 매장에는 순정산금액이 지급됩니다.
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="총 입금액" value={fmt(totalGross)} sub="사용자 구매 합계" />
        <StatCard label="시스템 수수료" value={fmt(totalSystem)} sub={`${SYSTEM_FEE_RATE}% 적용`} accent="#ef4444" />
        <StatCard label="마스터 수수료" value={fmt(totalMaster)} sub="마스터 배분" accent="#8247e5" />
        <StatCard label="총판 수수료" value={fmt(totalDist)} sub="총판 배분" accent="#3b82f6" />
        <StatCard label="매장 순정산" value={fmt(totalNet)} sub="매장 수령액" accent="#00d395" />
      </div>

      {/* Fee structure legend */}
      <div className="bg-card border border-border rounded-sm px-4 py-3">
        <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-2">수수료 차감 구조 (현재 선택 필터 기준)</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span className="font-mono text-[13px] text-foreground">시스템 {SYSTEM_FEE_RATE}%</span>
          </div>
          <span className="text-muted-foreground">+</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#8247e5]" />
            <span className="font-mono text-[13px] text-foreground">마스터 수수료</span>
          </div>
          <span className="text-muted-foreground">+</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
            <span className="font-mono text-[13px] text-foreground">총판 수수료</span>
          </div>
          <span className="text-muted-foreground">=</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00d395]" />
            <span className="font-mono text-[13px] text-[#00d395] font-semibold">매장 순정산</span>
          </div>
          <div className="ml-auto font-mono text-[13px] text-muted-foreground">
            총 차감율: {((totalGross - totalNet) / Math.max(1, totalGross) * 100).toFixed(2)}% | 정산율: {(totalNet / Math.max(1, totalGross) * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}
          className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-[13px] text-foreground focus:outline-none">
          <option value="all">전체 매장</option>
          {storeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(["all", "pending", "settled"] as const).map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-2 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${statusFilter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "전체" : f === "pending" ? "정산대기" : "정산완료"}
          </button>
        ))}
        <button onClick={fetchSettlements} className="p-2 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={12} /></button>
        {rawSettlements.some((s) => s.status === "pending") && (
          <button onClick={settlePending} disabled={settling}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-[#00d395] text-background font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#00d395]/80 disabled:opacity-50 transition-colors">
            {settling ? <Spinner /> : <Check size={12} />} 일괄 정산
          </button>
        )}
        <span className={`${rawSettlements.some((s) => s.status === "pending") ? "" : "ml-auto"} font-mono text-[13px] text-muted-foreground`}>{filtered.length}건</span>
      </div>
      {loading && <Spinner />}

      {/* Table */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["매장", "사용자", "구매금액(원)", "코인", "시스템", "마스터", "총판", "순정산", "상태", "일시", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">정산 내역 없음</td></tr>
            ) : filtered.map((s, i) => (
              <Fragment key={s.id}>
                <tr
                  className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${i === filtered.length - 1 && expanded !== s.id ? "border-0" : ""}`}
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <td className="px-3 py-3">
                    <div className="font-['Barlow'] text-sm font-semibold text-foreground">{s.store_name}</div>
                    <div className="font-mono text-[12px] text-muted-foreground">{s.distributor_name}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-mono text-[13px] text-foreground">{s.user_id}</div>
                    <div className="font-mono text-[12px] text-muted-foreground">{s.user_email}</div>
                  </td>
                  <td className="px-3 py-3 font-['Barlow_Condensed'] text-lg font-bold text-foreground">{s.gross_krw.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-3">
                    <div className="font-mono text-sm text-[#8247e5]">{s.coin_amount} {s.coin_symbol}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-[13px] text-[#ef4444]">-{s.system_fee_amt.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-3 font-mono text-[13px] text-[#8247e5]">-{s.master_fee_amt.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-3 font-mono text-[13px] text-[#3b82f6]">-{s.dist_fee_amt.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-3 font-['Barlow_Condensed'] text-lg font-bold text-[#00d395]">{s.net_krw.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-3"><Badge variant={s.status === "settled" ? "green" : "yellow"}>{s.status === "settled" ? "완료" : "대기"}</Badge></td>
                  <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{new Date(s.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-3 py-3 font-mono text-[13px] text-muted-foreground">{expanded === s.id ? "▲" : "▼"}</td>
                </tr>
                {expanded === s.id && (
                  <tr className="border-b border-border/30 bg-secondary/20">
                    <td colSpan={11} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-2">수수료 상세 내역</div>
                          <div className="space-y-1.5">
                            {[
                              { label: "사용자 구매금액 (원본)", val: fmt(s.gross_krw), color: "text-foreground", sign: "" },
                              { label: `시스템 수수료 (${s.system_fee_rate}%)`, val: fmt(s.system_fee_amt), color: "text-[#ef4444]", sign: "−" },
                              { label: `마스터 수수료 ${s.master_fee_rate}% — ${s.master_name}`, val: fmt(s.master_fee_amt), color: "text-[#8247e5]", sign: "−" },
                              { label: `총판 수수료 ${s.dist_fee_rate}% — ${s.distributor_name}`, val: fmt(s.dist_fee_amt), color: "text-[#3b82f6]", sign: "−" },
                              { label: `매장 순정산 (${s.store_name})`, val: fmt(s.net_krw), color: "text-[#00d395]", sign: "=" },
                            ].map((row) => (
                              <div key={row.label} className={`flex justify-between items-center font-mono text-[13px] ${row.sign === "=" ? "border-t border-border pt-1.5 mt-1" : ""}`}>
                                <span className="text-muted-foreground">{row.sign && <span className={`mr-1.5 font-bold ${row.color}`}>{row.sign}</span>}{row.label}</span>
                                <span className={`font-bold ${row.color}`}>{row.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-2">사용자 코인 충전 내역 (원본)</div>
                          <div className="bg-card border border-border rounded-sm px-4 py-3 space-y-2">
                            <div className="flex justify-between font-mono text-[13px]">
                              <span className="text-muted-foreground">충전 코인</span>
                              <span className="text-[#8247e5] font-bold">{s.coin_amount} {s.coin_symbol}</span>
                            </div>
                            <div className="flex justify-between font-mono text-[13px]">
                              <span className="text-muted-foreground">지불 금액</span>
                              <span className="text-foreground font-bold">{fmt(s.gross_krw)}</span>
                            </div>
                            <div className="flex justify-between font-mono text-[13px]">
                              <span className="text-muted-foreground">사용자 ID</span>
                              <span className="text-foreground">{s.user_id}</span>
                            </div>
                            <div className="flex justify-between font-mono text-[13px]">
                              <span className="text-muted-foreground">구매 ID</span>
                              <span className="text-muted-foreground">{s.purchase_id}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-border font-mono text-[12px] text-muted-foreground">
                              * 사용자 지갑에는 구매금액 전액에 해당하는 코인이 충전됩니다.
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FeesSection ──────────────────────────────────────────────────────────────

export function FeesSection({ adminEmail }: { adminEmail: string }) {
  const [feeTab, setFeeTab] = useState<"system" | "hierarchy">("hierarchy");
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState({ fee_rate: "", fixed_fee: "" });
  const [saving, setSaving] = useState(false);

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [masterRates, setMasterRates] = useState<Record<string, string>>({});
  const [distRates, setDistRates] = useState<Record<string, string>>({});
  const [sysRate, setSysRate] = useState(String(SYSTEM_FEE_RATE));
  const [editingPartner, setEditingPartner] = useState<string | null>(null);

  useEffect(() => {
    api("/partners").then((data: Partner[]) => {
      setPartners(data ?? []);
      const mr: Record<string, string> = {};
      const dr: Record<string, string> = {};
      (data ?? []).forEach((p) => {
        if (p.type === "master")      mr[p.id] = String(p.fee_rate);
        if (p.type === "distributor") dr[p.id] = String(p.fee_rate);
      });
      setMasterRates(mr);
      setDistRates(dr);
    }).catch(() => {}).finally(() => setLoadingPartners(false));
  }, []);

  const fetchFees = useCallback(async () => {
    setLoading(true);
    try { const { data } = await supabase.from("fee_settings").select("*").order("type"); setFees(data ?? []); }
    catch { setFees([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  const save = async (id: string) => {
    setSaving(true);
    try {
      await supabase.from("fee_settings").update({ fee_rate: parseFloat(editVal.fee_rate), fixed_fee: parseFloat(editVal.fixed_fee), updated_at: new Date().toISOString() }).eq("id", id);
      await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "update_fee", target_type: "fee_setting", target_id: id, detail: editVal });
      setEditing(null); fetchFees();
    } finally { setSaving(false); }
  };

  // Simulated total fee on 100,000원
  const sample = 100000;
  const sysF   = sample * (parseFloat(sysRate) || 0) / 100;
  const m1Rate = parseFloat(masterRates["m1"] || "0");
  const d1Rate = parseFloat(distRates["d1"] || "0");
  const mF     = sample * m1Rate / 100;
  const dF     = sample * d1Rate / 100;
  const netF   = sample - sysF - mF - dF;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-2.5">
        <AlertTriangle size={11} className="text-[#f59e0b] shrink-0" />
        <span className="font-mono text-[14px] text-[#f59e0b]">수수료 변경 사항은 즉시 적용됩니다. 신중하게 변경해 주세요.</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {([["hierarchy", "계층별 수수료 구조"], ["system", "시스템 수수료 (DB)"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFeeTab(id)}
            className={`px-4 py-2 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${feeTab === id ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {feeTab === "hierarchy" && (
        <div className="space-y-4">
          {/* Simulation box */}
          <div className="bg-card border border-border rounded-sm px-5 py-4">
            <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-3">수수료 시뮬레이션 (100,000원 기준 — 마스터: {MOCK_MASTERS[0].name}, 총판: {MOCK_DISTRIBUTORS[0].name})</div>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "사용자 구매", val: `₩${sample.toLocaleString("ko-KR")}`, color: "text-foreground" },
                { label: `시스템 ${sysRate}%`, val: `-₩${Math.round(sysF).toLocaleString("ko-KR")}`, color: "text-[#ef4444]" },
                { label: `마스터 ${m1Rate}%`, val: `-₩${Math.round(mF).toLocaleString("ko-KR")}`, color: "text-[#8247e5]" },
                { label: `총판 ${d1Rate}%`, val: `-₩${Math.round(dF).toLocaleString("ko-KR")}`, color: "text-[#3b82f6]" },
                { label: "매장 정산", val: `₩${Math.round(netF).toLocaleString("ko-KR")}`, color: "text-[#00d395]" },
              ].map((item, i, arr) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="text-center">
                    <div className={`font-['Barlow_Condensed'] text-xl font-bold ${item.color}`}>{item.val}</div>
                    <div className="font-mono text-[12px] text-muted-foreground">{item.label}</div>
                  </div>
                  {i < arr.length - 1 && <span className="text-muted-foreground font-bold">{i === arr.length - 2 ? "=" : "−"}</span>}
                </div>
              ))}
              <div className="ml-auto font-mono text-[13px] text-muted-foreground">
                총 공제율: {((sysF + mF + dF) / sample * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* System fee row */}
          <div className="bg-card border border-[#ef4444]/20 rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-[#ef4444]/5 flex items-center justify-between">
              <span className="font-mono text-[13px] text-[#ef4444] uppercase tracking-widest">시스템 관리자 수수료</span>
              <Badge variant="red">최우선 차감</Badge>
            </div>
            <div className="px-4 py-4 flex items-center gap-6">
              <div>
                <div className="font-mono text-[12px] text-muted-foreground mb-1">수수료율</div>
                {editingPartner === "system"
                  ? <div className="flex items-center gap-2">
                      <input type="number" step="0.1" min="0" max="10" value={sysRate}
                        onChange={(e) => setSysRate(e.target.value)}
                        className="w-20 bg-secondary border border-[#ef4444]/40 rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none" />
                      <span className="font-mono text-sm text-muted-foreground">%</span>
                      <button onClick={() => setEditingPartner(null)} className="px-2 py-1 bg-[#00d395] text-background font-mono text-[13px] rounded-sm"><Check size={10} /></button>
                      <button onClick={() => setEditingPartner(null)} className="px-2 py-1 border border-border font-mono text-[13px] text-muted-foreground rounded-sm"><X size={10} /></button>
                    </div>
                  : <div className="flex items-center gap-2">
                      <span className="font-['Barlow_Condensed'] text-3xl font-bold text-[#ef4444]">{sysRate}%</span>
                      <button onClick={() => setEditingPartner("system")} className="p-1 text-muted-foreground hover:text-[#ef4444] transition-colors"><Edit3 size={12} /></button>
                    </div>}
              </div>
              <div className="font-mono text-[13px] text-muted-foreground">전체 구매 거래에 먼저 적용되며, 이후 파트너 수수료가 차감됩니다.</div>
            </div>
          </div>

          {/* Master fees */}
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <span className="font-mono text-[13px] text-[#8247e5] uppercase tracking-widest">마스터 수수료</span>
              <Badge variant="purple">2순위 차감</Badge>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["마스터명", "코드", "수수료율", "하위 총판 수", "하위 매장 수", "상태", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.filter((p) => p.type === "master").map((m, i, arr) => (
                  <tr key={m.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === arr.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3 font-['Barlow'] text-sm font-semibold text-foreground">{m.name}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{m.code}</td>
                    <td className="px-4 py-3">
                      {editingPartner === m.id
                        ? <div className="flex items-center gap-1.5">
                            <input type="number" step="0.1" min="0" max="10" value={masterRates[m.id]}
                              onChange={(e) => setMasterRates((p) => ({ ...p, [m.id]: e.target.value }))}
                              className="w-16 bg-secondary border border-[#8247e5]/40 rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none" />
                            <span className="font-mono text-sm text-muted-foreground">%</span>
                            <button onClick={async () => { await api(`/partners/${m.id}`, { method: "PATCH", body: JSON.stringify({ fee_rate: parseFloat(masterRates[m.id]) }) }); setEditingPartner(null); }} className="px-2 py-1 bg-[#00d395] text-background font-mono text-[13px] rounded-sm"><Check size={10} /></button>
                            <button onClick={() => setEditingPartner(null)} className="px-2 py-1 border border-border font-mono text-[13px] text-muted-foreground rounded-sm"><X size={10} /></button>
                          </div>
                        : <span className="font-['Barlow_Condensed'] text-xl font-bold text-[#8247e5]">{masterRates[m.id]}%</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{partners.filter((d) => d.type === "distributor" && d.parent_id === m.id).length}개</td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{partners.filter((s) => s.type === "store" && (s.grandparent_name === m.name || partners.find((d) => d.id === s.parent_id)?.parent_id === m.id)).length}개</td>
                    <td className="px-4 py-3"><Badge variant={m.status === "active" ? "green" : "gray"}>{m.status === "active" ? "활성" : "비활성"}</Badge></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditingPartner(m.id)} className="p-1 text-muted-foreground hover:text-[#8247e5] transition-colors"><Edit3 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Distributor fees */}
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <span className="font-mono text-[13px] text-[#3b82f6] uppercase tracking-widest">총판 수수료</span>
              <Badge variant="blue">3순위 차감</Badge>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["총판명", "코드", "소속 마스터", "수수료율", "하위 매장 수", "상태", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.filter((p) => p.type === "distributor").map((d, i, arr) => (
                  <tr key={d.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === arr.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3 font-['Barlow'] text-sm font-semibold text-foreground">{d.name}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{d.code}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[#8247e5]">{d.parent_name}</td>
                    <td className="px-4 py-3">
                      {editingPartner === d.id
                        ? <div className="flex items-center gap-1.5">
                            <input type="number" step="0.1" min="0" max="10" value={distRates[d.id]}
                              onChange={(e) => setDistRates((p) => ({ ...p, [d.id]: e.target.value }))}
                              className="w-16 bg-secondary border border-[#3b82f6]/40 rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none" />
                            <span className="font-mono text-sm text-muted-foreground">%</span>
                            <button onClick={async () => { await api(`/partners/${d.id}`, { method: "PATCH", body: JSON.stringify({ fee_rate: parseFloat(distRates[d.id]) }) }); setEditingPartner(null); }} className="px-2 py-1 bg-[#00d395] text-background font-mono text-[13px] rounded-sm"><Check size={10} /></button>
                            <button onClick={() => setEditingPartner(null)} className="px-2 py-1 border border-border font-mono text-[13px] text-muted-foreground rounded-sm"><X size={10} /></button>
                          </div>
                        : <span className="font-['Barlow_Condensed'] text-xl font-bold text-[#3b82f6]">{distRates[d.id]}%</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{partners.filter((s) => s.type === "store" && s.parent_id === d.id).length}개</td>
                    <td className="px-4 py-3"><Badge variant={d.status === "active" ? "green" : "gray"}>{d.status === "active" ? "활성" : "비활성"}</Badge></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditingPartner(d.id)} className="p-1 text-muted-foreground hover:text-[#3b82f6] transition-colors"><Edit3 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-4 py-3">
            <div className="font-mono text-[13px] text-[#00d395] uppercase tracking-widest mb-1">매장 정산</div>
            <div className="font-mono text-[14px] text-muted-foreground">
              매장은 별도 수수료율 없이 <span className="text-foreground font-semibold">사용자 구매금액 − 시스템 수수료 − 마스터 수수료 − 총판 수수료</span> 로 자동 정산됩니다.
              매장의 정산 내역은 <span className="text-[#00d395]">정산 관리</span> 메뉴에서 확인하세요.
            </div>
          </div>
        </div>
      )}

      {feeTab === "system" && (
        loading ? <Spinner /> : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["유형", "네트워크", "요율 (%)", "고정 수수료", "최종 수정", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fees.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">수수료 설정 없음 (DB 초기화 필요)</td></tr>
                ) : fees.map((f, i) => (
                  <tr key={f.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === fees.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3"><Badge variant={f.type === "platform" ? "purple" : "blue"}>{f.type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{f.network}</td>
                    <td className="px-4 py-3">
                      {editing === f.id
                        ? <input type="number" step="0.001" value={editVal.fee_rate} onChange={(e) => setEditVal({ ...editVal, fee_rate: e.target.value })}
                            className="w-20 bg-secondary border border-[#8247e5]/40 rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none" />
                        : <span className="font-mono text-sm text-foreground">{(parseFloat(f.fee_rate) * 100).toFixed(2)}%</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editing === f.id
                        ? <input type="number" step="0.001" value={editVal.fixed_fee} onChange={(e) => setEditVal({ ...editVal, fixed_fee: e.target.value })}
                            className="w-20 bg-secondary border border-[#8247e5]/40 rounded-sm px-2 py-1 font-mono text-sm text-foreground focus:outline-none" />
                        : <span className="font-mono text-sm text-muted-foreground">${parseFloat(f.fixed_fee).toFixed(4)}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(f.updated_at).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3">
                      {editing === f.id
                        ? <div className="flex items-center gap-1">
                            <button onClick={() => save(f.id)} disabled={saving} className="px-2 py-1 bg-[#00d395] text-background font-mono text-[13px] rounded-sm hover:bg-[#00d395]/80 transition-colors"><Check size={10} /></button>
                            <button onClick={() => setEditing(null)} className="px-2 py-1 border border-border font-mono text-[13px] text-muted-foreground rounded-sm hover:text-foreground transition-colors"><X size={10} /></button>
                          </div>
                        : <button onClick={() => { setEditing(f.id); setEditVal({ fee_rate: f.fee_rate, fixed_fee: f.fixed_fee }); }}
                            className="p-1 text-muted-foreground hover:text-[#8247e5] transition-colors"><Edit3 size={12} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
