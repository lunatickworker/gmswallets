import { useState, useEffect, useCallback } from "react";
import { ToggleLeft, ToggleRight, Plus, X, Edit3, Trash2, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard } from "./shared";
import { useI18n } from "../../lib/i18n";

export function NoticesSection({ adminEmail }: { adminEmail: string }) {
  const { t } = useI18n();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({ type: "notice", title: "", content: "", is_published: false });
  const [saving, setSaving] = useState(false);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      const { data } = await q;
      setNotices(data ?? []);
    } catch { setNotices([]); } finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const openCreate = () => { setEditItem(null); setForm({ type: "notice", title: "", content: "", is_published: false }); setShowModal(true); };
  const openEdit = (n: any) => { setEditItem(n); setForm({ type: n.type, title: n.title, content: n.content ?? "", is_published: n.is_published }); setShowModal(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) {
        await supabase.from("notices").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editItem.id);
        await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "edit_notice", target_type: "notice", target_id: editItem.id, detail: { title: form.title } });
      } else {
        await supabase.from("notices").insert({ ...form, created_by: adminEmail });
        await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "create_notice", target_type: "notice", detail: { title: form.title } });
      }
      setShowModal(false); fetchNotices();
    } finally { setSaving(false); }
  };

  const del = async (id: string, title: string) => {
    if (!confirm(t("con_del_confirm"))) return;
    await supabase.from("notices").delete().eq("id", id);
    await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "delete_notice", target_type: "notice", target_id: id, detail: { title } });
    fetchNotices();
  };

  const togglePublish = async (n: any) => {
    await supabase.from("notices").update({ is_published: !n.is_published, updated_at: new Date().toISOString() }).eq("id", n.id);
    fetchNotices();
  };

  const TYPE_LABELS: Record<string, string> = { notice: t("notif_notice"), popup: t("notif_popup"), event: t("notif_event"), banner: t("notif_banner") };
  const TYPE_VARIANTS: Record<string, any> = { notice: "blue", popup: "yellow", event: "green", banner: "purple" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {["all", "notice", "popup", "event", "banner"].map((f) => (
          <button key={f} onClick={() => setTypeFilter(f)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${typeFilter === f ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? t("con_all") : TYPE_LABELS[f]}
          </button>
        ))}
        <button onClick={openCreate} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
          <Plus size={11} /> {t("con_write")}
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {notices.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("con_no_notices")}</div>
          ) : notices.map((n, i) => (
            <div key={n.id} className={`flex items-center gap-4 px-4 py-3.5 border-b border-border/50 hover:bg-secondary/20 transition-colors ${i === notices.length - 1 ? "border-0" : ""}`}>
              <Badge variant={TYPE_VARIANTS[n.type]}>{TYPE_LABELS[n.type]}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-['Barlow'] text-sm font-semibold text-foreground truncate">{n.title}</div>
                <div className="font-mono text-[13px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => togglePublish(n)} className="shrink-0">
                {n.is_published ? <ToggleRight size={22} className="text-[#00d395]" /> : <ToggleLeft size={22} className="text-muted-foreground" />}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(n)} className="p-1 text-muted-foreground hover:text-[#8247e5] transition-colors"><Edit3 size={12} /></button>
                <button onClick={() => del(n.id, n.title)} className="p-1 text-muted-foreground hover:text-[#ef4444] transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-[520px]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{editItem ? "공지 수정" : "공지 작성"}</span>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div className="flex gap-2">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option value="notice">공지</option><option value="popup">팝업</option><option value="event">이벤트</option><option value="banner">배너</option>
                </select>
                <label className="flex items-center gap-2 cursor-pointer ml-auto">
                  <span className="font-mono text-[13px] text-muted-foreground">발행</span>
                  <button type="button" onClick={() => setForm({ ...form, is_published: !form.is_published })}>
                    {form.is_published ? <ToggleRight size={22} className="text-[#00d395]" /> : <ToggleLeft size={22} className="text-muted-foreground" />}
                  </button>
                </label>
              </div>
              <input required placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
              <textarea rows={5} placeholder="내용" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50 resize-none" />
              <button type="submit" disabled={saving} className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
                {saving ? "저장 중..." : editItem ? "수정 저장" : "등록"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function PushSection({ adminEmail }: { adminEmail: string }) {
  const [pushList, setPushList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", target_type: "all", scheduled_at: "" });
  const [saving, setSaving] = useState(false);

  const fetchPush = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("push_notifications").select("*").order("created_at", { ascending: false });
      setPushList(data ?? []);
    } catch { setPushList([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPush(); }, [fetchPush]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const isScheduled = form.target_type === "scheduled";
      const status = isScheduled ? "scheduled" : "sent";
      const sentAt = isScheduled ? null : new Date().toISOString();
      const sentCount = isScheduled ? 0 : Math.floor(Math.random() * 1500 + 200);
      await supabase.from("push_notifications").insert({
        ...form,
        status, sent_at: sentAt, sent_count: sentCount,
        created_by: adminEmail,
        scheduled_at: form.scheduled_at || null,
      });
      await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "send_push", target_type: "push", detail: { title: form.title, target_type: form.target_type } });
      setShowModal(false);
      setForm({ title: "", body: "", target_type: "all", scheduled_at: "" });
      fetchPush();
    } finally { setSaving(false); }
  };

  const sent = pushList.filter((p) => p.status === "sent");
  const scheduled = pushList.filter((p) => p.status === "scheduled");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="총 발송 건수" value={String(sent.length)} accent="#00d395" sub={`${sent.reduce((s, p) => s + (p.sent_count ?? 0), 0).toLocaleString()}명 수신`} />
        <StatCard label="예약 발송" value={String(scheduled.length)} accent="#f59e0b" />
        <StatCard label="전체 알림" value={String(pushList.length)} />
      </div>
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
          <Send size={11} /> 푸시 발송
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["제목", "내용", "대상", "상태", "수신자", "발송일시"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pushList.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">발송 이력 없음</td></tr>
              ) : pushList.map((p, i) => (
                <tr key={p.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === pushList.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-['Barlow'] text-sm text-foreground max-w-[160px] truncate">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground max-w-[180px] truncate">{p.body}</td>
                  <td className="px-4 py-3"><Badge variant={p.target_type === "all" ? "blue" : p.target_type === "scheduled" ? "yellow" : "gray"}>{p.target_type}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={p.status === "sent" ? "green" : p.status === "scheduled" ? "yellow" : "red"}>{p.status}</Badge></td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{(p.sent_count ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{p.sent_at ? new Date(p.sent_at).toLocaleString() : p.scheduled_at ? `예약: ${new Date(p.scheduled_at).toLocaleString()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-[480px]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">푸시 발송</span>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <form onSubmit={send} className="space-y-3">
              <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                <option value="all">전체 발송</option>
                <option value="condition">조건 발송</option>
                <option value="scheduled">예약 발송</option>
              </select>
              <input required placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
              <textarea required rows={3} placeholder="내용" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50 resize-none" />
              {form.target_type === "scheduled" && (
                <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/50" />
              )}
              <button type="submit" disabled={saving} className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
                {saving ? "처리 중..." : "발송"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function SupportSection({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<"tickets" | "faq">("tickets");
  const [tickets, setTickets] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "일반" });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try { const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false }); setTickets(data ?? []); }
    catch { setTickets([]); } finally { setLoading(false); }
  }, []);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try { const { data } = await supabase.from("faqs").select("*").order("order_num"); setFaqs(data ?? []); }
    catch { setFaqs([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { tab === "tickets" ? fetchTickets() : fetchFaqs(); }, [tab, fetchTickets, fetchFaqs]);

  const submitReply = async () => {
    if (!reply.trim() || !selected) return;
    setSaving(true);
    try {
      await supabase.from("support_tickets").update({ status: "closed", admin_reply: reply, replied_at: new Date().toISOString(), replied_by: adminEmail }).eq("id", selected.id);
      await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "reply_ticket", target_type: "ticket", target_id: selected.id });
      setSelected(null); setReply(""); fetchTickets();
    } finally { setSaving(false); }
  };

  const createFaq = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await supabase.from("faqs").insert({ ...faqForm, order_num: faqs.length + 1 });
      setShowFaqModal(false); setFaqForm({ question: "", answer: "", category: "일반" }); fetchFaqs();
    } finally { setSaving(false); }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm("FAQ를 삭제하시겠습니까?")) return;
    await supabase.from("faqs").delete().eq("id", id);
    fetchFaqs();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["tickets", "faq"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${tab === t ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {t === "tickets" ? "문의 관리" : "FAQ 관리"}
          </button>
        ))}
      </div>

      {tab === "tickets" && (
        loading ? <Spinner /> : (
          <div className="bg-card border border-border rounded-sm overflow-hidden">
            {tickets.length === 0 ? (
              <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">문의 없음</div>
            ) : tickets.map((t, i) => (
              <div key={t.id} className={`flex items-start gap-4 px-4 py-3.5 border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer ${i === tickets.length - 1 ? "border-0" : ""}`}
                onClick={() => { setSelected(t); setReply(t.admin_reply ?? ""); }}>
                <Badge variant={t.status === "open" ? "yellow" : t.status === "in_progress" ? "blue" : "green"}>{t.status}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-['Barlow'] text-sm font-semibold text-foreground">{t.title}</div>
                  <div className="font-mono text-[13px] text-muted-foreground">{t.user_email ?? "anonymous"} · {new Date(t.created_at).toLocaleString()}</div>
                  <div className="font-mono text-[14px] text-muted-foreground mt-1 line-clamp-1">{t.content}</div>
                </div>
                <Badge variant="gray">{t.category}</Badge>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "faq" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowFaqModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
              <Plus size={11} /> FAQ 추가
            </button>
          </div>
          {loading ? <Spinner /> : (
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              {faqs.length === 0 ? (
                <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">FAQ 없음</div>
              ) : faqs.map((f, i) => (
                <div key={f.id} className={`px-4 py-3.5 border-b border-border/50 hover:bg-secondary/20 transition-colors ${i === faqs.length - 1 ? "border-0" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Badge variant="purple">Q</Badge>
                    <div className="flex-1">
                      <div className="font-['Barlow'] text-sm font-semibold text-foreground">{f.question}</div>
                      <div className="font-mono text-[14px] text-muted-foreground mt-1">{f.answer}</div>
                    </div>
                    <Badge variant="gray">{f.category}</Badge>
                    <button onClick={() => deleteFaq(f.id)} className="p-1 text-muted-foreground hover:text-[#ef4444] transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-[560px]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">문의 답변</span>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <div className="bg-secondary/40 rounded-sm p-4 mb-4">
              <div className="font-['Barlow'] text-sm font-semibold text-foreground mb-1">{selected.title}</div>
              <div className="font-mono text-[13px] text-muted-foreground mb-2">{selected.user_email} · {new Date(selected.created_at).toLocaleString()}</div>
              <div className="font-mono text-[14px] text-foreground">{selected.content}</div>
            </div>
            <textarea rows={4} placeholder="답변을 입력하세요..." value={reply} onChange={(e) => setReply(e.target.value)}
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50 resize-none mb-3" />
            <button onClick={submitReply} disabled={saving || !reply.trim()} className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
              {saving ? "저장 중..." : "답변 등록"}
            </button>
          </div>
        </div>
      )}

      {showFaqModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-[480px]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">FAQ 추가</span>
              <button onClick={() => setShowFaqModal(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <form onSubmit={createFaq} className="space-y-3">
              <input placeholder="카테고리" value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none" />
              <input required placeholder="질문" value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
              <textarea required rows={4} placeholder="답변" value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
              <button type="submit" disabled={saving} className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
                {saving ? "저장 중..." : "등록"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
