import { useState, useEffect, useCallback, useRef } from "react";
import {
  ToggleLeft, ToggleRight, RefreshCw, Key, Eye, Monitor, Cpu,
  Globe, Database, AlertCircle, Check, ShoppingCart, Clock,
  Plus, X, ImageOff, Pencil, Trash2, Search,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Badge, Spinner, StatCard, METHOD_COLORS, api } from "./shared";
import { useI18n } from "../../lib/i18n";

// ─── CoinGecko API ───────────────────────────────────────────────────────────

const CG = "https://api.coingecko.com/api/v3";

async function cgSearch(query: string): Promise<CgCoin[]> {
  const res = await fetch(`${CG}/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("CoinGecko search failed");
  const json = await res.json();
  return (json.coins ?? []).slice(0, 8);
}

async function cgPrices(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const res = await fetch(`${CG}/simple/price?ids=${ids.join(",")}&vs_currencies=usd`);
  if (!res.ok) return {};
  const json = await res.json();
  return Object.fromEntries(Object.entries(json).map(([id, v]: any) => [id, v.usd]));
}

interface CgCoin {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
  large: string;
}

// ─── Coin Form ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  symbol: "", name: "", network: "polygon", contract_address: "",
  decimals: "18", icon_url: "", coingecko_id: "",
  is_purchase_enabled: true, is_swap_enabled: true,
};

type CoinForm = typeof EMPTY_FORM;

function formFromCoin(coin: any): CoinForm {
  return {
    symbol: coin.symbol,
    name: coin.name,
    network: coin.network,
    contract_address: coin.contract_address ?? "",
    decimals: String(coin.decimals),
    icon_url: coin.icon_url ?? "",
    coingecko_id: coin.coingecko_id ?? "",
    is_purchase_enabled: coin.is_purchase_enabled,
    is_swap_enabled: coin.is_swap_enabled,
  };
}

// ─── CoinGecko Search Dropdown ───────────────────────────────────────────────

function CgSearchBox({ onSelect }: { onSelect: (c: CgCoin) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CgCoin[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await cgSearch(v);
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  };

  const pick = (c: CgCoin) => {
    onSelect(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-[#8247e5]/5 border border-[#8247e5]/30 rounded-sm px-3 py-2">
        {loading ? <div className="w-3 h-3 border border-[#8247e5]/30 border-t-[#8247e5] rounded-full animate-spin shrink-0" /> : <Search size={13} className="text-[#8247e5] shrink-0" />}
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search CoinGecko (name or symbol)..."
          className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-sm shadow-xl shadow-black/30 overflow-hidden">
          {results.map((c) => (
            <button key={c.id} onClick={() => pick(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left">
              <img src={c.thumb} alt="" className="w-6 h-6 rounded-full shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="font-mono text-sm font-bold text-[#8247e5]">{c.symbol.toUpperCase()}</span>
              <span className="font-['Barlow'] text-sm text-foreground">{c.name}</span>
              <span className="ml-auto font-mono text-[12px] text-muted-foreground">{c.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Coin Add/Edit Modal ──────────────────────────────────────────────────────

function CoinModal({
  coin, adminEmail, onClose, onSaved,
}: {
  coin?: any; adminEmail: string; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useI18n();
  const isEdit = !!coin;
  const [form, setForm] = useState<CoinForm>(isEdit ? formFromCoin(coin) : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [iconError, setIconError] = useState(false);

  const set = (k: keyof CoinForm, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const applyGeckoCoin = (c: CgCoin) => {
    setForm((f) => ({
      ...f,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      icon_url: c.large || c.thumb,
      coingecko_id: c.id,
    }));
    setIconError(false);
  };

  const handleNetworkChange = (net: string) => {
    set("network", net);
    if (net === "tron") set("decimals", "6");
    else if (net === "polygon" || net === "ethereum" || net === "bnb") set("decimals", "18");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.symbol.trim() || !form.name.trim()) { setError(t("ops_symbol_required")); return; }
    setSaving(true);
    try {
      const payload = {
        symbol: form.symbol.trim().toUpperCase(),
        name: form.name.trim(),
        network: form.network,
        contract_address: form.contract_address.trim() || null,
        decimals: parseInt(form.decimals, 10) || 18,
        icon_url: form.icon_url.trim() || null,
        coingecko_id: form.coingecko_id.trim() || null,
        is_purchase_enabled: form.is_purchase_enabled,
        is_swap_enabled: form.is_swap_enabled,
      };
      if (isEdit) {
        const { error: e } = await supabase.from("coins").update(payload).eq("id", coin.id);
        if (e) throw e;
        await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "update_coin", target_type: "coin", target_id: coin.id, detail: { symbol: payload.symbol } });
      } else {
        const { error: e } = await supabase.from("coins").insert(payload);
        if (e) throw e;
        await supabase.from("admin_logs").insert({ admin_email: adminEmail, action: "create_coin", target_type: "coin", detail: { symbol: payload.symbol } });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? t("ops_save_fail"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-sm w-full max-w-lg shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-['Barlow_Condensed'] text-lg font-bold uppercase tracking-tight text-foreground">
            {isEdit ? t("ops_coin_edit") : t("ops_coin_add")}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* CoinGecko search */}
          <div className="space-y-1">
            <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("ops_cg_autofill")}</label>
            <CgSearchBox onSelect={applyGeckoCoin} />
          </div>

          <div className="border-t border-border/50 pt-1" />

          {/* Icon preview + URL */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 overflow-hidden">
              {form.icon_url && !iconError
                ? <img src={form.icon_url} alt="" className="w-8 h-8 object-contain"
                    onError={() => setIconError(true)} onLoad={() => setIconError(false)} />
                : <ImageOff size={16} className="text-muted-foreground" />}
            </div>
            <div className="flex-1 space-y-1">
              <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("ops_icon_url")}</label>
              <input
                type="url" value={form.icon_url}
                onChange={(e) => { set("icon_url", e.target.value); setIconError(false); }}
                placeholder="https://..."
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors"
              />
            </div>
          </div>

          {/* Symbol + Name */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "symbol" as const, label: "Symbol *", placeholder: "USDC", upper: true },
              { key: "name" as const, label: "Name *", placeholder: "USD Coin", upper: false },
            ]).map(({ key, label, placeholder, upper }) => (
              <div key={key} className="space-y-1">
                <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{label}</label>
                <input
                  value={form[key]} onChange={(e) => set(key, e.target.value)} required
                  placeholder={placeholder}
                  className={`w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors ${upper ? "uppercase" : ""}`}
                />
              </div>
            ))}
          </div>

          {/* Network + Decimals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">Network</label>
              <select
                value={form.network}
                onChange={(e) => handleNetworkChange(e.target.value)}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors"
              >
                <option value="polygon">Polygon (EVM)</option>
                <option value="ethereum">Ethereum (EVM)</option>
                <option value="tron">Tron (TRC20)</option>
                <option value="bnb">BNB Chain (EVM)</option>
                <option value="bitcoin">Bitcoin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">Decimals</label>
              <input
                type="number" min={0} max={18} value={form.decimals}
                onChange={(e) => set("decimals", e.target.value)}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors"
              />
            </div>
          </div>

          {/* Contract Address */}
          <div className="space-y-1">
            <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">
              컨트랙트 주소 <span className="normal-case">(네이티브 토큰은 비워도 됨)</span>
            </label>
            <input
              value={form.contract_address} onChange={(e) => set("contract_address", e.target.value)}
              placeholder={form.network === "tron" ? "T... (TRC20 컨트랙트)" : "0x..."}
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors"
            />
            {form.network === "tron" && (
              <p className="font-mono text-[11px] text-[#e84142]">
                TRC20 주소는 T로 시작하는 Base58 포맷 · decimals 기본값 6
              </p>
            )}
          </div>

          {/* CoinGecko ID */}
          <div className="space-y-1">
            <label className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">
              CoinGecko ID <span className="normal-case">(가격 조회용 · 검색 시 자동 입력)</span>
            </label>
            <input
              value={form.coingecko_id} onChange={(e) => set("coingecko_id", e.target.value)}
              placeholder="예: matic-network, usd-coin, tether"
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "is_purchase_enabled" as const, label: "Purchase" },
              { key: "is_swap_enabled" as const, label: "Swap" },
            ]).map(({ key, label }) => (
              <button key={key} type="button" onClick={() => set(key, !form[key])}
                className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-sm transition-colors ${form[key] ? "bg-[#00d395]/10 border-[#00d395]/30 text-[#00d395]" : "bg-secondary border-border text-muted-foreground"}`}>
                {form[key] ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                <span className="font-mono text-[13px]">{label}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
              <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
              <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border text-muted-foreground font-mono text-[13px] uppercase tracking-widest rounded-sm hover:text-foreground transition-colors">
              {t("cancel")}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-[13px] uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-1.5">
              {saving && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />}
              {isEdit ? t("p_save") : t("ops_coin_add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Network badge helper ─────────────────────────────────────────────────────

const NETWORK_BADGE: Record<string, { variant: "red" | "blue" | "purple" | "gray"; label: string }> = {
  tron:     { variant: "red",    label: "TRC20" },
  ethereum: { variant: "blue",   label: "ETH" },
  bnb:      { variant: "gray",   label: "BNB" },
  bitcoin:  { variant: "gray",   label: "BTC" },
  polygon:  { variant: "purple", label: "Polygon" },
};

function networkBadge(network: string) {
  return NETWORK_BADGE[network] ?? { variant: "gray" as const, label: network };
}

// ─── CoinsSection ─────────────────────────────────────────────────────────────

export function CoinsSection({ adminEmail }: { adminEmail: string }) {
  const { t } = useI18n();
  const [coins, setCoins] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [modal, setModal] = useState<"add" | { coin: any } | null>(null);

  const fetchCoins = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("coins").select("*").order("symbol");
      setCoins(data ?? []);
    } catch {
      setCoins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrices = useCallback(async (coinList: any[]) => {
    const ids = coinList.map((c) => c.coingecko_id).filter(Boolean);
    if (!ids.length) return;
    setPriceLoading(true);
    try {
      const data = await cgPrices(ids);
      setPrices(data);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoins(); }, [fetchCoins]);

  useEffect(() => {
    if (coins.length) fetchPrices(coins);
  }, [coins, fetchPrices]);

  const toggle = async (coin: any, field: "is_purchase_enabled" | "is_swap_enabled") => {
    setSaving(coin.id + field);
    try {
      await supabase.from("coins").update({ [field]: !coin[field] }).eq("id", coin.id);
      await supabase.from("admin_logs").insert({
        admin_email: adminEmail, action: `toggle_coin_${field}`,
        target_type: "coin", target_id: coin.id,
        detail: { symbol: coin.symbol, value: !coin[field] },
      });
      fetchCoins();
    } finally {
      setSaving(null);
    }
  };

  const deleteCoin = async (coin: any) => {
    if (!confirm(`Delete "${coin.symbol}"?`)) return;
    await supabase.from("coins").delete().eq("id", coin.id);
    await supabase.from("admin_logs").insert({
      admin_email: adminEmail, action: "delete_coin",
      target_type: "coin", target_id: coin.id, detail: { symbol: coin.symbol },
    });
    fetchCoins();
  };

  const price = (coin: any) => {
    if (!coin.coingecko_id) return null;
    return prices[coin.coingecko_id];
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Supported Coins" value={String(coins.length)} />
        <StatCard label="Purchase Enabled" value={String(coins.filter((c) => c.is_purchase_enabled).length)} accent="#00d395" />
        <StatCard label="Swap Enabled" value={String(coins.filter((c) => c.is_swap_enabled).length)} accent="#8247e5" />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => fetchPrices(coins)} disabled={priceLoading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border text-muted-foreground hover:text-foreground font-mono text-[13px] rounded-sm transition-colors disabled:opacity-50">
          {priceLoading
            ? <div className="w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            : <RefreshCw size={11} />}
          Refresh Prices
        </button>
        <button onClick={() => setModal("add")}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#8247e5] hover:bg-[#8247e5]/80 text-white font-mono text-[13px] uppercase tracking-widest rounded-sm transition-colors">
          <Plus size={13} /> {t("ops_coin_add")}
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Icon", "Symbol", "Name", "Network", "Price (USD)", "Decimals", "Buy", "Swap", "Added", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coins.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">No coins (DB initialization required)</td></tr>
                ) : coins.map((c, i) => {
                  const nb = networkBadge(c.network);
                  const usdPrice = price(c);
                  return (
                    <tr key={c.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === coins.length - 1 ? "border-0" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden">
                          {c.icon_url
                            ? <img src={c.icon_url} alt={c.symbol} className="w-6 h-6 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            : <span className="font-mono text-[10px] text-muted-foreground">{c.symbol.slice(0, 2)}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-[#8247e5]">{c.symbol}</td>
                      <td className="px-4 py-3 font-['Barlow'] text-sm text-foreground">{c.name}</td>
                      <td className="px-4 py-3"><Badge variant={nb.variant}>{nb.label}</Badge></td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">
                        {priceLoading
                          ? <span className="text-muted-foreground">…</span>
                          : usdPrice != null
                            ? `$${usdPrice < 0.01 ? usdPrice.toFixed(6) : usdPrice < 1 ? usdPrice.toFixed(4) : usdPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{c.decimals}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggle(c, "is_purchase_enabled")}
                          disabled={saving === c.id + "is_purchase_enabled"}
                          className="shrink-0 transition-opacity disabled:opacity-50">
                          {c.is_purchase_enabled
                            ? <ToggleRight size={22} className="text-[#00d395]" />
                            : <ToggleLeft size={22} className="text-muted-foreground" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggle(c, "is_swap_enabled")}
                          disabled={saving === c.id + "is_swap_enabled"}
                          className="shrink-0 transition-opacity disabled:opacity-50">
                          {c.is_swap_enabled
                            ? <ToggleRight size={22} className="text-[#00d395]" />
                            : <ToggleLeft size={22} className="text-muted-foreground" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal({ coin: c })}
                            className="p-1.5 text-muted-foreground hover:text-[#8247e5] transition-colors rounded-sm hover:bg-[#8247e5]/10">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteCoin(c)}
                            className="p-1.5 text-muted-foreground hover:text-[#ef4444] transition-colors rounded-sm hover:bg-[#ef4444]/10">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <CoinModal
          coin={modal === "add" ? undefined : modal.coin}
          adminEmail={adminEmail}
          onClose={() => setModal(null)}
          onSaved={fetchCoins}
        />
      )}
    </div>
  );
}

// ─── OpLogsSection ────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  admin_login:   "text-[#00d395]",
  delete_user:   "text-[#ef4444]",
  suspend_user:  "text-[#f59e0b]",
  activate_user: "text-[#3b82f6]",
  create_user:   "text-[#8247e5]",
  send_push:     "text-[#8247e5]",
  edit_notice:   "text-[#f59e0b]",
  create_notice: "text-[#00d395]",
  delete_notice: "text-[#ef4444]",
  update_fee:    "text-[#f59e0b]",
};

export function OpLogsSection() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"admin" | "system" | "api">("admin");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "admin") {
        const { data } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(100);
        setLogs(data ?? []);
      } else if (tab === "api") {
        const data = await api("/logs");
        setLogs((data ?? []).filter((l: any) => l.status_code >= 400));
      } else {
        const { data } = await supabase.from("admin_logs").select("*").ilike("action", "%system%").order("created_at", { ascending: false }).limit(50);
        setLogs(data ?? []);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["admin", "api", "system"] as const).map((logTab) => (
          <button key={logTab} onClick={() => setTab(logTab)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${tab === logTab ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {logTab === "admin" ? "Admin Actions" : logTab === "api" ? "API Errors" : "System Logs"}
          </button>
        ))}
        <button onClick={fetchLogs} className="ml-auto p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={11} />
        </button>
      </div>

      {loading ? <Spinner /> : tab === "admin" ? (
        <div className="bg-card border border-border rounded-sm overflow-hidden font-mono text-[14px]">
          <div className="grid grid-cols-[160px_160px_200px_1fr_80px] px-4 py-2 border-b border-border text-[13px] text-muted-foreground uppercase tracking-widest">
            <span>Time</span><span>Admin</span><span>Action</span><span>Detail</span><span>Target</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">No logs</div>
            ) : logs.map((log, i) => (
              <div key={log.id ?? i} className="grid grid-cols-[160px_160px_200px_1fr_80px] px-4 py-2.5 border-b border-border/30 hover:bg-secondary/20 transition-colors items-start">
                <span className="text-muted-foreground whitespace-nowrap text-[13px]">{new Date(log.created_at).toLocaleString("sv-SE").replace("T", " ")}</span>
                <span className="text-foreground truncate pr-2">{log.admin_email}</span>
                <span className={`truncate pr-2 ${ACTION_COLORS[log.action] ?? "text-foreground"}`}>{log.action}</span>
                <span className="text-muted-foreground text-[12px] min-w-0 break-all">
                  {log.detail ? Object.entries(log.detail).map(([k, v]) => `${k}: ${v}`).join(" · ") : "—"}
                </span>
                <span className="text-muted-foreground truncate">{log.target_type ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : tab === "api" ? (
        <div className="bg-card border border-border rounded-sm overflow-hidden font-mono text-[14px]">
          <div className="grid grid-cols-[110px_52px_200px_52px_60px_140px] px-4 py-2 border-b border-border text-[13px] text-muted-foreground uppercase tracking-widest">
            <span>Time</span><span>Method</span><span>Path</span><span>Status</span><span>Latency</span><span>IP</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">No API errors</div>
            ) : logs.map((log, i) => (
              <div key={log.id ?? i} className="grid grid-cols-[110px_52px_200px_52px_60px_140px] px-4 py-1.5 border-b border-border/30 hover:bg-secondary/20">
                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</span>
                <span className={METHOD_COLORS[log.method] || "text-foreground"}>{log.method}</span>
                <span className="text-foreground truncate">{log.path}</span>
                <span className={log.status_code >= 500 ? "text-[#ef4444]" : "text-[#f59e0b]"}>{log.status_code}</span>
                <span className="text-muted-foreground">{log.latency_ms}ms</span>
                <span className="text-muted-foreground">{log.ip || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm p-6 text-center font-mono text-[14px] text-muted-foreground">
          <Cpu size={24} className="mx-auto mb-2 opacity-30" />
          <div>System logs are collected directly from the server</div>
          <div className="mt-1 text-[13px]">Check in Supabase Dashboard → Functions</div>
        </div>
      )}
    </div>
  );
}

// ─── SysConfigSection ─────────────────────────────────────────────────────────

export function SysConfigSection({ adminEmail }: { adminEmail: string }) {
  const { t } = useI18n();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  const API_KEYS = [
    { name: "Alchemy RPC",   key: "alch_***************************", lastRotated: "2026-06-01" },
    { name: "Transak API",   key: "trx_****************************", lastRotated: "2026-05-15" },
    { name: "Firebase FCM",  key: "fcm_****************************", lastRotated: "2026-06-10" },
    { name: "CoinGecko API", key: "cg_******************************", lastRotated: "2026-04-20" },
  ];

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try { const data = await api("/flags"); setFlags(data ?? []); }
    catch { setFlags([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggle = async (key: string, current: boolean) => {
    setSaving(key);
    try {
      const updated = await api(`/flags/${key}`, { method: "PATCH", body: JSON.stringify({ enabled: !current }) });
      setFlags((prev) => prev.map((f) => f.key === key ? updated : f));
      await supabase.from("admin_logs").insert({
        admin_email: adminEmail, action: "toggle_flag",
        target_type: "feature_flag", target_id: key, detail: { enabled: !current },
      });
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-5">
      {/* Feature flags */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">System Settings / Maintenance Mode</span>
        </div>
        {loading ? <Spinner /> : flags.length === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-[13px] text-muted-foreground">{t("db_init_needed")}</div>
        ) : flags.map((flag, i) => (
          <div key={flag.key}
            className={`px-4 py-4 flex items-center gap-4 border-b border-border/50 ${i === flags.length - 1 ? "border-0" : ""} ${flag.key === "MAINTENANCE_MODE" && flag.enabled ? "bg-[#ef4444]/5" : ""} hover:bg-secondary/20 transition-colors`}>
            <button onClick={() => toggle(flag.key, flag.enabled)} disabled={saving === flag.key}
              className="shrink-0 transition-opacity disabled:opacity-50">
              {flag.enabled
                ? <ToggleRight size={24} className={flag.key === "MAINTENANCE_MODE" ? "text-[#ef4444]" : "text-[#00d395]"} />
                : <ToggleLeft size={24} className="text-muted-foreground" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-['Barlow'] text-sm font-semibold text-foreground">{flag.label}</span>
                <Badge variant={flag.enabled ? "green" : "gray"}>{flag.enabled ? "on" : "off"}</Badge>
                {flag.key === "MAINTENANCE_MODE" && flag.enabled && <Badge variant="red">⚠ ACTIVE</Badge>}
              </div>
              <span className="font-mono text-[13px] text-muted-foreground">{flag.description}</span>
            </div>
            <code className="font-mono text-[13px] text-muted-foreground bg-secondary px-2 py-1 rounded-sm border border-border">{flag.key}</code>
          </div>
        ))}
      </div>

      {/* API Key display (read-only — manage keys in server env vars) */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Key size={12} className="text-muted-foreground" />
          <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">API Key Status</span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">Values managed in server environment variables</span>
        </div>
        {API_KEYS.map((k, i) => (
          <div key={k.name}
            className={`flex items-center gap-4 px-4 py-3.5 border-b border-border/50 hover:bg-secondary/20 transition-colors ${i === API_KEYS.length - 1 ? "border-0" : ""}`}>
            <div className="w-8 h-8 rounded-sm bg-[#8247e5]/10 flex items-center justify-center shrink-0">
              <Key size={12} className="text-[#8247e5]" />
            </div>
            <div className="flex-1">
              <div className="font-['Barlow'] text-sm font-semibold text-foreground">{k.name}</div>
              <div className="font-mono text-[13px] text-muted-foreground">
                {showApiKey === k.name ? k.key : k.key.slice(0, 8) + "••••••••••••••••••••••"}
              </div>
            </div>
            <div className="font-mono text-[13px] text-muted-foreground">Last rotated: {k.lastRotated}</div>
            <button onClick={() => setShowApiKey(showApiKey === k.name ? null : k.name)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <Eye size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TransakSyncSection ───────────────────────────────────────────────────────

export function TransakSyncSection({ adminEmail }: { adminEmail: string }) {
  const { t } = useI18n();
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [counts, setCounts] = useState({ countries: 0, fiats: 0, cryptos: 0, networks: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<"success" | "error" | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: countries },
        { count: fiats },
        { count: cryptos },
        { count: networks },
        { data: logs },
      ] = await Promise.all([
        supabase.from("supported_country").select("id", { count: "exact", head: true }),
        supabase.from("supported_fiat").select("id", { count: "exact", head: true }),
        supabase.from("supported_crypto").select("id", { count: "exact", head: true }),
        supabase.from("supported_network").select("id", { count: "exact", head: true }),
        supabase.from("transak_sync_log").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setCounts({ countries: countries ?? 0, fiats: fiats ?? 0, cryptos: cryptos ?? 0, networks: networks ?? 0 });
      setSyncLog(logs ?? []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      await api("/transak/sync", { method: "POST" });
      await supabase.from("admin_logs").insert({
        admin_email: adminEmail, action: "transak_lookup_sync",
        target_type: "transak", detail: { triggered_at: new Date().toISOString() },
      });
      setSyncResult("success");
      setTimeout(fetchData, 1000);
    } catch {
      setSyncResult("error");
    } finally { setSyncing(false); }
  };

  const CACHE_ITEMS = [
    { label: "Countries",  count: counts.countries, icon: Globe,        color: "#3b82f6" },
    { label: "Fiat",       count: counts.fiats,     icon: Database,     color: "#f59e0b" },
    { label: "Crypto",     count: counts.cryptos,   icon: ShoppingCart, color: "#8247e5" },
    { label: "Networks",   count: counts.networks,  icon: Cpu,          color: "#00d395" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-4 py-3">
        <AlertCircle size={14} className="text-[#8247e5] mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-mono text-[14px] text-[#8247e5] font-semibold mb-0.5">STEP 2 — Transak Lookup Cache</div>
          <div className="font-mono text-[13px] text-muted-foreground">Caches Transak Lookup API data to DB. The frontend always reads from this cache. Sync daily or use this button.</div>
        </div>
        <button onClick={runSync} disabled={syncing}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#8247e5] text-white font-mono text-[13px] uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 disabled:opacity-50 transition-colors shrink-0">
          {syncing ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw size={11} />}
          {syncing ? "Syncing..." : "Lookup Sync"}
        </button>
      </div>

      {syncResult === "success" && (
        <div className="flex items-center gap-2 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-4 py-2.5">
          <Check size={11} className="text-[#00d395]" />
          <span className="font-mono text-[14px] text-[#00d395]">Sync Complete</span>
        </div>
      )}
      {syncResult === "error" && (
        <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-4 py-2.5">
          <AlertCircle size={11} className="text-[#ef4444]" />
          <span className="font-mono text-[14px] text-[#ef4444]">Sync failed — Check Transak API key and IP whitelist.</span>
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-4 gap-3">
            {CACHE_ITEMS.map(({ label, count, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{label}</span>
                </div>
                <div className={`font-['Barlow_Condensed'] text-3xl font-bold ${count > 0 ? "text-foreground" : "text-muted-foreground"}`}>{count}</div>
                <div className="font-mono text-[12px] text-muted-foreground mt-0.5">{count > 0 ? "Cached" : "Not synced"}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Clock size={11} className="text-muted-foreground" />
              <span className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">동기화 이력</span>
            </div>
            {syncLog.length === 0 ? (
              <div className="px-4 py-6 text-center font-mono text-[13px] text-muted-foreground">동기화 기록 없음 — 위 버튼으로 첫 동기화를 실행하세요</div>
            ) : syncLog.map((log, i) => (
              <div key={log.id}
                className={`flex items-center gap-4 px-4 py-3 border-b border-border/30 ${i === syncLog.length - 1 ? "border-0" : ""} hover:bg-secondary/20 transition-colors`}>
                <Badge variant={log.status === "success" ? "green" : "red"}>{log.status}</Badge>
                <span className="font-mono text-[13px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                <span className="font-mono text-[13px] text-foreground flex-1">
                  국가 {log.countries} · Fiat {log.fiats} · Crypto {log.cryptos} · 네트워크 {log.networks}
                </span>
                {log.synced_by && <span className="font-mono text-[13px] text-muted-foreground">{log.synced_by}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── TransakOrdersSection ─────────────────────────────────────────────────────

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:          "gray",
  awaiting_payment: "yellow",
  processing:       "purple",
  completed:        "green",
  failed:           "red",
  cancelled:        "gray",
};

const KYC_STATUS_COLORS: Record<string, string> = {
  APPROVED:                  "green",
  SUBMITTED:                 "purple",
  NOT_SUBMITTED:             "gray",
  ADDITIONAL_FORMS_REQUIRED: "yellow",
  REJECTED:                  "red",
};

export function TransakOrdersSection() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [tab, setTab] = useState<"orders" | "kyc">("orders");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "orders") {
        const { data } = await supabase.from("transak_orders").select("*, users(email)").order("created_at", { ascending: false }).limit(100);
        setOrders(data ?? []);
      } else {
        const { data } = await supabase.from("transak_customers").select("*, users(email)").order("updated_at", { ascending: false }).limit(100);
        setCustomers(data ?? []);
      }
    } catch { } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalOrders = orders.length;
  const completed   = orders.filter((o) => o.status === "completed").length;
  const pending     = orders.filter((o) => ["pending", "awaiting_payment"].includes(o.status)).length;
  const kycApproved = customers.filter((c) => c.kyc_status === "APPROVED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="총 주문"  value={String(totalOrders)} />
        <StatCard label="완료"    value={String(completed)}   accent="#00d395" />
        <StatCard label="대기 중" value={String(pending)}     accent="#f59e0b" />
        <StatCard label="KYC 승인" value={String(kycApproved)} accent="#8247e5" />
      </div>

      <div className="flex gap-2">
        {(["orders", "kyc"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 font-mono text-[13px] uppercase tracking-widest border rounded-sm transition-colors ${tab === t ? "bg-[#8247e5]/15 border-[#8247e5]/40 text-[#8247e5]" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {t === "orders" ? "Transak 주문" : "KYC 고객"}
          </button>
        ))}
        <button onClick={fetchData} className="ml-auto p-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={11} />
        </button>
      </div>

      {loading ? <Spinner /> : tab === "orders" ? (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">주문 없음</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["생성시각", "이메일", "Transak ID", "금액", "코인", "결제방식", "상태"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === orders.length - 1 ? "border-0" : ""}`}>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleString("sv-SE").slice(0, 16)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{(o.users as any)?.email ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">
                        {o.transak_order_id ? `${o.transak_order_id.slice(0, 12)}…` : <span className="text-[#f59e0b]">대기중</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">${o.fiat_amount}</td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-[#8247e5]">{o.crypto_currency}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{o.payment_method}</td>
                      <td className="px-4 py-3"><Badge variant={(ORDER_STATUS_COLORS[o.status] ?? "gray") as any}>{o.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {customers.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[13px] text-muted-foreground">KYC 고객 없음</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["이메일", "Transak Customer ID", "KYC 상태", "KYC 유형", "토큰 만료", "최종 업데이트"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[13px] text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${i === customers.length - 1 ? "border-0" : ""}`}>
                    <td className="px-4 py-3 font-mono text-sm text-foreground">{(c.users as any)?.email ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{c.transak_customer_id ? `${c.transak_customer_id.slice(0, 14)}…` : "—"}</td>
                    <td className="px-4 py-3"><Badge variant={(KYC_STATUS_COLORS[c.kyc_status] ?? "gray") as any}>{c.kyc_status}</Badge></td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{c.kyc_type ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px]">
                      {c.access_token_exp
                        ? (new Date(c.access_token_exp) > new Date()
                          ? <span className="text-[#00d395]">유효</span>
                          : <span className="text-[#ef4444]">만료</span>)
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{new Date(c.updated_at).toLocaleString("sv-SE").slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
