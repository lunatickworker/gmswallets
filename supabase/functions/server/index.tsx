import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono().basePath("/functions/v1/server");

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Transak API helper
const TRANSAK_BASE = Deno.env.get("TRANSAK_BASE_URL") ?? "https://staging-api.transak.com";
const TRANSAK_KEY  = Deno.env.get("TRANSAK_API_KEY") ?? "";

async function transakFetch(path: string, opts: RequestInit = {}, accessToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": TRANSAK_KEY,
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  const res = await fetch(`${TRANSAK_BASE}${path}`, { ...opts, headers });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ─── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok" }));

// ─── Setup ────────────────────────────────────────────────────────────────────
app.post("/setup", async (c) => {
  const sb = getSupabase();
  // Seed default feature flags (idempotent)
  await sb.from("feature_flags").upsert([
    { key: "ENABLE_SWAP",              label: "DEX Swap",            description: "Uniswap V3 스왑 기능 활성화",                          enabled: true  },
    { key: "ENABLE_TRANSAK",           label: "Transak Onramp",      description: "법정화폐 구매 기능 활성화",                             enabled: true  },
    { key: "ENABLE_QR_SEND",           label: "QR Send",             description: "QR 코드 송금 기능",                                    enabled: true  },
    { key: "ENABLE_CSV_EXPORT",        label: "CSV Export",          description: "거래내역 CSV 다운로드",                                 enabled: false },
    { key: "ENABLE_PORTFOLIO_CHART",   label: "Portfolio Chart",     description: "포트폴리오 히스토리 차트 (베타)",                      enabled: true  },
    { key: "ENABLE_RATE_LIMIT_STRICT", label: "Strict Rate Limit",   description: "인증 엔드포인트 엄격한 레이트 제한 (5req/min)",        enabled: false },
    { key: "MAINTENANCE_MODE",         label: "Maintenance Mode",    description: "전체 앱 유지보수 모드 활성화",                         enabled: false },
    { key: "ENABLE_PERMIT2",           label: "Permit2 Approval",    description: "Permit2 기반 가스 효율 토큰 승인",                     enabled: true  },
  ], { onConflict: "key", ignoreDuplicates: true });
  return c.json({ ok: true });
});

// ─── Stats ────────────────────────────────────────────────────────────────────
app.get("/stats", async (c) => {
  const sb = getSupabase();
  const [usersRes, txRes, webhookRes] = await Promise.all([
    sb.from("users").select("id, status, kyc_tier", { count: "exact" }),
    sb.from("transactions").select("id, status, amount, currency, created_at", { count: "exact" }),
    sb.from("transak_webhook_logs").select("id, processed, error", { count: "exact" }),
  ]);

  const totalUsers = usersRes.count ?? 0;
  const t2Users = (usersRes.data ?? []).filter((u: any) => u.kyc_tier === "T2").length;
  const txData  = txRes.data ?? [];
  const totalTx = txRes.count ?? 0;
  const webhookData       = webhookRes.data ?? [];
  const totalWebhooks     = webhookRes.count ?? 1;
  const completedWebhooks = webhookData.filter((w: any) => w.processed === true).length;
  const failedWebhooks    = webhookData.filter((w: any) => w.error !== null).length;
  const volume24h = txData
    .filter((t: any) => Date.now() - new Date(t.created_at).getTime() < 86400000 && t.currency === "USDC")
    .reduce((s: number, t: any) => s + parseFloat(t.amount), 0);

  return c.json({
    totalUsers,
    t2Users,
    totalTx,
    volume24h: volume24h.toFixed(2),
    webhookSuccessRate: totalWebhooks > 0 ? ((completedWebhooks / totalWebhooks) * 100).toFixed(1) : "100.0",
    failedWebhooks,
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.get("/users", async (c) => {
  const sb = getSupabase();
  const search = c.req.query("search") ?? "";
  const status = c.req.query("status") ?? "";
  let q = sb.from("users").select("*").order("joined_at", { ascending: false });
  if (search) q = q.or(`email.ilike.%${search}%,wallet_address.ilike.%${search}%`);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.post("/users", async (c) => {
  const sb = getSupabase();
  const body = await c.req.json();
  const { data, error } = await sb.from("users").insert(body).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

app.patch("/users/:id", async (c) => {
  const sb = getSupabase();
  const { data, error } = await sb.from("users").update(await c.req.json()).eq("id", c.req.param("id")).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.delete("/users/:id", async (c) => {
  const sb = getSupabase();
  const { error } = await sb.from("users").delete().eq("id", c.req.param("id"));
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// ─── Transactions ─────────────────────────────────────────────────────────────
app.get("/transactions", async (c) => {
  const sb = getSupabase();
  const type = c.req.query("type") ?? "";
  let q = sb.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
  if (type && type !== "all") q = q.eq("type", type);
  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.post("/transactions", async (c) => {
  const sb = getSupabase();
  const body = await c.req.json();
  const { data, error } = await sb.from("transactions").insert(body).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

app.patch("/transactions/:id", async (c) => {
  const sb = getSupabase();
  const { data, error } = await sb.from("transactions").update(await c.req.json()).eq("id", c.req.param("id")).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ─── Transak Webhook Logs ─────────────────────────────────────────────────────
app.get("/webhooks", async (c) => {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("transak_webhook_logs")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(50);
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ─── Request Logs ─────────────────────────────────────────────────────────────
app.get("/logs", async (c) => {
  const sb = getSupabase();
  const { data, error } = await sb.from("request_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.post("/logs", async (c) => {
  const sb = getSupabase();
  const { error } = await sb.from("request_logs").insert(await c.req.json());
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true }, 201);
});

// ─── Feature Flags ────────────────────────────────────────────────────────────
app.get("/flags", async (c) => {
  const sb = getSupabase();
  const { data, error } = await sb.from("feature_flags").select("*").order("key");
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.patch("/flags/:key", async (c) => {
  const sb = getSupabase();
  const { enabled } = await c.req.json();
  const { data, error } = await sb.from("feature_flags")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", c.req.param("key")).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ─── Admin Logs ───────────────────────────────────────────────────────────────
app.get("/admin-logs", async (c) => {
  const sb = getSupabase();
  const { data, error } = await sb.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// ─── Partners ─────────────────────────────────────────────────────────────────
app.get("/partners", async (c) => {
  const sb = getSupabase();
  const type   = c.req.query("type") ?? "";
  const status = c.req.query("status") ?? "";

  let q = sb.from("partners").select("*, parent:parent_id(id, name, code, type, fee_rate, parent_id)").order("created_at");
  if (type   && type   !== "all") q = q.eq("type", type);
  if (status && status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);

  // Enrich with computed parent/grandparent names
  const all = data ?? [];
  const byId = Object.fromEntries(all.map((p: any) => [p.id, p]));

  const enriched = all.map((p: any) => {
    const parent = p.parent ?? null;
    const grandparent = parent ? (byId[parent.parent_id] ?? null) : null;
    return {
      ...p,
      parent_name:      parent?.name ?? null,
      grandparent_name: grandparent?.name ?? null,
      // count sub-partners
      sub_count: all.filter((x: any) => x.parent_id === p.id).length,
    };
  });

  return c.json(enriched);
});

app.post("/partners", async (c) => {
  const sb   = getSupabase();
  const body = await c.req.json();
  const { data, error } = await sb.from("partners").insert({
    name:       body.name,
    code:       body.code,
    type:       body.type,
    parent_id:  body.parent_id || null,
    fee_rate:   body.fee_rate ?? 0,
    status:     body.status ?? "active",
    phone:      body.phone ?? body.contact ?? null,
    email:      body.email ?? null,
    address:    body.address ?? null,
    region:     body.region ?? null,
    bank_name:  body.bank_name ?? null,
    bank_account: body.bank_account ?? null,
    bank_holder:  body.bank_holder ?? null,
  }).select().single();
  if (error) return c.json({ error: error.message }, 500);

  // 이메일이 있으면 Supabase Auth 계정도 생성 (어드민 로그인 용)
  let tempPassword: string | null = null;
  if (body.email) {
    tempPassword = Math.random().toString(36).slice(2, 10) + "A1!";
    const { error: authErr } = await sb.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { partner_id: data.id, partner_type: body.type, partner_name: body.name },
    });
    if (authErr && !authErr.message.includes("already registered")) {
      console.error("Auth user creation failed:", authErr.message);
      tempPassword = null;
    }
  }

  return c.json({ ...data, temp_password: tempPassword }, 201);
});

app.patch("/partners/:id", async (c) => {
  const sb   = getSupabase();
  const body = await c.req.json();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if ("name"        in body) update.name        = body.name;
  if ("code"        in body) update.code        = body.code;
  if ("parent_id"   in body) update.parent_id   = body.parent_id || null;
  if ("fee_rate"    in body) update.fee_rate    = body.fee_rate;
  if ("status"      in body) update.status      = body.status;
  if ("contact"     in body) update.phone       = body.contact;
  if ("phone"       in body) update.phone       = body.phone;
  if ("email"       in body) update.email       = body.email;
  if ("bank_name"   in body) update.bank_name   = body.bank_name;
  if ("bank_account" in body) update.bank_account = body.bank_account;
  if ("bank_holder"  in body) update.bank_holder  = body.bank_holder;
  const { data, error } = await sb.from("partners").update(update).eq("id", c.req.param("id")).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.delete("/partners/:id", async (c) => {
  const sb = getSupabase();
  const { error } = await sb.from("partners").delete().eq("id", c.req.param("id"));
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// ─── Settlements ──────────────────────────────────────────────────────────────
app.get("/settlements", async (c) => {
  const sb        = getSupabase();
  const partnerId = c.req.query("partner_id") ?? "";
  const status    = c.req.query("status") ?? "";

  let q = sb.from("settlements").select(`
    *,
    partner:partner_id(id, name, code, type, parent_id,
      parent:parent_id(id, name, type,
        parent:parent_id(id, name, type)
      )
    )
  `).order("created_at", { ascending: false }).limit(200);

  if (partnerId) q = q.eq("partner_id", partnerId);
  if (status && status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data ?? []);
});

app.post("/settlements", async (c) => {
  const sb   = getSupabase();
  const body = await c.req.json();
  const { data, error } = await sb.from("settlements").insert(body).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

app.patch("/settlements/:id", async (c) => {
  const sb   = getSupabase();
  const body = await c.req.json();
  const update: Record<string, any> = {};
  if ("status" in body) {
    update.status = body.status;
    if (body.status === "completed") update.processed_at = new Date().toISOString();
  }
  if ("memo" in body) update.memo = body.memo;
  const { data, error } = await sb.from("settlements").update(update).eq("id", c.req.param("id")).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// Trigger bulk settlement for a store partner
app.post("/settlements/bulk", async (c) => {
  const sb   = getSupabase();
  const { partner_ids, memo } = await c.req.json();
  if (!Array.isArray(partner_ids) || partner_ids.length === 0) {
    return c.json({ error: "partner_ids required" }, 400);
  }
  const { error } = await sb.from("settlements")
    .update({ status: "completed", processed_at: new Date().toISOString(), memo: memo ?? "일괄정산" })
    .in("partner_id", partner_ids)
    .eq("status", "pending");
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// ─── Transak Proxy ────────────────────────────────────────────────────────────
// All Transak API calls must originate from backend (IP-whitelisted)
// Set TRANSAK_API_KEY and TRANSAK_BASE_URL in Supabase Edge Function env vars.

// GET /transak/quote - get a real-time purchase quote
app.get("/transak/quote", async (c) => {
  const fiatCurrency   = c.req.query("fiatCurrency")   ?? "USD";
  const cryptoCurrency = c.req.query("cryptoCurrency") ?? "USDC";
  const fiatAmount     = c.req.query("fiatAmount")     ?? "100";
  const network        = c.req.query("network")        ?? "polygon";
  const paymentMethod  = c.req.query("paymentMethod")  ?? "bank_transfer";

  const params = new URLSearchParams({
    fiatCurrency,
    cryptoCurrency,
    fiatAmount,
    network,
    paymentMethod,
    isBuyOrSell: "BUY",
    partnerApiKey: TRANSAK_KEY,
  });

  const { ok, data } = await transakFetch(`/api/v2/currencies/price?${params}`);
  if (!ok) return c.json({ error: data?.message ?? "Transak API error" }, 502);
  return c.json(data);
});

// POST /transak/otp/send - send OTP to user email
app.post("/transak/otp/send", async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "email required" }, 400);

  const { ok, data } = await transakFetch("/api/v2/user/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!ok) return c.json({ error: data?.message ?? "OTP 전송 실패" }, 502);
  return c.json(data);
});

// POST /transak/otp/verify - verify OTP and get access token
app.post("/transak/otp/verify", async (c) => {
  const body = await c.req.json();
  const { email, otp, stateToken } = body;
  if (!email || !otp || !stateToken) return c.json({ error: "email, otp, stateToken required" }, 400);

  const { ok, data } = await transakFetch("/api/v2/user/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp, stateToken }),
  });
  if (!ok) return c.json({ error: data?.message ?? "OTP 인증 실패" }, 502);
  return c.json(data);
});

// GET /transak/user - get user details + KYC status (requires accessToken in header)
app.get("/transak/user", async (c) => {
  const accessToken = c.req.header("x-transak-token");
  if (!accessToken) return c.json({ error: "x-transak-token header required" }, 401);

  const { ok, status, data } = await transakFetch("/api/v2/user", {}, accessToken);
  if (status === 401) return c.json({ error: "unauthorized", code: 401 }, 401);
  if (!ok) return c.json({ error: data?.message ?? "사용자 정보 조회 실패" }, 502);
  return c.json(data);
});

// PATCH /transak/user/kyc - submit personal + address details (Simple KYC)
app.patch("/transak/user/kyc", async (c) => {
  const accessToken = c.req.header("x-transak-token");
  if (!accessToken) return c.json({ error: "x-transak-token header required" }, 401);

  const body = await c.req.json();
  const { ok, data } = await transakFetch("/api/v2/user", {
    method: "PATCH",
    body: JSON.stringify(body),
  }, accessToken);
  if (!ok) return c.json({ error: data?.message ?? "KYC 정보 제출 실패" }, 502);
  return c.json(data);
});

// GET /transak/kyc/requirement - get KYC requirement for quote
app.get("/transak/kyc/requirement", async (c) => {
  const accessToken = c.req.header("x-transak-token");
  const quoteId = c.req.query("quoteId");
  if (!accessToken) return c.json({ error: "x-transak-token header required" }, 401);
  if (!quoteId) return c.json({ error: "quoteId required" }, 400);

  const { ok, data } = await transakFetch(`/api/v2/user/kyc-requirement?quoteId=${quoteId}`, {}, accessToken);
  if (!ok) return c.json({ error: data?.message ?? "KYC 요구사항 조회 실패" }, 502);
  return c.json(data);
});

// POST /transak/order/bank - create bank transfer order
app.post("/transak/order/bank", async (c) => {
  const accessToken = c.req.header("x-transak-token");
  if (!accessToken) return c.json({ error: "x-transak-token header required" }, 401);

  const body = await c.req.json();
  const { quoteId, walletAddress, paymentInstrumentId } = body;
  if (!quoteId || !walletAddress) return c.json({ error: "quoteId and walletAddress required" }, 400);

  const { ok, data } = await transakFetch("/api/v2/bank-transfer/order", {
    method: "POST",
    body: JSON.stringify({ quoteId, walletAddress, paymentInstrumentId: paymentInstrumentId ?? "bank_transfer" }),
  }, accessToken);
  if (!ok) return c.json({ error: data?.message ?? "주문 생성 실패" }, 502);

  // Save transaction to our DB
  if (ok && data?.data?.id) {
    const sb = getSupabase();
    await sb.from("transactions").insert({
      type: "purchase",
      amount: data.data.fiatAmount ?? 0,
      currency: data.data.fiatCurrency ?? "USD",
      status: "pending",
      payment_provider: "Transak",
      memo: data.data.id,
    }).catch(() => {});
  }

  return c.json(data);
});

// GET /transak/order/:id - poll order status
app.get("/transak/order/:id", async (c) => {
  const accessToken = c.req.header("x-transak-token");
  if (!accessToken) return c.json({ error: "x-transak-token header required" }, 401);

  const orderId = c.req.param("id");
  const { ok, data } = await transakFetch(`/api/v2/order/${orderId}`, {}, accessToken);
  if (!ok) return c.json({ error: data?.message ?? "주문 조회 실패" }, 502);
  return c.json(data);
});

// GET /transak/user/limits - get user purchase limits
app.get("/transak/user/limits", async (c) => {
  const accessToken = c.req.header("x-transak-token");
  if (!accessToken) return c.json({ error: "x-transak-token header required" }, 401);

  const paymentMethod  = c.req.query("paymentMethod")  ?? "bank_transfer";
  const fiatCurrency   = c.req.query("fiatCurrency")   ?? "USD";

  const { ok, data } = await transakFetch(
    `/api/v2/user/limits?paymentMethod=${paymentMethod}&fiatCurrency=${fiatCurrency}`,
    {}, accessToken,
  );
  if (!ok) return c.json({ error: data?.message ?? "한도 조회 실패" }, 502);
  return c.json(data);
});

Deno.serve(app.fetch);
