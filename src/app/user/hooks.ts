import { useState, useEffect } from "react";

export function useUsdToKrw() {
  const [rate, setRate] = useState<number>(1380);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((d) => { if (d?.rates?.KRW) setRate(Math.round(d.rates.KRW)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { rate, loading };
}
