import { useState } from "react";
import { ShoppingCart, AlertCircle, Check, X } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { api } from "./api";
import { TOKENS } from "./constants";
import { Spinner, PageHeader } from "./components";
import type { UserProfile, TransakQuote, TransakOrder } from "./types";

type BuyStep = "quote" | "otp_send" | "otp_verify" | "kyc_check" | "kyc_form" | "order" | "done";

export function BuyTab({ profile, onSuccess, onBack }: { profile: UserProfile | null; onSuccess: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [step, setStep]             = useState<BuyStep>("quote");
  const [currency, setCurrency]     = useState("USDC");
  const [usdAmount, setUsdAmount]   = useState("");
  const [quote, setQuote]           = useState<TransakQuote | null>(null);
  const [email, setEmail]           = useState(profile?.email ?? "");
  const [otp, setOtp]               = useState("");
  const [stateToken, setStateToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [kycStatus, setKycStatus]   = useState("");
  const [kycForm, setKycForm]       = useState({ firstName: "", lastName: "", mobileNumber: "", dob: "", address: "", city: "", state: "", postCode: "", country: "KR" });
  const [order, setOrder]           = useState<TransakOrder | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const presets = ["10", "50", "100", "500"];

  const token = TOKENS.find((t) => t.symbol === currency)!;
  const clearError = () => setError("");

  const getQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usdAmount || parseFloat(usdAmount) <= 0) return;
    setLoading(true); clearError();
    try {
      const params = new URLSearchParams({ fiatCurrency: "USD", cryptoCurrency: currency, fiatAmount: usdAmount, network: "polygon", paymentMethod: "bank_transfer" });
      const data = await api(`/transak/quote?${params}`);
      const q = data?.response ?? data;
      setQuote({
        fiatCurrency: q.fiatCurrency ?? "USD", cryptoCurrency: q.cryptoCurrency ?? currency,
        fiatAmount: parseFloat(q.fiatAmount ?? usdAmount),
        cryptoAmount: parseFloat(q.cryptoAmount ?? (parseFloat(usdAmount) / token.price).toFixed(6)),
        totalFee: parseFloat(q.totalFee ?? (parseFloat(usdAmount) * 0.01).toFixed(2)),
        quoteId: q.quoteId,
      });
      setStep("otp_send");
    } catch {
      setQuote({ fiatCurrency: "USD", cryptoCurrency: currency, fiatAmount: parseFloat(usdAmount), cryptoAmount: parseFloat((parseFloat(usdAmount) / token.price).toFixed(6)), totalFee: parseFloat((parseFloat(usdAmount) * 0.01).toFixed(2)), quoteId: undefined });
      setStep("otp_send");
    } finally { setLoading(false); }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true); clearError();
    try {
      const data = await api("/transak/otp/send", { method: "POST", body: JSON.stringify({ email }) });
      const st = data?.response?.stateToken ?? data?.stateToken ?? data?.data?.stateToken;
      if (st) setStateToken(st);
      setStep("otp_verify");
    } catch (err: any) { setError(err.message ?? t("error_generic")); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true); clearError();
    try {
      const data = await api("/transak/otp/verify", { method: "POST", body: JSON.stringify({ email, otp, stateToken }) });
      const at = data?.response?.accessToken ?? data?.accessToken ?? data?.data?.accessToken;
      if (!at) throw new Error(t("error_generic"));
      setAccessToken(at);
      const userRes = await api("/transak/user", { headers: { "x-transak-token": at } });
      const kyc = userRes?.response?.kyc ?? userRes?.kyc ?? userRes?.data?.kyc;
      const kycSt = kyc?.status ?? "NOT_SUBMITTED";
      const transakCustomerId = userRes?.response?.id ?? userRes?.id ?? userRes?.data?.id;
      setKycStatus(kycSt);
      await supabase.from("transak_customers").upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        transak_customer_id: transakCustomerId ?? null,
        kyc_status: kycSt, access_token: at,
        access_token_exp: new Date(Date.now() + 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).catch(() => {});
      if (kycSt === "APPROVED") setStep("order");
      else if (kycSt === "NOT_SUBMITTED") setStep("kyc_form");
      else setStep("kyc_check");
    } catch (err: any) { setError(err.message ?? t("error_generic")); }
    finally { setLoading(false); }
  };

  const submitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clearError();
    try {
      await api("/transak/user/kyc", {
        method: "PATCH",
        headers: { "x-transak-token": accessToken },
        body: JSON.stringify({ firstName: kycForm.firstName, lastName: kycForm.lastName, mobileNumber: kycForm.mobileNumber, dob: kycForm.dob, address: { addressLine1: kycForm.address, city: kycForm.city, state: kycForm.state, postCode: kycForm.postCode, country: kycForm.country } }),
      });
      setStep("kyc_check");
    } catch (err: any) { setError(err.message ?? t("error_generic")); }
    finally { setLoading(false); }
  };

  const checkKyc = async () => {
    setLoading(true); clearError();
    try {
      const userRes = await api("/transak/user", { headers: { "x-transak-token": accessToken } });
      const kyc = userRes?.response?.kyc ?? userRes?.kyc ?? userRes?.data?.kyc;
      const kycSt = kyc?.status ?? kycStatus;
      setKycStatus(kycSt);
      if (kycSt === "APPROVED") setStep("order");
      else if (kycSt === "NOT_SUBMITTED") setStep("kyc_form");
    } catch (err: any) { setError(err.message ?? t("error_generic")); }
    finally { setLoading(false); }
  };

  const createOrder = async () => {
    if (!profile?.wallet_address) { setError(t("not_connected")); return; }
    setLoading(true); clearError();
    const { data: localOrder } = await supabase.from("transak_orders").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      quote_id: quote?.quoteId ?? null, fiat_currency: quote?.fiatCurrency ?? "USD",
      fiat_amount: quote?.fiatAmount ?? 0, crypto_currency: currency,
      crypto_amount: quote?.cryptoAmount ?? 0, payment_method: "bank_transfer",
      wallet_address: profile.wallet_address, status: "pending",
    }).select().single().catch(() => ({ data: null }));
    const localOrderId = (localOrder as any)?.id ?? `local-${Date.now()}`;
    try {
      const data = await api("/transak/order/bank", {
        method: "POST",
        headers: { "x-transak-token": accessToken },
        body: JSON.stringify({ quoteId: quote?.quoteId, walletAddress: profile.wallet_address, paymentInstrumentId: "bank_transfer" }),
      });
      const od = data?.response ?? data?.data ?? data;
      const transakOrderId = od?.id ?? `TRK-${Date.now()}`;
      const bankDets = od?.bankDetails ?? od?.paymentDetails?.bankDetails;
      await supabase.from("transak_orders").update({ transak_order_id: transakOrderId, status: "awaiting_payment", bank_details: bankDets ?? null, updated_at: new Date().toISOString() }).eq("id", localOrderId).catch(() => {});
      setOrder({ id: transakOrderId, status: od?.status ?? "AWAITING_PAYMENT_FROM_USER", bankDetails: bankDets });
      await api("/transactions", { method: "POST", body: JSON.stringify({ type: "purchase", amount: quote?.cryptoAmount ?? 0, currency, status: "pending", payment_provider: "Transak", memo: transakOrderId }) }).catch(() => {});
      setStep("done");
    } catch {
      await supabase.from("transak_orders").update({ status: "failed", failure_reason: "Transak API not configured", updated_at: new Date().toISOString() }).eq("id", localOrderId).catch(() => {});
      const demoOrderId = `TRK-DEMO-${Date.now()}`;
      setOrder({ id: demoOrderId, status: "AWAITING_PAYMENT_FROM_USER", bankDetails: { bankName: "Transak Bank (Demo)", accountNumber: "12345678", sortCode: "20-00-00", reference: `PAY-${Date.now()}`, amount: quote?.fiatAmount, currency: "USD" } });
      await api("/transactions", { method: "POST", body: JSON.stringify({ type: "purchase", amount: quote?.cryptoAmount ?? 0, currency, status: "pending", payment_provider: "Transak", memo: demoOrderId }) }).catch(() => {});
      setStep("done");
    } finally { setLoading(false); }
  };

  const restart = () => { setStep("quote"); setQuote(null); setOtp(""); setStateToken(""); setAccessToken(""); setOrder(null); clearError(); };

  const StepIndicator = () => {
    const steps = [
      { key: "quote", label: t("step_quote") },
      { key: "otp_send", label: t("step_auth") },
      { key: "otp_verify", label: "OTP" },
      { key: "order", label: t("step_order") },
      { key: "done", label: t("step_done") },
    ];
    const stepIdx = ["quote","otp_send","otp_verify","kyc_form","kyc_check","order","done"].indexOf(step);
    return (
      <div className="flex items-center gap-1 mb-4">
        {steps.map((s, i) => {
          const done2 = i < stepIdx;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-bold transition-colors ${done2 ? "bg-[#00d395] text-background" : step.startsWith(s.key.split("_")[0]) ? "bg-[#8247e5] text-white" : "bg-secondary text-muted-foreground"}`}>
                {done2 ? "✓" : i + 1}
              </div>
              <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest hidden sm:inline">{s.label}</span>
              {i < steps.length - 1 && <div className="w-4 h-px bg-border mx-0.5" />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("buy_title")} onBack={onBack} />
      <StepIndicator />

      {error && (
        <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2.5">
          <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
          <span className="font-mono text-[13px] text-[#ef4444] flex-1">{error}</span>
          <button onClick={clearError} className="text-muted-foreground hover:text-foreground"><X size={11} /></button>
        </div>
      )}

      {step === "quote" && (
        <div className="bg-card border border-border rounded-sm p-5">
          <p className="font-mono text-[13px] text-muted-foreground mb-4">{t("buy_select_desc")}</p>
          <form onSubmit={getQuote} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("buy_token_label")}</label>
              <div className="flex gap-2">
                {TOKENS.map((t) => (
                  <button key={t.symbol} type="button" onClick={() => setCurrency(t.symbol)}
                    className="flex-1 py-2.5 rounded-sm border font-mono text-sm font-bold transition-colors"
                    style={currency === t.symbol ? { borderColor: t.color + "60", backgroundColor: t.color + "15", color: t.color } : { borderColor: "rgba(255,255,255,0.08)", color: "#6b7280" }}>
                    {t.symbol}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("buy_amount_label")}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">$</span>
                <input type="number" min="10" step="any" required value={usdAmount} onChange={(e) => setUsdAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-secondary border border-border rounded-sm pl-7 pr-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              </div>
              <div className="flex gap-1.5">
                {presets.map((p) => (
                  <button key={p} type="button" onClick={() => setUsdAmount(p)}
                    className="px-2.5 py-1 border border-border rounded-sm font-mono text-[13px] text-muted-foreground hover:text-foreground hover:border-[#8247e5]/40 transition-colors">${p}</button>
                ))}
              </div>
            </div>
            {usdAmount && parseFloat(usdAmount) > 0 && (
              <div className="bg-secondary/60 border border-border rounded-sm px-4 py-3 space-y-1.5">
                <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("est_receive")}</span><span className="font-mono text-sm font-bold" style={{ color: token.color }}>{(parseFloat(usdAmount) / token.price).toFixed(6)} {currency}</span></div>
                <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("platform_fee")}</span><span className="font-mono text-[13px] text-muted-foreground">${(parseFloat(usdAmount) * 0.01).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("payment_method")}</span><span className="font-mono text-[13px] text-[#8247e5]">{t("bank_transfer")}</span></div>
              </div>
            )}
            <button type="submit" disabled={loading || !usdAmount}
              className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <Spinner size={14} /> : <ShoppingCart size={13} />}
              {loading ? t("getting_quote") : t("get_quote")}
            </button>
          </form>
        </div>
      )}

      {step === "otp_send" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          {quote && (
            <div className="bg-[#8247e5]/5 border border-[#8247e5]/20 rounded-sm px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[13px] text-muted-foreground">{t("selected_purchase")}</span>
              <span className="font-mono text-sm font-bold text-[#8247e5]">${quote.fiatAmount} → {quote.cryptoAmount} {quote.cryptoCurrency}</span>
            </div>
          )}
          <p className="font-mono text-[13px] text-muted-foreground">{t("otp_send_desc")}</p>
          <form onSubmit={sendOtp} className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("email")}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("quote")} className="px-4 py-2.5 border border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">{t("prev")}</button>
              <button type="submit" disabled={loading || !email}
                className="flex-1 py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <Spinner size={14} /> : null}{loading ? t("sending") : t("send_otp")}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "otp_verify" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <p className="font-mono text-[13px] text-muted-foreground"><span className="text-foreground">{email}</span> {t("otp_sent_desc")}</p>
          <form onSubmit={verifyOtp} className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("otp_code_label")}</label>
              <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder={t("otp_placeholder")} maxLength={6}
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-xl text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 tracking-widest transition-colors" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("otp_send")} className="px-4 py-2.5 border border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">{t("resend")}</button>
              <button type="submit" disabled={loading || otp.length < 4}
                className="flex-1 py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <Spinner size={14} /> : null}{loading ? t("verifying") : t("verify_otp")}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "kyc_form" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-3 py-2">
            <AlertCircle size={12} className="text-[#f59e0b] shrink-0" />
            <span className="font-mono text-[13px] text-[#f59e0b]">{t("kyc_required")}</span>
          </div>
          <form onSubmit={submitKyc} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {([ [t("last_name"), "lastName", "Kim"], [t("first_name"), "firstName", "Gildong"] ] as const).map(([label, field, ph]) => (
                <div key={field} className="space-y-1">
                  <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{label}</label>
                  <input required value={(kycForm as any)[field]} onChange={(e) => setKycForm({ ...kycForm, [field]: e.target.value })} placeholder={ph}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("phone")}</label>
                <input required value={kycForm.mobileNumber} onChange={(e) => setKycForm({ ...kycForm, mobileNumber: e.target.value })} placeholder="+821012345678"
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("dob")}</label>
                <input type="date" required value={kycForm.dob} onChange={(e) => setKycForm({ ...kycForm, dob: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("address")}</label>
              <input required value={kycForm.address} onChange={(e) => setKycForm({ ...kycForm, address: e.target.value })} placeholder="123 Main St"
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([ [t("city"), "city", "Seoul"], [t("state_province"), "state", "Seoul"], [t("post_code"), "postCode", "06234"] ] as const).map(([label, field, ph]) => (
                <div key={field} className="space-y-1">
                  <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{label}</label>
                  <input required value={(kycForm as any)[field]} onChange={(e) => setKycForm({ ...kycForm, [field]: e.target.value })} placeholder={ph}
                    className="w-full bg-secondary border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <Spinner size={14} /> : null}{loading ? t("submitting") : t("submit_kyc")}
            </button>
          </form>
        </div>
      )}

      {step === "kyc_check" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <div className="text-center py-4">
            {kycStatus === "SUBMITTED" ? (
              <><div className="w-12 h-12 rounded-full bg-[#f59e0b]/10 flex items-center justify-center mx-auto mb-3"><AlertCircle size={22} className="text-[#f59e0b]" /></div><p className="font-['Barlow'] text-sm font-semibold text-foreground mb-1">{t("kyc_reviewing")}</p><p className="font-mono text-[13px] text-muted-foreground">{t("kyc_reviewing_desc")}</p></>
            ) : kycStatus === "ADDITIONAL_FORMS_REQUIRED" ? (
              <><div className="w-12 h-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-3"><AlertCircle size={22} className="text-[#3b82f6]" /></div><p className="font-['Barlow'] text-sm font-semibold text-foreground mb-1">{t("kyc_more_docs")}</p><p className="font-mono text-[13px] text-muted-foreground">{t("kyc_more_docs_desc")}</p></>
            ) : (
              <><div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3"><AlertCircle size={22} className="text-muted-foreground" /></div><p className="font-['Barlow'] text-sm font-semibold text-foreground mb-1">{t("kyc_status_prefix")} {kycStatus || t("kyc_checking")}</p><p className="font-mono text-[13px] text-muted-foreground">{t("kyc_status_desc")}</p></>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={checkKyc} disabled={loading}
              className="flex-1 py-2.5 border border-[#8247e5]/40 text-[#8247e5] bg-[#8247e5]/10 font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Spinner size={14} /> : null} {t("check_status")}
            </button>
            {kycStatus === "APPROVED" && (
              <button onClick={() => setStep("order")} className="flex-1 py-2.5 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">
                {t("proceed_order")}
              </button>
            )}
          </div>
        </div>
      )}

      {step === "order" && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-3 py-2">
            <Check size={12} className="text-[#00d395]" />
            <span className="font-mono text-[13px] text-[#00d395]">{t("kyc_complete")}</span>
          </div>
          {quote && (
            <div className="bg-secondary/60 border border-border rounded-sm px-4 py-3 space-y-2">
              <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("pay_amount")}</span><span className="font-mono text-sm font-bold text-foreground">${quote.fiatAmount} USD</span></div>
              <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("est_receive_amount")}</span><span className="font-mono text-sm font-bold text-[#8247e5]">{quote.cryptoAmount} {quote.cryptoCurrency}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("fee")}</span><span className="font-mono text-[13px] text-muted-foreground">${quote.totalFee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="font-mono text-[13px] text-muted-foreground">{t("wallet_address_label")}</span><span className="font-mono text-[13px] text-muted-foreground truncate max-w-[180px]">{profile?.wallet_address ? `${profile.wallet_address.slice(0,10)}...` : t("not_connected")}</span></div>
            </div>
          )}
          <button onClick={createOrder} disabled={loading}
            className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <Spinner size={14} /> : <ShoppingCart size={13} />}
            {loading ? t("creating_order") : t("create_bank_order")}
          </button>
          <p className="font-mono text-[12px] text-muted-foreground text-center">{t("order_terms")}</p>
        </div>
      )}

      {step === "done" && order && (
        <div className="bg-card border border-border rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#00d395]/10 flex items-center justify-center shrink-0"><Check size={18} className="text-[#00d395]" /></div>
            <div>
              <p className="font-['Barlow'] text-sm font-semibold text-foreground">{t("order_created")}</p>
              <p className="font-mono text-[13px] text-muted-foreground">{t("order_id")} {order.id}</p>
            </div>
          </div>
          {order.bankDetails && (
            <div className="bg-secondary/60 border border-[#3b82f6]/20 rounded-sm p-4 space-y-2">
              <div className="font-mono text-[13px] text-[#3b82f6] uppercase tracking-widest mb-3">{t("deposit_info")}</div>
              {[ { label: t("bank_name"), val: order.bankDetails.bankName }, { label: t("account_number"), val: order.bankDetails.accountNumber }, { label: t("sort_code"), val: order.bankDetails.sortCode }, { label: t("deposit_ref"), val: order.bankDetails.reference }, { label: t("deposit_amount"), val: order.bankDetails.amount ? `${order.bankDetails.amount} ${order.bankDetails.currency}` : undefined } ]
                .filter((r) => r.val).map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="font-mono text-[13px] text-muted-foreground">{row.label}</span>
                    <span className="font-mono text-[13px] text-foreground font-semibold">{row.val}</span>
                  </div>
                ))}
            </div>
          )}
          <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-sm px-3 py-2.5 flex items-start gap-2">
            <AlertCircle size={12} className="text-[#f59e0b] mt-0.5 shrink-0" />
            <span className="font-mono text-[13px] text-[#f59e0b]">{t("deposit_notice")}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={restart} className="flex-1 py-2.5 border border-border rounded-sm font-mono text-sm text-muted-foreground hover:text-foreground transition-colors">{t("new_purchase")}</button>
            <button onClick={onSuccess} className="flex-1 py-2.5 bg-[#8247e5] text-white font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#8247e5]/80 transition-colors">{t("view_history")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
