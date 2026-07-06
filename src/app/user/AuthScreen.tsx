import { useState, useEffect } from "react";
import userLoginLogo from "@/imports/gms_user_login_logo.png";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { useI18n, LanguageSwitcher } from "../../lib/i18n";
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Spinner } from "./components";

interface PartnerInfo { id: string; name: string; role: string; email: string; }

export function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [partnerLookupState, setPartnerLookupState] = useState<"idle" | "loading" | "found" | "notfound">("idle");

  useEffect(() => {
    if (!partnerCode.trim() || tab !== "signup") {
      setPartnerInfo(null);
      setPartnerLookupState("idle");
      return;
    }
    const timer = setTimeout(async () => {
      setPartnerLookupState("loading");
      try {
        const { data } = await supabase
          .from("partners")
          .select("id, email, name, type")
          .eq("code", partnerCode.trim().toUpperCase())
          .maybeSingle();
        if (data) {
          setPartnerInfo({ id: data.id, name: data.name ?? data.email, role: data.type, email: data.email });
          setPartnerLookupState("found");
        } else {
          setPartnerInfo(null);
          setPartnerLookupState("notfound");
        }
      } catch {
        setPartnerInfo(null);
        setPartnerLookupState("notfound");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [partnerCode, tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (tab === "signup" && password !== confirmPw) { setError(t("pw_mismatch")); return; }
    if (password.length < 6) { setError(t("pw_too_short")); return; }
    setLoading(true);
    try {
      if (tab === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onAuth();
      } else {
        // 파트너 이메일로 일반 회원가입 차단
        const { data: existingPartner } = await supabase
          .from("partners").select("id").eq("email", email).maybeSingle();
        if (existingPartner) throw new Error(t("email_partner_conflict"));

        const { error: err } = await supabase.auth.signUp({
          email, password,
          options: { data: { partner_id: partnerInfo?.id ?? null, partner_code: partnerCode.trim() || null } },
        });
        if (err) throw err;
        setSuccess(t("signup_pending_approval"));
        setTab("login");
      }
    } catch (err: any) {
      setError(err.message ?? t("error_generic"));
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (err) throw err;
    } catch (err: any) {
      setError(err.message ?? t("error_generic"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <ImageWithFallback src={userLoginLogo} alt="GMS Wallet" className="h-44 w-auto object-contain" />
        </div>

        <div className="flex bg-secondary rounded-sm p-0.5 mb-4">
          {(["login", "signup"] as const).map((tabId) => (
            <button key={tabId} onClick={() => { setTab(tabId); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 font-mono text-[14px] uppercase tracking-widest rounded-sm transition-colors ${tab === tabId ? "bg-[#8247e5] text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {tabId === "login" ? t("login_tab") : t("signup_tab")}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-sm p-5 space-y-3">
          <div className="space-y-1">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("email")}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("password")}</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 pr-9 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          {tab === "signup" && (
            <>
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest">{t("confirm_password")}</label>
                <input type={showPw ? "text" : "password"} required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••"
                  className="w-full bg-secondary border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#8247e5]/60 transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[13px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  {t("partner_code")} <span className="text-[11px] normal-case tracking-normal">{t("partner_code_optional")}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value.toLowerCase().trim())}
                    placeholder={t("partner_placeholder")}
                    className={`w-full bg-secondary border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${
                      partnerLookupState === "found" ? "border-[#00d395]/60" :
                      partnerLookupState === "notfound" ? "border-[#ef4444]/40" :
                      "border-border focus:border-[#8247e5]/60"
                    }`}
                  />
                  {partnerLookupState === "loading" && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <div className="w-3 h-3 border border-[#8247e5]/30 border-t-[#8247e5] rounded-full animate-spin" />
                    </div>
                  )}
                  {partnerLookupState === "found" && <Check size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#00d395]" />}
                </div>
                {partnerLookupState === "found" && partnerInfo && (
                  <div className="flex items-center gap-2 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-3 py-2">
                    <Check size={10} className="text-[#00d395] shrink-0" />
                    <div className="flex-1 font-mono text-[13px]">
                      <span className="text-[#00d395] font-bold">{partnerInfo.name}</span>
                      <span className="text-muted-foreground ml-2 text-[11px]">{partnerInfo.role} · {partnerInfo.email}</span>
                    </div>
                  </div>
                )}
                {partnerLookupState === "notfound" && partnerCode && (
                  <p className="font-mono text-[13px] text-[#ef4444]">"{partnerCode}" {t("partner_not_found")}</p>
                )}
              </div>
            </>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-sm px-3 py-2">
              <AlertCircle size={11} className="text-[#ef4444] shrink-0" />
              <span className="font-mono text-[13px] text-[#ef4444]">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-[#00d395]/5 border border-[#00d395]/20 rounded-sm px-3 py-2">
              <Check size={11} className="text-[#00d395] shrink-0" />
              <span className="font-mono text-[13px] text-[#00d395]">{success}</span>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#8247e5] hover:bg-[#8247e5]/80 disabled:opacity-50 text-white font-mono text-sm uppercase tracking-widest rounded-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <Spinner size={14} /> : tab === "login" ? <LogIn size={13} /> : <UserPlus size={13} />}
            {loading ? t("processing") : tab === "login" ? t("login_tab") : t("signup_tab")}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[12px] text-muted-foreground uppercase tracking-widest">{t("or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <button type="button" onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-800 font-mono text-sm rounded-sm border border-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t("google_continue")}
          </button>
        </form>
        {tab === "login" && (
          <p className="mt-4 text-center font-mono text-[13px] text-muted-foreground">
            {t("no_account")}{" "}
            <button onClick={() => setTab("signup")} className="text-[#8247e5] hover:underline">{t("signup_tab")}</button>
          </p>
        )}
      </div>
    </div>
  );
}
