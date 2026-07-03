import { useState } from "react";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useUsdToKrw } from "./hooks";
import { TOTAL_USD } from "./constants";

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div className="border-2 border-[#8247e5]/30 border-t-[#8247e5] rounded-full animate-spin"
      style={{ width: size, height: size }} />
  );
}

export function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={onBack} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={18} />
      </button>
      <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

export function BalanceDisplay({ change }: { change?: string }) {
  const { rate, loading: rateLoading } = useUsdToKrw();
  const { t } = useI18n();
  const [showKrw, setShowKrw] = useState(false);

  const usdStr = `$${TOTAL_USD.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const krwStr = `₩${(TOTAL_USD * rate).toLocaleString("ko-KR")}`;

  return (
    <>
      <button onClick={() => setShowKrw((v) => !v)} className="text-left group">
        <p className="font-['Barlow_Condensed'] text-4xl font-bold text-foreground group-hover:text-[#8247e5]/80 transition-colors">
          {showKrw ? krwStr : usdStr}
        </p>
        <p className="font-mono text-[13px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
          {showKrw ? usdStr : krwStr}
          <span className="text-[11px] opacity-50">
            {rateLoading ? t("rate_loading") : `@${rate.toLocaleString("ko-KR")}원`}
          </span>
        </p>
      </button>
      {change && (
        <p className="font-mono text-[13px] text-[#00d395] mt-1 flex items-center gap-1">
          <ArrowUpRight size={10} /> {change}
        </p>
      )}
    </>
  );
}
