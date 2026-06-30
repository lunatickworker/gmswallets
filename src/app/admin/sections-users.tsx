import { useState, useEffect, useCallback } from "react";
import { Lock, Plus, X, Edit3, Trash2, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard, api } from "./shared";

export function UsersSection({ adminEmail }: { adminEmail: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: "", wallet_address: "", status: "active", kyc_tier: "T0", role: "user" });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("status", filter);
      const data = await api(`/users?${params}`);
      setUsers(data ?? []);
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [search, filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const deleteUser = async (id: string, email: string) => {
    if (!confirm("이 사용자를 삭제하시겠습니까?")) return;
    await api(`/users/${id}`, { method: "DELETE" });
    await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "delete_user", target_type: "user", target_id: id, detail: { email } });
    fetchUsers();
  };

  const toggleStatus = async (u: any) => {
    const next = u.status === "active" ? "suspended" : "active";
    await api(`/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: next === "suspended" ? "suspend_user" : "activate_user", target_type: "user", target_id: u.id, detail: { email: u.email } });
    fetchUsers();
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/users", { method: "POST", body: JSON.stringify(form) });
      await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "create_user", target_type: "user", detail: { email: form.email } });
      setShowModal(false);
      setForm({ email: "", wallet_address: "", status: "active", kyc_tier: "T0", role: "user" });
      fetchUsers();
    } finally { setSaving(false); }
  };

  const statusBadge = (s: string) => {
    if (s === "active") return <Badge variant="green">active</Badge>;
    if (s === "suspended") return <Badge variant="red">suspended</Badge>;
    if (s === "pending_kyc") return <Badge variant="yellow">pending kyc</Badge>;
    return <Badge>{s}</Badge>;
  };
  const kycBadge = (t: string) => {
    if (t === "T2") return <Badge variant="purple">T2</Badge>;
    if (t === "T1") return <Badge variant="blue">T1</Badge>;
    return <Badge variant="gray">T0</Badge>;
  };

  const systemAdminId = users.length > 0
    ? (users.find((u) => u.role === "system_admin")?.id
      ?? [...users].sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())[0]?.id)
    : null;

  return (
    <div className="space-y-4">
      {systemAdminId && (
        <div className="flex items-center gap-3 bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-4 py-3">
          <div className="w-5 h-5 rounded-sm bg-[#8247e5] flex items-center justify-center shrink-0"><Lock size={10} className="text-white" /></div>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[14px] text-[#8247e5] uppercase tracking-widest">System Admin</span>
            <span className="font-mono text-[14px] text-muted-foreground ml-2">{users.find((u) => u.id === systemAdminId)?.email ?? "—"}</span>
          </div>
          <span className="font-mono text-[13px] text-muted-foreground">Supabase Auth 최초 가입 유저 · 자동 지정</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <input className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50"
          placeholder="Search by email or wallet address..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {["all", "active", "suspended", "pending_kyc"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${filter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
          <Plus size={12} /> New User
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Email", "Wallet Address", "Role", "KYC", "Status", "Joined", "Txns", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">사용자 없음</td></tr>
              ) : users.map((u, i) => {
                const isAdmin = u.id === systemAdminId;
                return (
                  <tr key={u.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === users.length - 1 ? "border-0" : ""} ${isAdmin ? "bg-[#8247e5]/[0.04]" : ""}`}>
                    <td className="px-4 py-3 font-['Barlow'] text-sm text-foreground">
                      <div className="flex items-center gap-2">{isAdmin && <div className="w-1.5 h-1.5 rounded-full bg-[#8247e5] shrink-0" />}{u.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{u.wallet_address ? `${u.wallet_address.slice(0, 10)}...${u.wallet_address.slice(-6)}` : "—"}</td>
                    <td className="px-4 py-3">{isAdmin ? <Badge variant="purple">system admin</Badge> : <Badge variant="gray">{u.role ?? "user"}</Badge>}</td>
                    <td className="px-4 py-3">{kycBadge(u.kyc_tier)}</td>
                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(u.joined_at).toLocaleDateString("ko-KR")}</td>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{u.tx_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleStatus(u)} className="p-1 text-muted-foreground hover:text-[#f59e0b] transition-colors" title={u.status === "active" ? "Suspend" : "Activate"}><Edit3 size={12} /></button>
                        <button onClick={() => deleteUser(u.id, u.email)} disabled={isAdmin} className={`p-1 transition-colors ${isAdmin ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:text-[#ef4444]"}`}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-border"><span className="font-mono text-[13px] text-muted-foreground">{users.length} users</span></div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">New User</span>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <form onSubmit={createUser} className="space-y-3">
              <input required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
              <input placeholder="Wallet Address (optional)" value={form.wallet_address} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending_kyc">Pending KYC</option>
                </select>
                <select value={form.kyc_tier} onChange={(e) => setForm({ ...form, kyc_tier: e.target.value })}
                  className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option>T0</option><option>T1</option><option>T2</option>
                </select>
              </div>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="system_admin">System Admin</option>
              </select>
              <button type="submit" disabled={saving}
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

export function WalletsSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const data = await api(`/users?${params}`);
      setUsers((data ?? []).filter((u: any) => u.wallet_address));
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-4 py-2.5">
        <Lock size={11} className="text-[#f59e0b] shrink-0" />
        <span className="font-mono text-[14px] text-[#f59e0b]">비수탁 구조 — 개인키는 절대 조회·저장되지 않습니다</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="총 지갑 수" value={String(users.length)} sub="지갑 주소 보유 사용자" />
        <StatCard label="네트워크" value="Polygon" sub="polygon mainnet" accent="#8247e5" />
        <StatCard label="평균 TX" value={users.length ? String(Math.round(users.reduce((s, u) => s + u.tx_count, 0) / users.length)) : "—"} sub="지갑당 평균 거래" />
      </div>

      <input className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50"
        placeholder="이메일 또는 지갑 주소 검색..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Email", "Wallet Address", "Network", "TX 수", "생성일", "KYC"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">지갑이 연결된 사용자 없음</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === users.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-['Barlow'] text-sm text-foreground">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-[#8247e5]">
                    <div className="flex items-center gap-2">
                      <span>{u.wallet_address.slice(0, 14)}...{u.wallet_address.slice(-6)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="purple">polygon</Badge></td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{u.tx_count}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(u.joined_at).toLocaleDateString("ko-KR")}</td>
                  <td className="px-4 py-3">
                    {u.kyc_tier === "T2" ? <Badge variant="purple">T2</Badge> : u.kyc_tier === "T1" ? <Badge variant="blue">T1</Badge> : <Badge variant="gray">T0</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-border"><span className="font-mono text-[13px] text-muted-foreground">{users.length} wallets</span></div>
        </div>
      )}
    </div>
  );
}
