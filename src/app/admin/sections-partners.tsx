import { useState, useEffect, useCallback, Fragment } from "react";
import { AlertTriangle, ChevronRight, Circle, Plus, X, Edit3, Check, RefreshCw, EyeOff, Trash2, Save, Building2, Users } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard, api } from "./shared";
import { useI18n } from "../../lib/i18n";

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
  contact: string;
  created_at: string;
}

export const MOCK_MASTERS: Partner[] = [
  { id: "m1", name: "강남마스터", code: "MAS-001", type: "master", parent_id: null, parent_name: null, grandparent_name: null, fee_rate: 2.0, sub_count: 2, status: "active", contact: "010-1234-5678", created_at: "2024-01-10T09:00:00Z" },
  { id: "m2", name: "서초마스터", code: "MAS-002", type: "master", parent_id: null, parent_name: null, grandparent_name: null, fee_rate: 1.5, sub_count: 3, status: "active", contact: "010-2345-6789", created_at: "2024-02-15T10:00:00Z" },
  { id: "m3", name: "송파마스터", code: "MAS-003", type: "master", parent_id: null, parent_name: null, grandparent_name: null, fee_rate: 1.8, sub_count: 1, status: "inactive", contact: "010-3456-7890", created_at: "2024-03-20T11:00:00Z" },
];

export const MOCK_DISTRIBUTORS: Partner[] = [
  { id: "d1", name: "강남총판A", code: "DIS-001", type: "distributor", parent_id: "m1", parent_name: "강남마스터", grandparent_name: null, fee_rate: 1.5, sub_count: 3, status: "active", contact: "010-4567-8901", created_at: "2024-01-20T09:00:00Z" },
  { id: "d2", name: "강남총판B", code: "DIS-002", type: "distributor", parent_id: "m1", parent_name: "강남마스터", grandparent_name: null, fee_rate: 1.0, sub_count: 2, status: "active", contact: "010-5678-9012", created_at: "2024-02-01T09:00:00Z" },
  { id: "d3", name: "서초총판A", code: "DIS-003", type: "distributor", parent_id: "m2", parent_name: "서초마스터", grandparent_name: null, fee_rate: 1.2, sub_count: 4, status: "active", contact: "010-6789-0123", created_at: "2024-03-05T09:00:00Z" },
  { id: "d4", name: "서초총판B", code: "DIS-004", type: "distributor", parent_id: "m2", parent_name: "서초마스터", grandparent_name: null, fee_rate: 1.0, sub_count: 1, status: "active", contact: "010-7890-1234", created_at: "2024-04-10T09:00:00Z" },
  { id: "d5", name: "송파총판A", code: "DIS-005", type: "distributor", parent_id: "m3", parent_name: "송파마스터", grandparent_name: null, fee_rate: 1.3, sub_count: 2, status: "inactive", contact: "010-8901-2345", created_at: "2024-04-20T09:00:00Z" },
];

export const MOCK_STORES: Partner[] = [
  { id: "s1", name: "강남카페01", code: "STR-001", type: "store", parent_id: "d1", parent_name: "강남총판A", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "active", contact: "010-0001-0001", created_at: "2024-02-01T09:00:00Z" },
  { id: "s2", name: "강남편의점02", code: "STR-002", type: "store", parent_id: "d1", parent_name: "강남총판A", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "active", contact: "010-0001-0002", created_at: "2024-02-05T09:00:00Z" },
  { id: "s3", name: "강남약국03", code: "STR-003", type: "store", parent_id: "d1", parent_name: "강남총판A", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "active", contact: "010-0001-0003", created_at: "2024-02-10T09:00:00Z" },
  { id: "s4", name: "강남서점04", code: "STR-004", type: "store", parent_id: "d2", parent_name: "강남총판B", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "active", contact: "010-0002-0001", created_at: "2024-02-15T09:00:00Z" },
  { id: "s5", name: "강남헬스05", code: "STR-005", type: "store", parent_id: "d2", parent_name: "강남총판B", grandparent_name: "강남마스터", fee_rate: 0, sub_count: 0, status: "inactive", contact: "010-0002-0002", created_at: "2024-03-01T09:00:00Z" },
  { id: "s6", name: "서초식당06", code: "STR-006", type: "store", parent_id: "d3", parent_name: "서초총판A", grandparent_name: "서초마스터", fee_rate: 0, sub_count: 0, status: "active", contact: "010-0003-0001", created_at: "2024-03-10T09:00:00Z" },
  { id: "s7", name: "서초카페07", code: "STR-007", type: "store", parent_id: "d3", parent_name: "서초총판A", grandparent_name: "서초마스터", fee_rate: 0, sub_count: 0, status: "active", contact: "010-0003-0002", created_at: "2024-03-15T09:00:00Z" },
  { id: "s8", name: "서초마트08", code: "STR-008", type: "store", parent_id: "d4", parent_name: "서초총판B", grandparent_name: "서초마스터", fee_rate: 0, sub_count: 0, status: "active", contact: "010-0004-0001", created_at: "2024-04-20T09:00:00Z" },
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
  type, item, masters, distributors, adminRole, adminPartnerId, adminPartnerName, onSave, onClose,
}: {
  type: PartnerType; item: Partner | null;
  masters: Partner[]; distributors: Partner[];
  adminRole?: string;
  adminPartnerId?: string | null;
  adminPartnerName?: string | null;
  onSave: (p: Partner) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const isNew = !item;

  // Auto-fix parent_id when master adds a new distributor
  const autoParentId =
    isNew && adminRole === "master" && type === "distributor" && adminPartnerId
      ? adminPartnerId
      : "";

  const [form, setForm] = useState({
    name: item?.name ?? "",
    code: item?.code ?? "",
    parent_id: item?.parent_id ?? autoParentId,
    fee_rate: item ? String(item.fee_rate) : "1.0",
    contact: item?.contact ?? "",
    status: item?.status ?? "active",
    email: "",
    password: "",
  });

  const lockParent = isNew && adminRole === "master" && type === "distributor" && !!adminPartnerId;

  const parentOptions = type === "distributor" ? masters : type === "store" ? distributors : [];
  const parentLabel   = type === "distributor" ? t("p_parent_master") : type === "store" ? t("p_parent_dist") : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // lockParent인 경우 parentPartner를 admin 자신으로 설정
    const effectiveParentId = lockParent ? adminPartnerId! : form.parent_id;
    const parentPartner = lockParent
      ? { name: adminPartnerName ?? "마스터", id: adminPartnerId! } as any
      : parentOptions.find((p) => p.id === effectiveParentId);
    const grandparent = type === "store"
      ? masters.find((m) => m.id === (distributors.find((d) => d.id === effectiveParentId)?.parent_id))?.name ?? null
      : null;
    if (isNew && !form.email) { alert(t("p_email_required")); return; }
    if (isNew && form.password.length < 8) { alert(t("p_pw_required")); return; }
    onSave({
      id: item?.id ?? `new_${Date.now()}`,
      name: form.name, code: form.code, type,
      parent_id: effectiveParentId || null,
      parent_name: parentPartner?.name ?? null,
      grandparent_name: grandparent,
      fee_rate: parseFloat(form.fee_rate) || 0,
      sub_count: item?.sub_count ?? 0,
      status: form.status as "active" | "inactive",
      contact: form.contact,
      email: form.email || undefined,
      password: form.password || undefined,
      created_at: item?.created_at ?? new Date().toISOString(),
    } as any);
  };

  const TYPE_KO: Record<PartnerType, string> = { master: t("role_master"), distributor: t("role_distributor"), store: t("role_store") };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-sm p-6 w-[440px] space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">
            {item ? `${TYPE_KO[type]} ${t("u_tab_edit")}` : `${TYPE_KO[type]} Add`}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("p_name")}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("p_code")}</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
            </div>
          </div>
          {parentLabel && (
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{parentLabel}</label>
              {lockParent ? (
                <div className="w-full bg-secondary/50 border border-border rounded-sm px-3 py-2 font-mono text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8247e5] shrink-0" />
                  {adminPartnerName ?? t("role_master")}
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground/50">{t("p_auto_assigned")}</span>
                </div>
              ) : (
                <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50">
                  <option value="">{t("p_select")}</option>
                  {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {type !== "store" && (
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("p_fee_rate")}</label>
                <input type="number" step="0.1" min="0" max="10" value={form.fee_rate}
                  onChange={(e) => setForm({ ...form, fee_rate: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
              </div>
            )}
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("p_contact")}</label>
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("p_status")}</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50">
                <option value="active">{t("p_active")}</option>
                <option value="inactive">{t("p_inactive")}</option>
              </select>
            </div>
          </div>
          {isNew && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{t("p_login_account")}</div>
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("email")}</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="partner@example.com"
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("p_pw_label")}</label>
                <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
              </div>
            </div>
          )}
          <button type="submit" className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
            {t("p_save")}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── PartnerDetailPanel ───────────────────────────────────────────────────────

function PartnerDetailPanel({
  partner,
  masters,
  distributors,
  onClose,
  onSave,
  onDeactivate,
  onDelete,
}: {
  partner: Partner;
  masters: Partner[];
  distributors: Partner[];
  onClose: () => void;
  onSave: (p: Partner) => void;
  onDeactivate: (p: Partner) => void;
  onDelete: (p: Partner) => void;
}) {
  const [form, setForm] = useState({
    name: partner.name,
    code: partner.code,
    parent_id: partner.parent_id ?? "",
    fee_rate: String(partner.fee_rate),
    contact: partner.contact ?? "",
    status: partner.status,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"soft" | "hard" | null>(null);
  const [pwForm, setPwForm] = useState({ password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  const { t } = useI18n();
  const TYPE_KO: Record<PartnerType, string> = { master: t("role_master"), distributor: t("role_distributor"), store: t("role_store") };
  const TYPE_COLOR: Record<PartnerType, string> = { master: "#8247e5", distributor: "#3b82f6", store: "#00d395" };

  const parentOptions = partner.type === "distributor" ? masters : partner.type === "store" ? distributors : [];
  const parentLabel = partner.type === "distributor" ? t("p_parent_master") : partner.type === "store" ? t("p_parent_dist") : null;

  const handlePasswordChange = async () => {
    setPwError("");
    if (pwForm.password.length < 8) { setPwError(t("u_pw_min")); return; }
    if (pwForm.password !== pwForm.confirm) { setPwError(t("pw_mismatch")); return; }
    setPwSaving(true);
    try {
      await api(`/partners/${partner.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: pwForm.password }),
      });
      setPwForm({ password: "", confirm: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (err: any) {
      setPwError(err.message ?? t("p_pw_change_fail"));
    } finally {
      setPwSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parentPartner = parentOptions.find((p) => p.id === form.parent_id);
      const grandparent = partner.type === "store"
        ? masters.find((m) => m.id === (distributors.find((d) => d.id === form.parent_id)?.parent_id))?.name ?? null
        : null;
      await onSave({
        ...partner,
        name: form.name,
        code: form.code,
        parent_id: form.parent_id || null,
        parent_name: parentPartner?.name ?? partner.parent_name,
        grandparent_name: grandparent ?? partner.grandparent_name,
        fee_rate: parseFloat(form.fee_rate) || 0,
        status: form.status as "active" | "inactive",
        contact: form.contact,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const [detailTab, setDetailTab] = useState<"info" | "edit" | "danger">("info");

  const DETAIL_TABS = [
    { id: "info" as const, label: t("u_tab_info") },
    { id: "edit" as const, label: t("u_tab_edit") },
    { id: "danger" as const, label: t("u_tab_danger") },
  ];

  return (
    <div className="w-[380px] shrink-0 bg-card border border-border rounded-sm flex flex-col h-[calc(100vh-160px)] sticky top-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm flex items-center justify-center font-mono text-[13px] font-bold text-white shrink-0"
            style={{ backgroundColor: TYPE_COLOR[partner.type] }}>
            {partner.type === "store" ? <Building2 size={14} /> : <Users size={14} />}
          </div>
          <div>
            <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{TYPE_KO[partner.type]} Detail</div>
            <div className="font-['Barlow'] text-sm font-semibold text-foreground">{partner.name}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {DETAIL_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setDetailTab(t.id)}
            className={`flex-1 py-2.5 font-mono text-[13px] uppercase tracking-widest transition-colors border-b-2 ${
              detailTab === t.id
                ? t.id === "danger" ? "border-[#ef4444] text-[#ef4444]" : `border-[${TYPE_COLOR[partner.type]}] text-[${TYPE_COLOR[partner.type]}]`
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={detailTab === t.id && t.id !== "danger" ? { borderColor: TYPE_COLOR[partner.type], color: TYPE_COLOR[partner.type] } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-5 overflow-y-auto">

        {/* ── 정보 탭 ── */}
        {detailTab === "info" && (
          <div className="space-y-3">
            <div className="bg-secondary rounded-sm border border-border divide-y divide-border">
              <div className="flex justify-between items-center px-3 py-2">
                <span className="font-mono text-[12px] text-muted-foreground">Type</span>
                <span className="font-mono text-[13px] font-bold" style={{ color: TYPE_COLOR[partner.type] }}>{TYPE_KO[partner.type]}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2">
                <span className="font-mono text-[12px] text-muted-foreground">{t("p_code")}</span>
                <span className="font-mono text-[13px] text-foreground">{partner.code}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2">
                <span className="font-mono text-[12px] text-muted-foreground">{t("p_status")}</span>
                <span className="font-mono text-[13px] font-bold" style={{ color: partner.status === "active" ? "#00d395" : "#6b7280" }}>
                  {partner.status === "active" ? t("p_active") : t("p_inactive")}
                </span>
              </div>
              <div className="flex justify-between items-center px-3 py-2">
                <span className="font-mono text-[12px] text-muted-foreground">Registered</span>
                <span className="font-mono text-[13px] text-foreground">{new Date(partner.created_at).toLocaleDateString()}</span>
              </div>
              {partner.type !== "store" && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="font-mono text-[12px] text-muted-foreground">{t("p_fee_rate")}</span>
                  <span className="font-['Barlow_Condensed'] text-xl font-bold" style={{ color: TYPE_COLOR[partner.type] }}>{partner.fee_rate.toFixed(1)}%</span>
                </div>
              )}
              {partner.sub_count > 0 && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="font-mono text-[12px] text-muted-foreground">Sub-partners</span>
                  <span className="font-mono text-[13px] text-foreground">{partner.sub_count}</span>
                </div>
              )}
              {partner.contact && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="font-mono text-[12px] text-muted-foreground">{t("p_contact")}</span>
                  <span className="font-mono text-[13px] text-foreground">{partner.contact}</span>
                </div>
              )}
              {partner.parent_name && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="font-mono text-[12px] text-muted-foreground">{partner.type === "store" ? t("p_parent_dist") : t("p_parent_master")}</span>
                  <span className="font-mono text-[13px] text-foreground">{partner.parent_name}</span>
                </div>
              )}
              {partner.grandparent_name && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="font-mono text-[12px] text-muted-foreground">{t("p_parent_master")}</span>
                  <span className="font-mono text-[13px] text-foreground">{partner.grandparent_name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 수정 탭 ── */}
        {detailTab === "edit" && (
          <div className="space-y-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("p_name")}</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("p_code")}</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
                </div>
              </div>

              {parentLabel && (
                <div className="space-y-1">
                  <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{parentLabel}</label>
                  <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50">
                    <option value="">{t("p_select")}</option>
                    {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
              )}

              {partner.type !== "store" && (
                <div className="space-y-1">
                  <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("p_fee_rate")}</label>
                  <input type="number" step="0.1" min="0" max="10" value={form.fee_rate}
                    onChange={(e) => setForm({ ...form, fee_rate: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("p_contact")}</label>
                  <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("p_status")}</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50">
                    <option value="active">{t("p_active")}</option>
                    <option value="inactive">{t("p_inactive")}</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin inline-block" />
                : saved ? <Check size={13} />
                : <Save size={13} />}
              {saved ? t("u_saved") : t("u_save_changes")}
            </button>

            {/* 비밀번호 변경 */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{t("u_change_password")}</div>
              <input
                type="password"
                placeholder={t("u_new_password_ph")}
                value={pwForm.password}
                onChange={(e) => { setPwForm({ ...pwForm, password: e.target.value }); setPwError(""); }}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
              <input
                type="password"
                placeholder={t("u_confirm_password_ph")}
                value={pwForm.confirm}
                onChange={(e) => { setPwForm({ ...pwForm, confirm: e.target.value }); setPwError(""); }}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
              {pwError && <div className="font-mono text-[12px] text-[#ef4444]">{pwError}</div>}
              <button
                onClick={handlePasswordChange}
                disabled={pwSaving || !pwForm.password}
                className="w-full py-2 border border-[#8247e5]/40 text-[#8247e5] font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/10 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {pwSaving ? <span className="w-3 h-3 border border-[#8247e5]/40 border-t-[#8247e5] rounded-full animate-spin inline-block" />
                  : pwSaved ? <Check size={13} />
                  : <Save size={13} />}
                {pwSaved ? t("u_changed") : t("u_pw_save")}
              </button>
            </div>
          </div>
        )}

        {/* ── 위험 탭 ── */}
        {detailTab === "danger" && (
          <div className="space-y-4">
            <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-4 py-3">
              <div className="font-mono text-[12px] text-[#ef4444] uppercase tracking-widest mb-1">{t("u_caution")}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{t("u_danger_desc")}</div>
            </div>

            {confirmMode === null ? (
              <div className="space-y-2">
                {partner.status === "active" && (
                  <button onClick={() => setConfirmMode("soft")}
                    className="w-full py-3 border border-[#f59e0b]/30 text-[#f59e0b] font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#f59e0b]/10 transition-colors flex items-center justify-center gap-1.5">
                    <EyeOff size={12} /> {t("p_inactive")}
                  </button>
                )}
                <button onClick={() => setConfirmMode("hard")}
                  className="w-full py-3 border border-[#ef4444]/30 text-[#ef4444] font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#ef4444]/10 transition-colors flex items-center justify-center gap-1.5">
                  <Trash2 size={12} /> {t("u_delete_user")}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`rounded-sm px-3 py-3 font-mono text-[13px] border ${confirmMode === "hard" ? "bg-[#ef4444]/5 border-[#ef4444]/20 text-[#ef4444]" : "bg-[#f59e0b]/5 border-[#f59e0b]/20 text-[#f59e0b]"}`}>
                  {confirmMode === "hard" ? t("u_delete_confirm_msg") : "Will be deactivated. Data will be retained."}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { confirmMode === "hard" ? onDelete(partner) : onDeactivate(partner); setConfirmMode(null); }}
                    className="flex-1 py-2.5 font-mono text-[13px] uppercase tracking-widest rounded-sm text-white transition-colors"
                    style={{ backgroundColor: confirmMode === "hard" ? "#ef4444" : "#f59e0b" }}>
                    Confirm
                  </button>
                  <button onClick={() => setConfirmMode(null)}
                    className="flex-1 py-2.5 border border-border text-muted-foreground font-mono text-[13px] uppercase tracking-widest rounded-sm hover:text-foreground transition-colors">
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PartnersSection ──────────────────────────────────────────────────────────

export function PartnersSection({ role = "system_admin", partnerId = null, partnerName = null }: { role?: string; partnerId?: string | null; partnerName?: string | null }) {
  const { t } = useI18n();
  type Tab = "master" | "distributor" | "store";

  // Role-based visible tabs: master sees only distributor+store, distributor sees only store
  const visibleTabs: Tab[] = role === "master"
    ? ["distributor", "store"]
    : role === "distributor"
    ? ["store"]
    : ["master", "distributor", "store"];

  const [tab, setTab] = useState<Tab>(visibleTabs[0]);
  const [allPartners, setAllPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item: Partner | null }>({ open: false, item: null });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; partner: Partner | null; mode: "soft" | "hard" }>({ open: false, partner: null, mode: "hard" });
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/partners");
      setAllPartners(data ?? []);
    } catch { setAllPartners([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  // Scope data to current partner's subtree for non-system_admin roles
  const scopedPartners = allPartners.filter((p) => {
    if (role === "system_admin") return true;
    if (role === "master") {
      // Show distributors whose parent is this master, and stores whose grandparent is this master
      if (p.type === "distributor") return p.parent_id === partnerId;
      if (p.type === "store") {
        const parentDist = allPartners.find((d) => d.id === p.parent_id);
        return parentDist?.parent_id === partnerId;
      }
      return false;
    }
    if (role === "distributor") {
      // Show only stores under this distributor
      return p.type === "store" && p.parent_id === partnerId;
    }
    return false;
  });

  const masters      = scopedPartners.filter((p) => p.type === "master");
  const distributors = scopedPartners.filter((p) => p.type === "distributor");
  const stores       = scopedPartners.filter((p) => p.type === "store");

  const listMap: Record<Tab, Partner[]> = { master: masters, distributor: distributors, store: stores };
  const list = listMap[tab];

  const handleDeactivate = async (p: Partner) => {
    try {
      await api(`/partners/${p.id}`, { method: "PATCH", body: JSON.stringify({ status: "inactive" }) });
      setConfirmDelete({ open: false, partner: null, mode: "hard" });
      fetchPartners();
    } catch (err: any) { alert(err.message ?? "비활성화 실패"); }
  };

  const handleHardDelete = async (p: Partner) => {
    try {
      await api(`/partners/${p.id}`, { method: "DELETE" });
      setConfirmDelete({ open: false, partner: null, mode: "hard" });
      fetchPartners();
    } catch (err: any) { alert(err.message ?? "삭제 실패"); }
  };

  const handleSave = async (p: Partner) => {
    try {
      if (p.id.startsWith("new_")) {
        await api("/partners", {
          method: "POST",
          body: JSON.stringify({ name: p.name, code: p.code, type: p.type, parent_id: p.parent_id || null, fee_rate: p.fee_rate, status: p.status, contact: p.contact, email: (p as any).email, password: (p as any).password }),
        });
      } else {
        await api(`/partners/${p.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: p.name, code: p.code, parent_id: p.parent_id || null, fee_rate: p.fee_rate, status: p.status, contact: p.contact }),
        });
      }
      setModal({ open: false, item: null });
      fetchPartners();
    } catch (err: any) { alert(err.message ?? "저장 실패"); }
  };

  const ALL_TABS: { id: Tab; label: string; color: string }[] = [
    { id: "master", label: t("role_master"), color: "#8247e5" },
    { id: "distributor", label: t("role_distributor"), color: "#3b82f6" },
    { id: "store", label: t("role_store"), color: "#00d395" },
  ];
  const TABS = ALL_TABS.filter((tab) => visibleTabs.includes(tab.id));

  // Hierarchy nodes shown depend on role
  const hierarchyNodes = role === "system_admin"
    ? [
        { label: t("role_system_admin"), rate: `${SYSTEM_FEE_RATE}%`, color: "#ef4444", count: 1 },
        { label: t("role_master"), rate: `avg ${masters.length ? (masters.reduce((s, m) => s + m.fee_rate, 0) / masters.length).toFixed(1) : "0.0"}%`, color: "#8247e5", count: masters.length },
        { label: t("role_distributor"), rate: `avg ${distributors.length ? (distributors.reduce((s, d) => s + d.fee_rate, 0) / distributors.length).toFixed(1) : "0.0"}%`, color: "#3b82f6", count: distributors.length },
        { label: t("role_store"), rate: "Net", color: "#00d395", count: stores.length },
      ]
    : role === "master"
    ? [
        { label: t("role_distributor"), rate: `avg ${distributors.length ? (distributors.reduce((s, d) => s + d.fee_rate, 0) / distributors.length).toFixed(1) : "0.0"}%`, color: "#3b82f6", count: distributors.length },
        { label: t("role_store"), rate: "Net", color: "#00d395", count: stores.length },
      ]
    : [
        { label: "매장", rate: "순정산", color: "#00d395", count: stores.length },
      ];

  return (
    <div className="space-y-4">
      {/* Hierarchy visual */}
      <div className="bg-card border border-border rounded-sm px-5 py-4">
        <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-3">수수료 계층 구조</div>
        <div className="flex items-center gap-0 overflow-x-auto">
          {hierarchyNodes.map((node, i, arr) => (
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
      <div className={`grid gap-3 ${role === "system_admin" ? "grid-cols-4" : role === "master" ? "grid-cols-3" : "grid-cols-2"}`}>
        {role === "system_admin" && (
          <StatCard label="마스터 수" value={String(masters.filter((m) => m.status === "active").length)} sub={`전체 ${masters.length}개`} accent="#8247e5" />
        )}
        {(role === "system_admin" || role === "master") && (
          <StatCard label="총판 수" value={String(distributors.filter((d) => d.status === "active").length)} sub={`전체 ${distributors.length}개`} accent="#3b82f6" />
        )}
        <StatCard label="매장 수" value={String(stores.filter((s) => s.status === "active").length)} sub={`전체 ${stores.length}개`} accent="#00d395" />
        <StatCard
          label="활성 파트너"
          value={String(
            (role === "system_admin" ? masters.filter((m) => m.status === "active").length : 0) +
            (role !== "distributor" ? distributors.filter((d) => d.status === "active").length : 0) +
            stores.filter((s) => s.status === "active").length
          )}
          sub="전체 합산"
        />
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

      {/* Table + Detail Panel */}
      <div className="flex gap-4 items-start">
        <div className={selectedPartner ? "flex-1 min-w-0 overflow-hidden" : "w-full"}>
          {loading ? <Spinner /> : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {(selectedPartner
                    ? [t("p_name"), t("p_code"), t("p_status"), "Registered", ""]
                    : tab === "store"
                      ? ["Store", t("p_code"), t("p_parent_dist"), t("p_parent_master"), t("p_contact"), t("p_status"), "Registered", ""]
                      : tab === "distributor"
                        ? ["Distributor", t("p_code"), t("p_parent_master"), t("p_fee_rate"), "Sub-stores", t("p_contact"), t("p_status"), "Registered", ""]
                        : ["Master", t("p_code"), t("p_fee_rate"), "Sub-dist.", t("p_contact"), t("p_status"), "Registered", ""]
                  ).map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">No partners registered</td></tr>
                ) : list.map((p, i) => {
                  const isSelected = selectedPartner?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPartner(isSelected ? null : p)}
                      className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${i === list.length - 1 ? "border-0" : ""} ${isSelected ? "bg-[#8247e5]/10 border-l-2 border-l-[#8247e5]" : ""}`}>
                      <td className="px-4 py-3 font-['Barlow'] text-sm font-semibold text-foreground">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{p.code}</td>
                      {!selectedPartner && tab === "store" && <td className="px-4 py-3 font-mono text-sm text-[#3b82f6]">{p.parent_name ?? "—"}</td>}
                      {!selectedPartner && tab === "store" && <td className="px-4 py-3 font-mono text-sm text-[#8247e5]">{p.grandparent_name ?? "—"}</td>}
                      {!selectedPartner && tab === "distributor" && <td className="px-4 py-3 font-mono text-sm text-[#8247e5]">{p.parent_name ?? "—"}</td>}
                      {!selectedPartner && tab !== "store" && (
                        <td className="px-4 py-3">
                          <span className="font-['Barlow_Condensed'] text-xl font-bold" style={{ color: tab === "master" ? "#8247e5" : "#3b82f6" }}>{p.fee_rate.toFixed(1)}%</span>
                        </td>
                      )}
                      {!selectedPartner && tab !== "store" && <td className="px-4 py-3 font-mono text-sm text-foreground">{p.sub_count}개</td>}
                      {!selectedPartner && <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{p.contact}</td>}
                      <td className="px-4 py-3">
                        <Badge variant={p.status === "active" ? "green" : "gray"}>{p.status === "active" ? t("p_active") : t("p_inactive")}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedPartner(isSelected ? null : p)} title="상세/수정" className={`p-1 transition-colors ${isSelected ? "text-[#8247e5]" : "text-muted-foreground hover:text-[#8247e5]"}`}><Edit3 size={12} /></button>
                          {!selectedPartner && p.status === "active" && (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, partner: p, mode: "soft" }); }} title="비활성화" className="p-1 text-muted-foreground hover:text-[#f59e0b] transition-colors"><EyeOff size={12} /></button>
                          )}
                          {!selectedPartner && (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, partner: p, mode: "hard" }); }} title="영구 삭제" className="p-1 text-muted-foreground hover:text-[#ef4444] transition-colors"><Trash2 size={12} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedPartner && (
          <PartnerDetailPanel
            partner={selectedPartner}
            masters={masters}
            distributors={distributors}
            onClose={() => setSelectedPartner(null)}
            onSave={async (p) => { await handleSave(p); const updated = allPartners.find((a) => a.id === p.id); if (updated) setSelectedPartner({ ...updated, ...p }); }}
            onDeactivate={async (p) => { await handleDeactivate(p); setSelectedPartner(null); }}
            onDelete={async (p) => { await handleHardDelete(p); setSelectedPartner(null); }}
          />
        )}
      </div>

      {modal.open && (
        <PartnerFormModal
          type={tab} item={modal.item}
          masters={masters} distributors={distributors}
          adminRole={role} adminPartnerId={partnerId} adminPartnerName={partnerName}
          onSave={handleSave} onClose={() => setModal({ open: false, item: null })}
        />
      )}

      {confirmDelete.open && confirmDelete.partner && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-[420px] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[13px] uppercase tracking-widest" style={{ color: confirmDelete.mode === "hard" ? "#ef4444" : "#f59e0b" }}>
                {confirmDelete.mode === "hard" ? "파트너 영구 삭제" : "파트너 비활성화"}
              </span>
              <button onClick={() => setConfirmDelete({ open: false, partner: null, mode: "hard" })} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>

            <div className="bg-secondary rounded-sm px-4 py-3 space-y-1">
              <div className="font-mono text-[13px] text-muted-foreground">대상 파트너</div>
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{confirmDelete.partner.name}</div>
              <div className="font-mono text-[12px] text-muted-foreground">{confirmDelete.partner.code} · {confirmDelete.partner.type === "master" ? "마스터" : confirmDelete.partner.type === "distributor" ? "총판" : "매장"}</div>
            </div>

            {confirmDelete.mode === "hard" ? (
              <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-4 py-3 font-mono text-[13px] text-[#ef4444]">
                DB에서 완전히 제거됩니다. 연결된 하위 파트너가 있으면 삭제가 거부될 수 있습니다. 이 작업은 되돌릴 수 없습니다.
              </div>
            ) : (
              <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-3 font-mono text-[13px] text-[#f59e0b]">
                파트너를 비활성화합니다. 데이터는 유지되며 언제든 재활성화할 수 있습니다.
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => confirmDelete.mode === "hard" ? handleHardDelete(confirmDelete.partner!) : handleDeactivate(confirmDelete.partner!)}
                className="flex-1 py-2 font-mono text-sm uppercase tracking-widest rounded-sm text-white transition-colors"
                style={{ backgroundColor: confirmDelete.mode === "hard" ? "#ef4444" : "#f59e0b" }}>
                {confirmDelete.mode === "hard" ? "영구 삭제" : "비활성화"}
              </button>
              <button onClick={() => setConfirmDelete({ open: false, partner: null, mode: "hard" })}
                className="flex-1 py-2 border border-border font-mono text-sm uppercase tracking-widest rounded-sm text-muted-foreground hover:text-foreground transition-colors">
                취소
              </button>
            </div>
          </div>
        </div>
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
  const { t } = useI18n();
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

  const fmt = (n: number) => n.toLocaleString() + "원";

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
                  <td className="px-3 py-3 font-['Barlow_Condensed'] text-lg font-bold text-foreground">{s.gross_krw.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <div className="font-mono text-sm text-[#8247e5]">{s.coin_amount} {s.coin_symbol}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-[13px] text-[#ef4444]">-{s.system_fee_amt.toLocaleString()}</td>
                  <td className="px-3 py-3 font-mono text-[13px] text-[#8247e5]">-{s.master_fee_amt.toLocaleString()}</td>
                  <td className="px-3 py-3 font-mono text-[13px] text-[#3b82f6]">-{s.dist_fee_amt.toLocaleString()}</td>
                  <td className="px-3 py-3 font-['Barlow_Condensed'] text-lg font-bold text-[#00d395]">{s.net_krw.toLocaleString()}</td>
                  <td className="px-3 py-3"><Badge variant={s.status === "settled" ? "green" : "yellow"}>{s.status === "settled" ? "완료" : "대기"}</Badge></td>
                  <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{new Date(s.created_at).toLocaleString({ month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
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

export function FeesSection({ adminEmail, role = "system_admin", partnerId = null }: { adminEmail: string; role?: string; partnerId?: string | null }) {
  const { t } = useI18n();
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
                { label: "사용자 구매", val: `₩${sample.toLocaleString()}`, color: "text-foreground" },
                { label: `시스템 ${sysRate}%`, val: `-₩${Math.round(sysF).toLocaleString()}`, color: "text-[#ef4444]" },
                { label: `마스터 ${m1Rate}%`, val: `-₩${Math.round(mF).toLocaleString()}`, color: "text-[#8247e5]" },
                { label: `총판 ${d1Rate}%`, val: `-₩${Math.round(dF).toLocaleString()}`, color: "text-[#3b82f6]" },
                { label: "매장 정산", val: `₩${Math.round(netF).toLocaleString()}`, color: "text-[#00d395]" },
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

          {/* System fee row — system_admin only */}
          {role === "system_admin" && <div className="bg-card border border-[#ef4444]/20 rounded-sm overflow-hidden">
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
          </div>}

          {/* Master fees */}
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <span className="font-mono text-[13px] text-[#8247e5] uppercase tracking-widest">{t("role_master")} Fee</span>
              <Badge variant="purple">Priority 2</Badge>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Master", t("p_code"), t("p_fee_rate"), "Sub-dist.", "Sub-stores", t("p_status"), ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.filter((p) => p.type === "master" && (role === "system_admin" || p.id === partnerId)).map((m, i, arr) => (
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
                    <td className="px-4 py-3"><Badge variant={m.status === "active" ? "green" : "gray"}>{m.status === "active" ? t("p_active") : t("p_inactive")}</Badge></td>
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
              <span className="font-mono text-[13px] text-[#3b82f6] uppercase tracking-widest">{t("role_distributor")} Fee</span>
              <Badge variant="blue">Priority 3</Badge>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Distributor", t("p_code"), t("p_parent_master"), t("p_fee_rate"), "Sub-stores", t("p_status"), ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partners.filter((p) => p.type === "distributor" && (role === "system_admin" || p.parent_id === partnerId)).map((d, i, arr) => (
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
                    <td className="px-4 py-3"><Badge variant={d.status === "active" ? "green" : "gray"}>{d.status === "active" ? t("p_active") : t("p_inactive")}</Badge></td>
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
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(f.updated_at).toLocaleString()}</td>
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
