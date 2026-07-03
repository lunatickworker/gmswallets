import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { Spinner } from "./components";

export function NotificationsTab() {
  const { t } = useI18n();
  const [items, setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [read, setRead]     = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [{ data: pushData }, { data: noticeData }] = await Promise.all([
          supabase.from("push_notifications").select("*").eq("status", "sent").order("sent_at", { ascending: false }).limit(10),
          supabase.from("notices").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(5),
        ]);
        const pushItems   = (pushData ?? []).map((p: any) => ({ id: p.id, title: p.title, body: p.body, type: "push", created_at: p.sent_at ?? p.created_at }));
        const noticeItems = (noticeData ?? []).map((n: any) => ({ id: n.id, title: n.title, body: n.content, type: n.type, created_at: n.created_at }));
        setItems([...pushItems, ...noticeItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const markRead = (id: string) => setRead((prev) => new Set([...prev, id]));

  const TYPE_COLORS: Record<string, string> = {
    push: "#8247e5", notice: "#3b82f6", event: "#00d395", popup: "#f59e0b", banner: "#f59e0b",
  };
  const TYPE_LABELS: Record<string, string> = {
    push: t("notif_push"), notice: t("notif_notice"), event: t("notif_event"), popup: t("notif_popup"), banner: t("notif_banner"),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{items.filter((i) => !read.has(i.id)).length}{t("unread_count")}</span>
        <button onClick={() => setRead(new Set(items.map((i) => i.id)))} className="font-mono text-[13px] text-[#8247e5] hover:underline">{t("mark_all_read")}</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner size={18} /></div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-sm px-4 py-10 text-center">
          <Bell size={24} className="text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-[14px] text-muted-foreground">{t("no_notifications")}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {items.map((item, i) => {
            const isRead = read.has(item.id);
            return (
              <button key={item.id} onClick={() => markRead(item.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-secondary/20 transition-colors ${i < items.length - 1 ? "border-b border-border/50" : ""} ${isRead ? "opacity-60" : ""}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: (TYPE_COLORS[item.type] ?? "#8247e5") + "20", color: TYPE_COLORS[item.type] ?? "#8247e5" }}>
                  <Bell size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-['Barlow'] text-sm font-semibold text-foreground">{item.title}</span>
                    {!isRead && <div className="w-1.5 h-1.5 rounded-full bg-[#8247e5] shrink-0" />}
                  </div>
                  {item.body && <div className="font-mono text-[13px] text-muted-foreground line-clamp-2">{item.body}</div>}
                  <div className="font-mono text-[13px] text-muted-foreground/60 mt-1">{new Date(item.created_at).toLocaleString("ko-KR")}</div>
                </div>
                <span className="font-mono text-[12px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border shrink-0"
                  style={{ backgroundColor: (TYPE_COLORS[item.type] ?? "#8247e5") + "15", color: TYPE_COLORS[item.type] ?? "#8247e5", borderColor: (TYPE_COLORS[item.type] ?? "#8247e5") + "40" }}>
                  {TYPE_LABELS[item.type] ?? item.type}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
