import { useState, useEffect, useCallback } from "react";
import { Lock, Plus, X, Edit3, Trash2, Copy, Check, ChevronDown, ChevronRight, CheckCircle, User, Save, AlertTriangle } from "lucide-react";
import { supabaseAdmin as supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard, api, apiAuth } from "./shared";
import { useI18n } from "../../lib/i18n";
import { TOTAL_USD } from "../user/constants";
import { useUsdToKrw } from "../user/hooks";

const CHAIN_COLORS: Record<string, string> = {
  polygon: "#8247e5", ethereum: "#627eea", bnb: "#f0b90b",
  tron: "#e84142", bitcoin: "#f7931a", solana: "#9945ff",
};

// ─── UserDetailPanel ──────────────────────────────────────────────────────────

function UserDetailPanel({
  user,
  wallets,
  partnerMap,
  partnerList,
  adminEmail,
  onClose,
  onRefresh,
}: {
  user: any;
  wallets: any[];
  partnerMap: Record<string, { name: string; role: string; code: string }>;
  partnerList: { id: string; name: string; role: string; code: string }[];
  adminEmail: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    status: user.status ?? "active",
    kyc_tier: user.kyc_tier ?? "T0",
    partner_id: user.partner_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pwForm, setPwForm] = useState({ password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  const isSystemAdmin = user.role === "system_admin";

  const userWallets = wallets.filter((w) => w.user_id === user.id);

  const copyAddr = (addr: string) => {
    navigator.clipboard?.writeText(addr).catch(() => {});
    setCopied(addr);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: form.status,
          kyc_tier: form.kyc_tier,
          partner_id: form.partner_id || null,
        }),
      });
      await supabase.from("admin_logs").insert({
        admin_email: adminEmail,
        action: "update_user",
        target_type: "user",
        target_id: user.id,
        detail: { email: user.email, changes: form },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError("");
    if (pwForm.password.length < 8) { setPwError(t("u_pw_min")); return; }
    if (pwForm.password !== pwForm.confirm) { setPwError(t("pw_mismatch")); return; }
    setPwSaving(true);
    try {
      await api(`/users/${user.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: pwForm.password }),
      });
      await supabase.from("admin_logs").insert({
        admin_email: adminEmail,
        action: "change_password",
        target_type: "user",
        target_id: user.id,
        detail: { email: user.email },
      });
      setPwForm({ password: "", confirm: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (err: any) {
      setPwError(err.message ?? t("u_pw_change_fail"));
    } finally {
      setPwSaving(false);
    }
  };

  const handleDelete = async () => {
    await api(`/users/${user.id}`, { method: "DELETE" });
    await supabase.from("admin_logs").insert({
      admin_email: adminEmail,
      action: "delete_user",
      target_type: "user",
      target_id: user.id,
      detail: { email: user.email },
    });
    onClose();
    onRefresh();
  };

  const statusColors: Record<string, string> = {
    active: "#00d395", suspended: "#ef4444", pending_kyc: "#f59e0b", pending_approval: "#f59e0b",
  };
  const kycColors: Record<string, string> = { T2: "#8247e5", T1: "#3b82f6", T0: "#6b7280" };

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "??";

  const [detailTab, setDetailTab] = useState<"info" | "edit" | "danger">("info");

  const DETAIL_TABS = [
    { id: "info" as const, label: t("u_tab_info") },
    { id: "edit" as const, label: t("u_tab_edit") },
    ...(isSystemAdmin ? [] : [{ id: "danger" as const, label: t("u_tab_danger") }]),
  ];

  return (
    <div className="w-[400px] shrink-0 bg-card border border-border rounded-sm flex flex-col h-[calc(100vh-160px)] sticky top-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm flex items-center justify-center font-mono text-[13px] font-bold text-white shrink-0"
            style={{ backgroundColor: isSystemAdmin ? "#8247e5" : "#3b82f6" }}>
            {initials}
          </div>
          <div>
            <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{t("u_member_detail")}</div>
            <div className="font-['Barlow'] text-sm font-semibold text-foreground truncate max-w-[200px]">{user.email}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
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
                ? t.id === "danger" ? "border-[#ef4444] text-[#ef4444]" : "border-[#8247e5] text-[#8247e5]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — no overflow scroll, fits in view */}
      <div className="flex-1 p-5 overflow-y-auto">

        {/* ── 정보 탭 ── */}
        {detailTab === "info" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{t("u_basic_info")}</div>
              <div className="bg-secondary rounded-sm border border-border divide-y divide-border">
                {[
                  { label: t("u_joined"), value: new Date(user.joined_at).toLocaleDateString() },
                  { label: t("u_tx_count_label"), value: `${user.tx_count ?? 0}` },
                  { label: "ID", value: user.id?.slice(0, 16) + "..." },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center px-3 py-2">
                    <span className="font-mono text-[12px] text-muted-foreground">{label}</span>
                    <span className="font-mono text-[13px] text-foreground">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="font-mono text-[12px] text-muted-foreground">{t("u_status_label")}</span>
                  <span className="font-mono text-[13px]" style={{ color: statusColors[user.status] ?? "#6b7280" }}>{user.status}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="font-mono text-[12px] text-muted-foreground">KYC</span>
                  <span className="font-mono text-[13px] font-bold" style={{ color: kycColors[user.kyc_tier] ?? "#6b7280" }}>{user.kyc_tier ?? "T0"}</span>
                </div>
                {user.partner_id && partnerMap[user.partner_id] && (
                  <div className="flex justify-between items-center px-3 py-2">
                    <span className="font-mono text-[12px] text-muted-foreground">{t("u_partner_label")}</span>
                    <div className="text-right">
                      <div className="font-mono text-[13px] text-foreground font-bold">{partnerMap[user.partner_id].name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{partnerMap[user.partner_id].code}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {userWallets.length > 0 && (
              <div className="space-y-2">
                <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{t("u_wallet_addresses")} ({userWallets.length})</div>
                <div className="space-y-1.5">
                  {userWallets.map((w) => (
                    <div key={w.chain_name}
                      className="flex items-center gap-2 bg-secondary border border-border rounded-sm px-3 py-2"
                      style={{ borderColor: (CHAIN_COLORS[w.chain_name] ?? "#6b7280") + "30" }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-background shrink-0"
                        style={{ backgroundColor: CHAIN_COLORS[w.chain_name] ?? "#6b7280" }}>
                        {w.chain_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold capitalize" style={{ color: CHAIN_COLORS[w.chain_name] ?? "#6b7280" }}>{w.chain_name}</span>
                          {w.is_primary && <span className="font-mono text-[9px] text-[#00d395] border border-[#00d395]/30 px-1 rounded">{t("u_wallet_primary")}</span>}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground truncate">{w.address}</div>
                      </div>
                      <button onClick={() => copyAddr(w.address)} className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
                        {copied === w.address ? <Check size={11} className="text-[#00d395]" /> : <Copy size={11} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userWallets.length === 0 && (
              <div className="text-center py-6 font-mono text-[13px] text-muted-foreground">{t("u_no_wallet")}</div>
            )}
          </div>
        )}

        {/* ── 수정 탭 ── */}
        {detailTab === "edit" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("u_account_status")}</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  disabled={isSystemAdmin}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50 disabled:opacity-50">
                  <option value="pending_approval">{t("u_status_opt_pending_approval")}</option>
                  <option value="active">{t("u_status_opt_active")}</option>
                  <option value="suspended">{t("u_status_opt_suspended")}</option>
                  <option value="pending_kyc">{t("u_status_opt_pending_kyc")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("u_kyc_grade")}</label>
                <div className="flex gap-2">
                  {["T0", "T1", "T2"].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setForm({ ...form, kyc_tier: tier })}
                      className="flex-1 py-2.5 rounded-sm font-mono text-[13px] font-bold border transition-colors"
                      style={{
                        backgroundColor: form.kyc_tier === tier ? kycColors[tier] + "20" : "transparent",
                        borderColor: form.kyc_tier === tier ? kycColors[tier] + "60" : "var(--border)",
                        color: form.kyc_tier === tier ? kycColors[tier] : "var(--muted-foreground)",
                      }}>
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("u_partner_affiliation")}</label>
                <select
                  value={form.partner_id}
                  onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50">
                  <option value="">{t("u_no_affiliation")}</option>
                  {partnerList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code} · {p.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || isSystemAdmin}
              className="w-full py-2.5 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin inline-block" />
                : saved ? <Check size={13} />
                : <Save size={13} />}
              {saved ? t("u_saved") : t("u_save_changes")}
            </button>

            {/* 비밀번호 변경 */}
            {!isSystemAdmin && (
              <div className="border-t border-border pt-4 space-y-2">
                <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">{t("u_change_password")}</div>
                <input
                  type="password"
                  placeholder={t("u_new_password_ph")}
                  value={pwForm.password}
                  autoComplete="new-password"
                  onChange={(e) => { setPwForm({ ...pwForm, password: e.target.value }); setPwError(""); }}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
                <input
                  type="password"
                  placeholder={t("u_confirm_password_ph")}
                  value={pwForm.confirm}
                  autoComplete="new-password"
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
            )}
          </div>
        )}

        {/* ── 위험 탭 ── */}
        {detailTab === "danger" && !isSystemAdmin && (
          <div className="space-y-4">
            <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-4 py-3">
              <div className="font-mono text-[12px] text-[#ef4444] uppercase tracking-widest mb-1">{t("u_caution")}</div>
              <div className="font-mono text-[13px] text-muted-foreground">{t("u_danger_desc")}</div>
            </div>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-3 border border-[#ef4444]/30 text-[#ef4444] font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#ef4444]/10 transition-colors flex items-center justify-center gap-1.5">
                <Trash2 size={12} /> {t("u_delete_user")}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-3 font-mono text-[13px] text-[#ef4444]">
                  {t("u_delete_confirm_msg")}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDelete}
                    className="flex-1 py-2.5 bg-[#ef4444] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#ef4444]/80 transition-colors">
                    {t("u_delete_confirm_btn")}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
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

// ─── UsersSection ─────────────────────────────────────────────────────────────

export function UsersSection({ adminEmail, adminToken, role = "system_admin", partnerId = null }: { adminEmail: string; adminToken?: string | null; role?: string; partnerId?: string | null }) {
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [allWallets, setAllWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [walletModal, setWalletModal] = useState<{ email: string; wallets: any[] } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", wallet_address: "", status: "pending_approval", kyc_tier: "T0", role: "user", partner_id: "" });
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const [partnerMap, setPartnerMap] = useState<Record<string, { name: string; role: string; code: string }>>({});
  const [partnerList, setPartnerList] = useState<{ id: string; name: string; role: string; code: string }[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("status", filter);
      // adminToken이 있으면 apiAuth(사용자 JWT)로 호출 → 서버에서 조직격리 적용
      const fetchFn = adminToken
        ? (path: string) => apiAuth(path, adminToken)
        : api;
      const [data, { data: walletRows }, partnersData] = await Promise.all([
        fetchFn(`/users?${params}`),
        supabase.from("wallets").select("user_id, address, chain_name, chain_id, network, is_primary, derivation_path"),
        fetchFn("/partners"),
      ]);
      setAllWallets(walletRows ?? []);

      // 파트너 맵 구성 (서버가 이미 조직격리된 목록을 반환)
      const allPartnersArr: any[] = partnersData ?? [];
      const pMap: Record<string, { name: string; role: string; code: string }> = {};
      const pList: { id: string; name: string; role: string; code: string }[] = [];
      for (const a of allPartnersArr) {
        pMap[a.id] = { name: a.name, role: a.type, code: a.code ?? "" };
        pList.push({ id: a.id, name: a.name, role: a.type, code: a.code ?? "" });
      }
      setPartnerMap(pMap);
      setPartnerList(pList);
      const allUsers = (data ?? []).map((u: any) => {
        const uw = (walletRows ?? []).filter((w: any) => w.user_id === u.id);
        const primary = uw.find((w: any) => w.is_primary) ?? uw.find((w: any) => w.chain_name === "polygon") ?? uw[0];
        return {
          ...u,
          wallet_address: primary?.address ?? u.wallet_address ?? null,
          wallet_status: uw.length > 0 ? "active" : (u.wallet_status ?? "none"),
          _wallet_count: uw.length,
        };
      });
      // 클라이언트 2차 방어: partner_id가 없는 유저는 비-system_admin에게 노출 금지
      const filteredUsers = allUsers.filter((u: any) => {
        if (u.email === adminEmail) return false;
        if (role !== "system_admin" && !u.partner_id) return false;
        return true;
      });
      setUsers(filteredUsers);
      // Refresh selected user data if panel is open
      if (selectedUser) {
        const updated = filteredUsers.find((u: any) => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [search, filter, role, partnerId, adminToken]);

  const openWalletModal = (e: React.MouseEvent, u: any) => {
    e.stopPropagation();
    const uw = allWallets.filter((w) => w.user_id === u.id);
    setWalletModal({ email: u.email, wallets: uw });
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard?.writeText(addr).catch(() => {});
    setCopied(addr);
    setTimeout(() => setCopied(null), 1500);
  };

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const deleteUser = async (e: React.MouseEvent, id: string, email: string) => {
    e.stopPropagation();
    if (!confirm(t("u_delete_dialog"))) return;
    await api(`/users/${id}`, { method: "DELETE" });
    await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "delete_user", target_type: "user", target_id: id, detail: { email } });
    if (selectedUser?.id === id) setSelectedUser(null);
    fetchUsers();
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/users", { method: "POST", body: JSON.stringify({ ...form, partner_id: form.partner_id || null }) });
      await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "create_user", target_type: "user", detail: { email: form.email } });
      setShowModal(false);
      setForm({ email: "", wallet_address: "", status: "active", kyc_tier: "T0", role: "user", partner_id: "" });
      fetchUsers();
    } finally { setSaving(false); }
  };

  const statusBadge = (s: string) => {
    if (s === "active") return <Badge variant="green">{t("u_status_active")}</Badge>;
    if (s === "suspended") return <Badge variant="red">{t("u_status_suspended")}</Badge>;
    if (s === "pending_kyc") return <Badge variant="yellow">{t("u_status_pending_kyc")}</Badge>;
    if (s === "pending_approval") return <Badge variant="yellow">{t("u_status_pending_approval")}</Badge>;
    return <Badge>{s}</Badge>;
  };
  const kycBadge = (tier: string) => {
    if (tier === "T2") return <Badge variant="purple">T2</Badge>;
    if (tier === "T1") return <Badge variant="blue">T1</Badge>;
    return <Badge variant="gray">T0</Badge>;
  };

  const systemAdminId = users.find((u) => u.role === "system_admin")?.id ?? null;

  return (
    <div className="space-y-4">
      {systemAdminId && (
        <div className="flex items-center gap-3 bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-4 py-3">
          <div className="w-5 h-5 rounded-sm bg-[#8247e5] flex items-center justify-center shrink-0"><Lock size={10} className="text-white" /></div>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[14px] text-[#8247e5] uppercase tracking-widest">{t("u_system_admin")}</span>
            <span className="font-mono text-[14px] text-muted-foreground ml-2">{users.find((u) => u.id === systemAdminId)?.email ?? "—"}</span>
          </div>
          <span className="font-mono text-[13px] text-muted-foreground">{t("u_supabase_auto")}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <input className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50"
          placeholder={t("u_search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
        {["all", "pending_approval", "active", "suspended", "pending_kyc"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${
              filter === f
                ? f === "pending_approval"
                  ? "bg-[#f59e0b]/15 border-[#f59e0b]/40 text-[#f59e0b]"
                  : "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            {t(`u_filter_${f}`)}
          </button>
        ))}
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
          <Plus size={12} /> {t("u_new_user")}
        </button>
      </div>

      <div className={`flex gap-4 items-start ${selectedUser ? "" : ""}`}>
        {/* Table */}
        <div className={selectedUser ? "flex-1 min-w-0 overflow-hidden" : "w-full"}>
          {loading ? <Spinner /> : (
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {(selectedUser
                      ? [t("u_col_email"), t("u_col_kyc"), t("u_col_status"), t("u_wallet_addresses"), t("u_col_joined"), ""]
                      : [t("u_col_email"), t("u_col_partner"), t("u_col_wallet"), t("u_col_wallet_status"), t("u_col_role"), t("u_col_kyc"), t("u_col_status"), t("u_col_joined"), t("u_col_txns"), ""]
                    ).map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("u_no_users")}</td></tr>
                  ) : users.map((u, i) => {
                    const isAdmin = u.id === systemAdminId;
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(isSelected ? null : u)}
                        className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${i === users.length - 1 ? "border-0" : ""} ${isAdmin ? "bg-[#8247e5]/[0.04]" : ""} ${isSelected ? "bg-[#8247e5]/10 border-l-2 border-l-[#8247e5]" : ""}`}>
                        <td className="px-4 py-3 font-['Barlow'] text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            {isAdmin && <div className="w-1.5 h-1.5 rounded-full bg-[#8247e5] shrink-0" />}
                            <span className="truncate max-w-[160px]">{u.email}</span>
                          </div>
                        </td>
                        {!selectedUser && (
                          <td className="px-4 py-3">
                            {u.partner_id && partnerMap[u.partner_id] ? (
                              <div>
                                <div className="font-mono text-[13px] text-foreground font-bold">{partnerMap[u.partner_id].name}</div>
                                <div className="font-mono text-[11px] text-muted-foreground">{partnerMap[u.partner_id].code} · {partnerMap[u.partner_id].role}</div>
                              </div>
                            ) : (
                              <span className="font-mono text-[13px] text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {!selectedUser && (
                          <td className="px-4 py-3">
                            {u.wallet_address ? (
                              <button onClick={(e) => openWalletModal(e, u)}
                                className="font-mono text-[13px] text-[#8247e5] hover:underline underline-offset-2 text-left">
                                {u.wallet_address.slice(0, 10)}...{u.wallet_address.slice(-6)}
                                {u._wallet_count > 1 && <span className="ml-1 text-muted-foreground text-[11px]">+{u._wallet_count - 1}</span>}
                              </button>
                            ) : <span className="font-mono text-[13px] text-muted-foreground">—</span>}
                          </td>
                        )}
                        {!selectedUser && (
                          <td className="px-4 py-3">
                            {u.wallet_status === "active" ? <Badge variant="green">{t("u_wallet_active")}</Badge> : <Badge variant="gray">{t("u_wallet_none")}</Badge>}
                          </td>
                        )}
                        {!selectedUser && (
                          <td className="px-4 py-3">{isAdmin ? <Badge variant="purple">{t("u_role_system_admin")}</Badge> : <Badge variant="gray">{u.role === "user" ? t("u_role_user") : (u.role ?? t("u_role_user"))}</Badge>}</td>
                        )}
                        <td className="px-4 py-3">{kycBadge(u.kyc_tier)}</td>
                        <td className="px-4 py-3">{statusBadge(u.status)}</td>
                        {selectedUser && (
                          <td className="px-4 py-3">
                            {u.wallet_address ? (
                              <button onClick={(e) => openWalletModal(e, u)} className="font-mono text-[12px] text-[#8247e5] hover:underline">
                                {u._wallet_count}
                              </button>
                            ) : <span className="font-mono text-[12px] text-muted-foreground">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(u.joined_at).toLocaleDateString()}</td>
                        {!selectedUser && <td className="px-4 py-3 font-mono text-sm text-foreground">{u.tx_count}</td>}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {u.status === "pending_approval" && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await api(`/users/${u.id}/approve`, { method: "POST" });
                                  await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "approve_user", target_type: "user", target_id: u.id, detail: { email: u.email } });
                                  fetchUsers();
                                }}
                                className="flex items-center gap-1 px-2 py-1 font-mono text-[11px] bg-[#00d395]/10 text-[#00d395] border border-[#00d395]/30 rounded-sm hover:bg-[#00d395]/20 transition-colors"
                                title="Approve">
                                <CheckCircle size={10} /> {t("u_approve")}
                              </button>
                            )}
                            <button onClick={() => setSelectedUser(isSelected ? null : u)} className={`p-1 transition-colors ${isSelected ? "text-[#8247e5]" : "text-muted-foreground hover:text-[#8247e5]"}`} title="Detail / Edit"><Edit3 size={12} /></button>
                            <button onClick={(e) => deleteUser(e, u.id, u.email)} disabled={isAdmin} className={`p-1 transition-colors ${isAdmin ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:text-[#ef4444]"}`}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                <span className="font-mono text-[13px] text-muted-foreground">{users.length} {t("u_users_count")}</span>
                {selectedUser && (
                  <span className="font-mono text-[12px] text-[#8247e5]">{t("u_row_hint")}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedUser && (
          <UserDetailPanel
            user={selectedUser}
            wallets={allWallets}
            partnerMap={partnerMap}
            partnerList={partnerList}
            adminEmail={adminEmail}
            onClose={() => setSelectedUser(null)}
            onRefresh={fetchUsers}
          />
        )}
      </div>

      {walletModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("u_wallet_modal_title")}</div>
                <div className="font-['Barlow'] text-sm font-semibold text-foreground mt-0.5">{walletModal.email}</div>
              </div>
              <button onClick={() => setWalletModal(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="p-4 space-y-2">
              {walletModal.wallets.length === 0 ? (
                <p className="font-mono text-[13px] text-muted-foreground text-center py-4">{t("u_no_wallet")}</p>
              ) : walletModal.wallets.map((w) => (
                <div key={w.chain_name} className="flex items-center gap-3 bg-secondary border border-border rounded-sm px-3 py-2.5"
                  style={{ borderColor: (CHAIN_COLORS[w.chain_name] ?? "#6b7280") + "30" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-background shrink-0"
                    style={{ backgroundColor: CHAIN_COLORS[w.chain_name] ?? "#6b7280" }}>
                    {w.chain_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-bold capitalize" style={{ color: CHAIN_COLORS[w.chain_name] ?? "#6b7280" }}>{w.chain_name}</span>
                      {w.chain_id && <span className="font-mono text-[11px] text-muted-foreground">chain:{w.chain_id}</span>}
                      {w.is_primary && <span className="font-mono text-[10px] text-[#00d395] border border-[#00d395]/30 px-1 rounded">primary</span>}
                    </div>
                    <div className="font-mono text-[12px] text-muted-foreground break-all mt-0.5">{w.address}</div>
                    <div className="font-mono text-[11px] text-muted-foreground/50 mt-0.5">{w.derivation_path}</div>
                  </div>
                  <button onClick={() => copyAddr(w.address)} className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
                    {copied === w.address ? <Check size={13} className="text-[#00d395]" /> : <Copy size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("u_new_user")}</span>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <form onSubmit={createUser} className="space-y-3">
              <input required placeholder={t("u_col_email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
              <input placeholder={t("u_wallet_address_optional")} value={form.wallet_address} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option value="pending_approval">{t("u_status_opt_pending_approval")}</option>
                  <option value="active">{t("u_status_opt_active")}</option>
                  <option value="suspended">{t("u_status_opt_suspended")}</option>
                  <option value="pending_kyc">{t("u_status_opt_pending_kyc")}</option>
                </select>
                <select value={form.kyc_tier} onChange={(e) => setForm({ ...form, kyc_tier: e.target.value })}
                  className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option>T0</option><option>T1</option><option>T2</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("u_partner_affiliation")} <span className="text-[#ef4444]">*</span></label>
                <select required value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50">
                  <option value="">{t("u_select_required")}</option>
                  {partnerList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code} · {p.role})</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={saving || !form.partner_id}
                className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
                {saving ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WalletsSection ───────────────────────────────────────────────────────────

export function WalletsSection({ adminToken }: { adminEmail: string | null; adminToken: string | null; role?: string; partnerId?: string | null }) {
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("wallet_status", statusFilter);
      const data = await apiAuth(`/admin/wallets?${params}`, adminToken);
      setUsers(data ?? []);
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [search, statusFilter, adminToken]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const { rate } = useUsdToKrw();
  const noneCount   = users.filter((u) => u.wallet_status === "none").length;
  const activeCount = users.filter((u) => u.wallet_status === "active").length;

  const walletStatusBadge = (s: string) => {
    if (s === "active") return <Badge variant="green">{t("w_status_active")}</Badge>;
    return <Badge variant="gray">{t("w_status_none")}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-2.5">
        <Lock size={11} className="text-[#f59e0b] shrink-0" />
        <span className="font-mono text-[14px] text-[#f59e0b]">{t("w_non_custodial")}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("w_total_users")} value={String(users.length)} sub={t("w_wallet_targets")} />
        <StatCard label={t("w_no_wallet_label")} value={String(noneCount)} sub={t("w_no_wallet_sub")} />
        <StatCard label={t("w_active_label")} value={String(activeCount)} sub={t("w_wallet_done")} accent="#00d395" />
      </div>

      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50"
          placeholder={t("w_email_search")} value={search} onChange={(e) => setSearch(e.target.value)}
        />
        {["all", "none", "active"].map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-2 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${statusFilter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["", "Email", t("w_col_wallet_status"), t("w_col_joined"), t("w_col_wallet_created"), "총 자산"].map((h, i) => (
                  <th key={i} className={`px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest ${i === 5 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("w_no_users")}</td></tr>
              ) : users.map((u, i) => {
                const wallets: any[] = u.wallets ?? [];
                const firstWallet = wallets[0];
                const isExpanded = expandedId === u.id;
                return [
                  <tr key={u.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === users.length - 1 && !isExpanded ? "border-0" : ""}`}>
                    <td className="px-4 py-3 w-6">
                      {wallets.length > 0 && (
                        <button onClick={() => setExpandedId(isExpanded ? null : u.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 font-['Barlow'] text-sm text-foreground">{u.email}</td>
                    <td className="px-4 py-3">{walletStatusBadge(u.wallet_status)}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">
                      {u.joined_at ? new Date(u.joined_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">
                      {firstWallet ? new Date(firstWallet.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.wallet_status === "active" ? (
                        <div>
                          <div className="font-['Barlow_Condensed'] text-base font-bold text-foreground">
                            ${TOTAL_USD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            ₩{(TOTAL_USD * rate).toLocaleString("ko-KR")}
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-[13px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${u.id}-detail`} className="border-b border-border/50 bg-secondary/20">
                      <td colSpan={6} className="px-8 py-3">
                        <div className="space-y-1.5">
                          {wallets.map((w: any) => (
                            <div key={w.chain_name} className="flex items-center gap-4 font-mono text-[13px]">
                              <span className="w-16 shrink-0">
                                <Badge variant={w.is_primary ? "purple" : "gray"}>{w.chain_name}</Badge>
                              </span>
                              <span className="text-foreground font-mono">{w.address}</span>
                              <span className="text-muted-foreground text-[12px]">{w.derivation_path}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <span className="font-mono text-[13px] text-muted-foreground">{users.length} {t("w_users_unit")}</span>
            <span className="font-mono text-[13px] text-muted-foreground">{t("u_wallet_active")}: {activeCount} · {t("u_wallet_none")}: {noneCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
