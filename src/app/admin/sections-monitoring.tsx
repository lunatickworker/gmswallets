import { useState, useEffect, useCallback } from "react";
import { Search, Check, Plus, X } from "lucide-react";
import { Badge, StatusDot, Spinner, StatCard, api } from "./shared";
import { useI18n } from "../../lib/i18n";

export function BlockchainSection() {
  const { t } = useI18n();
  const [txHash, setTxHash] = useState("");
  const [txResult, setTxResult] = useState<null | "found" | "not_found">(null);
  const [gasData] = useState([
    { name: "Slow", gwei: 30, usd: 0.001 },
    { name: "Standard", gwei: 50, usd: 0.002 },
    { name: "Fast", gwei: 80, usd: 0.003 },
  ]);

  const NETWORKS = [
    { name: "Polygon Mainnet", chainId: 137, block: 68432191, tps: 62, status: "online" as const, rpcLatency: 187 },
    { name: "Ethereum Mainnet", chainId: 1, block: 20389412, tps: 14, status: "degraded" as const, rpcLatency: 412 },
  ];

  const RPC_NODES = [
    { provider: "Alchemy", url: "polygon-mainnet.g.alchemy.com", status: "degraded" as const, latency: 187 },
    { provider: "Infura", url: "polygon-mainnet.infura.io", status: "online" as const, latency: 94 },
    { provider: "Ankr", url: "rpc.ankr.com/polygon", status: "online" as const, latency: 121 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {NETWORKS.map((net) => (
          <div key={net.name} className={`bg-card border rounded-sm p-4 ${net.status === "degraded" ? "border-[#f59e0b]/30" : "border-border"}`}>
            <div className="flex items-center gap-2 mb-3">
              <StatusDot status={net.status} />
              <span className="font-['Barlow'] text-sm font-semibold text-foreground">{net.name}</span>
              <Badge variant="gray">#{net.chainId}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><div className="font-mono text-[13px] text-muted-foreground">Latest Block</div><div className="font-['Barlow_Condensed'] text-lg font-bold text-foreground">{net.block.toLocaleString()}</div></div>
              <div><div className="font-mono text-[13px] text-muted-foreground">TPS</div><div className="font-['Barlow_Condensed'] text-lg font-bold text-[#00d395]">{net.tps}</div></div>
              <div><div className="font-mono text-[13px] text-muted-foreground">RPC Latency</div><div className={`font-['Barlow_Condensed'] text-lg font-bold ${net.rpcLatency > 300 ? "text-[#f59e0b]" : "text-foreground"}`}>{net.rpcLatency}ms</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">RPC Node Status</span></div>
          {RPC_NODES.map((rpc) => (
            <div key={rpc.provider} className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/20">
              <StatusDot status={rpc.status} />
              <div className="flex-1">
                <div className="font-['Barlow'] text-sm font-semibold text-foreground">{rpc.provider}</div>
                <div className="font-mono text-[13px] text-muted-foreground">{rpc.url}</div>
              </div>
              <span className={`font-mono text-sm ${rpc.status === "degraded" ? "text-[#f59e0b]" : "text-[#00d395]"}`}>{rpc.latency}ms</span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">Gas Fee (Polygon)</span></div>
          {gasData.map((g) => (
            <div key={g.name} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0">
              <span className="font-mono text-[13px] text-muted-foreground w-20">{g.name}</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-[#8247e5] rounded-full" style={{ width: `${(g.gwei / 80) * 100}%` }} />
              </div>
              <span className="font-mono text-sm text-foreground w-20 text-right">{g.gwei} Gwei</span>
              <span className="font-mono text-[13px] text-muted-foreground w-16 text-right">${g.usd}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm p-4">
        <div className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest mb-3">{t("mon_tx_query")}</div>
        <div className="flex gap-2">
          <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." className="flex-1 bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/50" />
          <button onClick={() => setTxResult(txHash.startsWith("0x") ? "found" : "not_found")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
            <Search size={11} /> {t("mon_search")}
          </button>
        </div>
        {txResult === "found" && (
          <div className="mt-3 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm p-3 font-mono text-[14px]">
            <div className="flex items-center gap-2 mb-2"><Check size={11} className="text-[#00d395]" /><span className="text-[#00d395]">{t("mon_tx_found")}</span></div>
            <div className="space-y-1 text-muted-foreground">
              <div>Hash: {txHash}</div>
              <div>Block: {Math.floor(Math.random() * 1000000 + 68000000)}</div>
              <div>Status: <span className="text-[#00d395]">Success</span></div>
            </div>
          </div>
        )}
        {txResult === "not_found" && (
          <div className="mt-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm p-3 font-mono text-[14px] text-[#ef4444]">{t("mon_tx_invalid")}</div>
        )}
      </div>
    </div>
  );
}

export function WebhooksSection() {
  const { t } = useI18n();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ source: "Transak", event: "ORDER_COMPLETED", payload: '{"orderId":"TRX-XXXXX","status":"COMPLETED","cryptoAmount":0}', status: "processed", retries: 0 });
  const [saving, setSaving] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try { const data = await api("/webhooks"); setWebhooks(data ?? []); }
    catch { setWebhooks([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const addWebhook = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      let parsedPayload = form.payload;
      try { parsedPayload = JSON.parse(form.payload); } catch { }
      await api("/webhooks", { method: "POST", body: JSON.stringify({ ...form, payload: parsedPayload }) });
      setShowModal(false); fetchWebhooks();
    } finally { setSaving(false); }
  };

  const processed = webhooks.filter((w) => w.status === "processed").length;
  const retrying = webhooks.filter((w) => w.status === "retrying").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Events" value={String(webhooks.length)} />
        <StatCard label="Processed" value={String(processed)} accent="#00d395" />
        <StatCard label="Retrying" value={String(retrying)} accent="#f59e0b" />
      </div>
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
          <Plus size={12} /> Simulate Event
        </button>
      </div>
      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {webhooks.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">{t("mon_no_webhooks")}</div>
          ) : webhooks.map((wh, i) => (
            <div key={wh.id} className={`border-b border-border/50 ${i === webhooks.length - 1 ? "border-0" : ""}`}>
              <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left" onClick={() => setExpanded(expanded === wh.id ? null : wh.id)}>
                <Badge variant={wh.status === "processed" ? "green" : "yellow"}>{wh.status}</Badge>
                <Badge variant="purple">{wh.source}</Badge>
                <span className="font-mono text-sm text-foreground">{wh.event}</span>
                {wh.retries > 0 && <span className="font-mono text-[13px] text-[#f59e0b]">↻ {wh.retries}</span>}
                <span className="flex-1" />
                <span className="font-mono text-[13px] text-muted-foreground">{new Date(wh.created_at).toLocaleString()}</span>
                <span className="font-mono text-[13px] text-muted-foreground ml-2">{expanded === wh.id ? "▲" : "▼"}</span>
              </button>
              {expanded === wh.id && (
                <div className="px-4 pb-3 border-t border-border/30">
                  <div className="bg-background rounded-sm p-3 font-mono text-[14px] text-[#00d395] mt-2 overflow-x-auto">
                    <pre>{typeof wh.payload === "string" ? wh.payload : JSON.stringify(wh.payload, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-sm p-6 w-[480px]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">Simulate Webhook Event</span>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <form onSubmit={addWebhook} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Source" className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none" />
                <input value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} placeholder="Event" className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none" />
              </div>
              <textarea rows={4} value={form.payload} onChange={(e) => setForm({ ...form, payload: e.target.value })} className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-[#00d395] focus:outline-none resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none">
                  <option value="processed">Processed</option><option value="retrying">Retrying</option><option value="failed">Failed</option>
                </select>
                <input type="number" value={form.retries} onChange={(e) => setForm({ ...form, retries: parseInt(e.target.value) || 0 })} placeholder="Retries" className="bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors">
                {saving ? "Inserting..." : "Insert Event"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
