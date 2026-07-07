import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono().basePath("/server");

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

// Resolve the calling app-user from a Supabase JWT.
// Returns { authUserId, userId, partnerId } or null if the token is invalid/missing.
async function resolveAppUser(authHeader: string | undefined) {
  const token = (authHeader ?? "").replace("Bearer ", "").trim();
  if (!token) return null;

  const sb = getSupabase();
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;

  const { data: appUser } = await sb.from("users")
    .select("id, partner_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return {
    authUserId: user.id,
    userId: appUser?.id ?? null,
    partnerId: appUser?.partner_id ?? null,
  };
}

// Resolve the calling admin-partner from a Supabase JWT.
// Returns { isSystemAdmin, partnerRole, partnerId } or null if token is invalid.
// anon key → isSystemAdmin=true (legacy non-auth endpoints keep working for system_admin only).
async function resolveAdminCaller(authHeader: string | undefined) {
  const token = (authHeader ?? "").replace("Bearer ", "").trim();
  if (!token) return null;

  const sb = getSupabase();

  // anon key is a JWT but getUser will return null for it — treat as system_admin (no isolation)
  // To detect anon key: it has no "sub" claim or getUser fails
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) {
    // anon key or invalid — allow only if it's the public anon key (legacy)
    return { isSystemAdmin: true, partnerRole: "system_admin" as const, partnerId: null as string | null };
  }

  const appRole = user.app_metadata?.role as string | undefined;
  if (appRole === "system_admin") {
    return { isSystemAdmin: true, partnerRole: "system_admin" as const, partnerId: null as string | null };
  }

  const { data: partner } = await sb.from("partners")
    .select("id, type, parent_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!partner) return null; // unknown caller → deny

  return {
    isSystemAdmin: false,
    partnerRole: partner.type as string,
    partnerId: partner.id as string,
  };
}

// Returns a flat Set of partner IDs accessible by partnerId (self + all descendants).
async function getSubtreeIds(sb: ReturnType<typeof getSupabase>, rootId: string): Promise<Set<string>> {
  const { data: all } = await sb.from("partners").select("id, parent_id");
  const partners: { id: string; parent_id: string | null }[] = all ?? [];
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    result.add(cur);
    for (const p of partners) {
      if (p.parent_id === cur && !result.has(p.id)) queue.push(p.id);
    }
  }
  return result;
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
app.get("/health", async (c) => {
  const checks: Record<string, { latency: number; ok: boolean; error?: string }> = {};

  // Supabase DB
  const dbStart = Date.now();
  try {
    const sb = getSupabase();
    const { error } = await sb.from("users").select("id").limit(1);
    checks.supabase = { latency: Date.now() - dbStart, ok: !error, ...(error ? { error: error.message } : {}) };
  } catch (e) {
    checks.supabase = { latency: Date.now() - dbStart, ok: false, error: String(e) };
  }

  // Transak API
  const transakStart = Date.now();
  try {
    const res = await fetch(`${TRANSAK_BASE}/api/v2/currencies/crypto-currencies`, {
      headers: { "x-api-key": TRANSAK_KEY },
      signal: AbortSignal.timeout(3000),
    });
    checks.transak = { latency: Date.now() - transakStart, ok: res.ok };
  } catch (e) {
    checks.transak = { latency: Date.now() - transakStart, ok: false, error: String(e) };
  }

  // CoinGecko
  const geckoStart = Date.now();
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/ping", {
      signal: AbortSignal.timeout(3000),
    });
    checks.coingecko = { latency: Date.now() - geckoStart, ok: res.ok };
  } catch (e) {
    checks.coingecko = { latency: Date.now() - geckoStart, ok: false, error: String(e) };
  }

  const allOk = Object.values(checks).every((v) => v.ok);
  return c.json({ status: allOk ? "ok" : "degraded", checks }, allOk ? 200 : 503);
});

// Route latency registry (populated by middleware below)
const _routeStats: Record<string, { count: number; errors: number; totalMs: number; lastWindow: number }> = {};

app.use("/*", async (c, next) => {
  const key = `${c.req.method} ${c.req.routePath ?? new URL(c.req.url).pathname}`;
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const isError = c.res.status >= 400;
  const now = Math.floor(Date.now() / 60000); // 1-min window
  if (!_routeStats[key] || _routeStats[key].lastWindow !== now) {
    _routeStats[key] = { count: 0, errors: 0, totalMs: 0, lastWindow: now };
  }
  _routeStats[key].count++;
  _routeStats[key].totalMs += ms;
  if (isError) _routeStats[key].errors++;
});

app.get("/health/routes", (c) => {
  const routes = Object.entries(_routeStats).map(([route, s]) => {
    const [method, ...pathParts] = route.split(" ");
    return {
      method,
      path: pathParts.join(" "),
      latency: s.count ? Math.round(s.totalMs / s.count) : 0,
      rps: +(s.count / 60).toFixed(3),
      errorRate: s.count ? +(s.errors / s.count).toFixed(3) : 0,
    };
  });
  return c.json(routes);
});

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
  const caller = await resolveAdminCaller(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "unauthorized" }, 401);

  const sb = getSupabase();
  const search = c.req.query("search") ?? "";
  const status = c.req.query("status") ?? "";

  let q = sb.from("users").select("*").order("joined_at", { ascending: false });
  if (search) q = q.or(`email.ilike.%${search}%,wallet_address.ilike.%${search}%`);
  if (status && status !== "all") q = q.eq("status", status);

  if (!caller.isSystemAdmin && caller.partnerId) {
    // Non-system-admin: only see users under their subtree, with a partner_id assigned
    const subtree = await getSubtreeIds(sb, caller.partnerId);
    q = q.in("partner_id", Array.from(subtree));
  } else if (!caller.isSystemAdmin) {
    // Partner with no own ID somehow — return empty
    return c.json([]);
  }

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.post("/users", async (c) => {
  const sb = getSupabase();
  const body = await c.req.json();

  // 이메일 중복 체크: partners 테이블에 같은 이메일 존재 여부 확인
  if (body.email) {
    const { data: existingPartner } = await sb.from("partners").select("id").eq("email", body.email).maybeSingle();
    if (existingPartner) return c.json({ error: `이미 파트너 계정으로 등록된 이메일입니다: ${body.email}` }, 409);
  }

  // auth_user_id and partner_id are accepted from the app at registration time
  const { data, error } = await sb.from("users").insert({
    email:         body.email,
    wallet_address: body.wallet_address ?? null,
    status:        body.status ?? "pending_approval",
    kyc_tier:      body.kyc_tier ?? "T0",
    role:          body.role ?? "user",
    auth_user_id:  body.auth_user_id ?? null,
    partner_id:    body.partner_id ?? null,
  }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

app.patch("/users/:id", async (c) => {
  const sb = getSupabase();
  const { data, error } = await sb.from("users").update(await c.req.json()).eq("id", c.req.param("id")).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

app.post("/users/:id/approve", async (c) => {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .update({ status: "active" })
    .eq("id", c.req.param("id"))
    .eq("status", "pending_approval")
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "User not found or not pending approval" }, 404);
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
  const caller = await resolveAdminCaller(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "unauthorized" }, 401);

  const sb = getSupabase();
  const type = c.req.query("type") ?? "";
  let q = sb.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
  if (type && type !== "all") q = q.eq("type", type);

  if (!caller.isSystemAdmin && caller.partnerId) {
    const subtree = await getSubtreeIds(sb, caller.partnerId);
    q = q.in("partner_id", Array.from(subtree));
  }

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

// Returns the partner record for the currently logged-in user (via JWT)
app.get("/partners/me", async (c) => {
  const sb = getSupabase();
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return c.json({ role: "system_admin", partner: null });

  const { data: { user }, error: userError } = await sb.auth.getUser(token);
  if (userError || !user) return c.json({ role: "system_admin", partner: null });

  // Check if user is a system_admin via app_metadata
  const appRole = user.app_metadata?.role as string | undefined;
  if (appRole === "system_admin") return c.json({ role: "system_admin", partner: null });

  const { data: partner } = await sb.from("partners")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!partner) return c.json({ error: "forbidden" }, 403);
  return c.json({ role: partner.type as string, partner });
});

app.get("/partners", async (c) => {
  const caller = await resolveAdminCaller(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "unauthorized" }, 401);

  const sb = getSupabase();
  const type   = c.req.query("type") ?? "";
  const status = c.req.query("status") ?? "";

  let q = sb.from("partners").select("*, parent:parent_id(id, name, code, type, fee_rate, parent_id)").order("created_at");
  if (type   && type   !== "all") q = q.eq("type", type);
  if (status && status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);

  // Enrich with computed parent/grandparent names
  let all = data ?? [];
  const byId = Object.fromEntries(all.map((p: any) => [p.id, p]));

  // Org isolation: non-system-admin only sees their own subtree
  if (!caller.isSystemAdmin && caller.partnerId) {
    const subtree = await getSubtreeIds(sb, caller.partnerId);
    all = all.filter((p: any) => subtree.has(p.id));
  }

  const enriched = all.map((p: any) => {
    const parent = p.parent ?? null;
    const grandparent = parent ? (byId[parent.parent_id] ?? null) : null;
    return {
      ...p,
      parent_name:      parent?.name ?? null,
      grandparent_name: grandparent?.name ?? null,
      sub_count: all.filter((x: any) => x.parent_id === p.id).length,
    };
  });

  return c.json(enriched);
});

app.post("/partners", async (c) => {
  const sb   = getSupabase();
  const body = await c.req.json();

  // 이메일 중복 체크: public.users 테이블에 같은 이메일 존재 여부 확인
  if (body.email) {
    const { data: existingUser } = await sb.from("users").select("id").eq("email", body.email).maybeSingle();
    if (existingUser) return c.json({ error: `이미 일반 회원으로 등록된 이메일입니다: ${body.email}` }, 409);
  }

  // Create Supabase Auth user if email + password provided
  let authUserId: string | null = null;
  if (body.email && body.password) {
    const { data: authData, error: authError } = await sb.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name, partner_code: body.code, partner_type: body.type },
      app_metadata: { role: "partner", partner_type: body.type },
    });
    if (authError) return c.json({ error: `Auth 계정 생성 실패: ${authError.message}` }, 500);
    authUserId = authData.user?.id ?? null;
  }

  const { data, error } = await sb.from("partners").insert({
    name:       body.name,
    code:       body.code,
    type:       body.type,
    parent_id:  body.parent_id || null,
    fee_rate:   body.fee_rate ?? 0,
    status:     body.status ?? "active",
    phone:      body.contact ?? body.phone ?? null,
    email:      body.email ?? null,
    address:    body.address ?? null,
    region:     body.region ?? null,
    bank_name:  body.bank_name ?? null,
    bank_account: body.bank_account ?? null,
    bank_holder:  body.bank_holder ?? null,
    auth_user_id: authUserId,
  }).select().single();

  if (error) {
    // Roll back Auth user if DB insert fails
    if (authUserId) await sb.auth.admin.deleteUser(authUserId);
    return c.json({ error: error.message }, 500);
  }
  return c.json(data, 201);
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
  const caller = await resolveAdminCaller(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "unauthorized" }, 401);

  const sb        = getSupabase();
  const partnerId = c.req.query("partner_id") ?? "";
  const status    = c.req.query("status") ?? "";
  const dateFrom  = c.req.query("date_from") ?? "";
  const dateTo    = c.req.query("date_to") ?? "";

  let q = sb.from("settlements").select(`
    *,
    partner:partner_id(id, name, code, type, parent_id,
      parent:parent_id(id, name, type,
        parent:parent_id(id, name, type)
      )
    )
  `).order("created_at", { ascending: false }).limit(500);

  if (partnerId) q = q.eq("partner_id", partnerId);
  if (status && status !== "all") q = q.eq("status", status);
  if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00+09:00`);
  if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59+09:00`);

  if (!caller.isSystemAdmin && caller.partnerId) {
    const subtree = await getSubtreeIds(sb, caller.partnerId);
    q = q.in("partner_id", Array.from(subtree));
  }

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

  // Identify the calling app-user so we can attribute the transaction
  const caller = await resolveAppUser(c.req.header("Authorization"));

  const body = await c.req.json();
  const { quoteId, walletAddress, paymentInstrumentId } = body;
  if (!quoteId || !walletAddress) return c.json({ error: "quoteId and walletAddress required" }, 400);

  const { ok, data } = await transakFetch("/api/v2/bank-transfer/order", {
    method: "POST",
    body: JSON.stringify({ quoteId, walletAddress, paymentInstrumentId: paymentInstrumentId ?? "bank_transfer" }),
  }, accessToken);
  if (!ok) return c.json({ error: data?.message ?? "주문 생성 실패" }, 502);

  // Save transaction to our DB with user and partner attribution
  if (ok && data?.data?.id) {
    const sb = getSupabase();
    await sb.from("transactions").insert({
      type: "purchase",
      user_id: caller?.userId ?? null,
      partner_id: caller?.partnerId ?? null,
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

// ─── Wallet ────────────────────────────────────────────────────────────────────

// GET /wallet/status - 내 지갑 상태 조회 (앱용)
app.get("/wallet/status", async (c) => {
  const caller = await resolveAppUser(c.req.header("Authorization"));
  if (!caller?.userId) return c.json({ error: "unauthorized" }, 401);

  const sb = getSupabase();
  const { data: user } = await sb.from("users")
    .select("wallet_status")
    .eq("id", caller.userId)
    .single();

  const { data: wallets } = await sb.from("wallets")
    .select("chain_name, chain_id, network, address, derivation_path, is_primary, created_at")
    .eq("user_id", caller.userId)
    .order("is_primary", { ascending: false });

  return c.json({
    wallet_status: user?.wallet_status ?? "none",
    wallets: wallets ?? [],
  });
});

// POST /wallet/register - 앱에서 생성한 주소를 서버에 등록 (non-custodial: 주소만 저장)
// Body: { wallets: [{ chain_name, chain_id, network, address, derivation_path, is_primary }] }
app.post("/wallet/register", async (c) => {
  const caller = await resolveAppUser(c.req.header("Authorization"));
  if (!caller?.userId) return c.json({ error: "unauthorized" }, 401);

  const sb = getSupabase();

  const { data: user } = await sb.from("users")
    .select("wallet_status, status")
    .eq("id", caller.userId)
    .single();

  if (!user) return c.json({ error: "사용자를 찾을 수 없습니다." }, 404);
  if (user.status !== "active") return c.json({ error: "계정 승인 후 지갑을 생성할 수 있습니다." }, 403);
  if (user.wallet_status === "active") {
    return c.json({ error: "이미 지갑이 등록되어 있습니다." }, 409);
  }

  const body = await c.req.json();
  const entries: any[] = body.wallets ?? [];
  if (!entries.length) return c.json({ error: "wallets 배열이 필요합니다." }, 400);

  // 필수 필드 검증
  for (const w of entries) {
    if (!w.chain_name || !w.address || !w.derivation_path) {
      return c.json({ error: "chain_name, address, derivation_path 은 필수입니다." }, 400);
    }
    // EVM 주소 형식 검증 (0x + 40 hex)
    if (w.chain_id && !/^0x[0-9a-fA-F]{40}$/.test(w.address)) {
      return c.json({ error: `유효하지 않은 EVM 주소: ${w.address}` }, 400);
    }
  }

  const rows = entries.map((w) => ({
    user_id:         caller.userId,
    chain_name:      w.chain_name,
    chain_id:        w.chain_id ?? null,
    network:         w.network ?? "mainnet",
    address:         w.address,
    derivation_path: w.derivation_path,
    is_primary:      w.is_primary ?? false,
  }));

  const { data: inserted, error } = await sb.from("wallets")
    .upsert(rows, { onConflict: "user_id,chain_name,network" })
    .select();

  if (error) return c.json({ error: error.message }, 500);

  const primary = entries.find((w) => w.chain_name === "polygon" && w.is_primary) ?? entries[0];
  const { error: updateErr } = await sb.from("users")
    .update({
      wallet_status:  "active",
      wallet_address: primary.address,
    })
    .eq("id", caller.userId);

  if (updateErr) return c.json({ error: updateErr.message }, 500);

  return c.json({ ok: true, wallets: inserted }, 201);
});

// GET /admin/wallets - 전체 지갑 목록 (어드민용)
app.get("/admin/wallets", async (c) => {
  const caller = await resolveAdminCaller(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "unauthorized" }, 401);

  const sb = getSupabase();
  const search = c.req.query("search") ?? "";
  const status = c.req.query("wallet_status") ?? "";

  let q = sb.from("users")
    .select("id, email, wallet_status, joined_at, wallets(chain_name, chain_id, network, address, derivation_path, is_primary, created_at)")
    .order("joined_at", { ascending: false });

  if (search) q = q.ilike("email", `%${search}%`);
  if (status) q = q.eq("wallet_status", status);

  if (!caller.isSystemAdmin && caller.partnerId) {
    const subtree = await getSubtreeIds(sb, caller.partnerId);
    q = q.in("partner_id", Array.from(subtree));
  } else if (!caller.isSystemAdmin) {
    return c.json([]);
  }

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

Deno.serve(app.fetch);
