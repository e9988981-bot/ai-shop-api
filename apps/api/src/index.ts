/**
 * ai-shop API - Cloudflare Worker
 * Multi-tenant: Host header -> shop domain -> shop_id
 * Every query MUST filter by shop_id.
 */

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  SESSION_SECRET?: string;
}

const UPLOAD_TOKEN_MAX_AGE = 60 * 5; // 5 minutes

// --- Helpers ---
function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, '');
}

/** Extract hostname only (for bootstrap domain field). Accepts full URL or hostname. */
function normalizeDomain(input: string): string {
  const s = input.trim().toLowerCase().replace(/\/+$/, '').replace(/:\d+$/, '');
  if (!s) return s;
  try {
    const url = s.startsWith('http://') || s.startsWith('https://') ? new URL(s) : new URL('https://' + s);
    return url.hostname;
  } catch {
    return s;
  }
}

function json<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
}

function apiSuccess<T>(data: T) {
  return json({ ok: true, data });
}

function apiError(message: string, status = 400) {
  return json({ ok: false, error: message }, { status });
}

// --- Password hashing (PBKDF2-SHA256) ---
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return `${saltB64}:${hashB64}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return hashB64 === expected;
}

// --- Session ---
const SESSION_COOKIE = 'ai_shop_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function createSession(env: Env, userId: number, shopId: number): Promise<string> {
  const secret = env.SESSION_SECRET || 'dev-secret-change-in-production';
  const payload = JSON.stringify({ userId, shopId, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(enc.encode(secret)).slice(0, 32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(payload)
  );
  const token = btoa(payload) + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)));
  return token;
}

async function verifySession(env: Env, token: string): Promise<{ userId: number; shopId: number } | null> {
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;
  const payload = atob(payloadB64);
  const data = JSON.parse(payload);
  if (data.exp && Date.now() > data.exp) return null;
  const secret = env.SESSION_SECRET || 'dev-secret-change-in-production';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(enc.encode(secret)).slice(0, 32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  if (sigB64 !== expected) return null;
  return { userId: data.userId, shopId: data.shopId };
}

// --- Rate limit (in-memory per colo) ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_RATE_WINDOW = 60 * 1000; // 1 min
const LOGIN_RATE_MAX = 5;

function checkLoginRate(ip: string): boolean {
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW });
    return true;
  }
  if (now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= LOGIN_RATE_MAX;
}

// --- Tenant resolution ---
async function resolveShop(db: D1Database, host: string): Promise<{ id: number } | null> {
  const h = normalizeHost(host);
  const row = await db.prepare('SELECT id FROM shops WHERE domain = ?').bind(h).first<{ id: number }>();
  return row;
}

// --- CSRF / Origin check ---
function checkOrigin(request: Request, host: string): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // Same-origin request (no Origin)
  try {
    const o = new URL(origin);
    const h = normalizeHost(request.headers.get('Host') || '');
    return o.host.toLowerCase() === h;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const host = request.headers.get('Host') || '';

    // CORS for same-origin; allow API subdomain/domain
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
    const origin = request.headers.get('Origin');
    const isBootstrap = url.pathname === '/api/admin/bootstrap' || url.pathname === '/api/admin/bootstrap/';
    // CORS: allow same-origin; for bootstrap POST allow cross-origin (Pages vs Worker on different domains)
    if (origin && (checkOrigin(request, host) || (isBootstrap && request.method === 'POST'))) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const shop = await resolveShop(env.DB, host);
    if (!shop && !isBootstrap && (url.pathname.startsWith('/api/public') || url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/api/auth'))) {
      return json({ ok: false, error: 'Shop not found' }, { status: 404, headers: corsHeaders });
    }

    try {
      let res: Response;

      if (url.pathname.startsWith('/api/public/')) {
        res = await handlePublic(request, env, url, shop!.id, corsHeaders);
      } else if (url.pathname.startsWith('/api/auth/')) {
        res = await handleAuth(request, env, url, shop!.id, corsHeaders);
      } else if (url.pathname.startsWith('/api/admin/')) {
        if (!isBootstrap && !checkOrigin(request, host) && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
          res = apiError('Invalid origin', 403);
        } else {
          res = await handleAdmin(request, env, url, shop?.id ?? 0, corsHeaders);
        }
      } else {
        res = json({ ok: false, error: 'Not found' }, { status: 404 });
      }

      for (const [k, v] of Object.entries(corsHeaders)) {
        res.headers.set(k, v);
      }
      return res;
    } catch (e) {
      console.error(e);
      return json({ ok: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
  },
};

async function handlePublic(
  request: Request,
  env: Env,
  url: URL,
  shopId: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/public\/?/, '');

  const imagesMatch = path.match(/^images\/(.+)$/);
  if (imagesMatch && request.method === 'GET') {
    const key = decodeURIComponent(imagesMatch[1]);
    if (!key.startsWith('uploads/')) return apiError('Invalid key', 400);
    const parts = key.split('/');
    if (parts[1] && Number(parts[1]) !== shopId) return apiError('Forbidden', 403);
    const obj = await env.BUCKET.get(key);
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'Content-Type': (obj.httpMetadata?.contentType as string) || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  }

  if (path === 'shop' && request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT id, domain, name_lo, name_en, desc_lo, desc_en, avatar_key, cover_key, theme_primary, theme_secondary, wa_template FROM shops WHERE id = ?'
    )
      .bind(shopId)
      .first();
    if (!row) return apiError('Shop not found', 404);
    return apiSuccess(row);
  }

  if (path === 'categories' && request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, name_lo, name_en, sort_order FROM categories WHERE shop_id = ? ORDER BY sort_order'
    )
      .bind(shopId)
      .all();
    return apiSuccess(results);
  }

  if (path === 'products' && request.method === 'GET') {
    const categoryId = url.searchParams.get('category_id');
    const search = url.searchParams.get('search') || '';
    let q = `SELECT p.id, p.shop_id, p.category_id, p.slug, p.name_lo, p.name_en, p.desc_lo, p.desc_en, p.price, p.status, p.cover_image_id, p.created_at, p.updated_at
      FROM products p WHERE p.shop_id = ? AND p.status = 'published'`;
    const args: (string | number)[] = [shopId];
    if (categoryId) {
      q += ' AND p.category_id = ?';
      args.push(Number(categoryId));
    }
    if (search) {
      q += ' AND (p.name_lo LIKE ? OR p.name_en LIKE ?)';
      const s = `%${search}%`;
      args.push(s, s);
    }
    q += ' ORDER BY p.updated_at DESC';
    const stmt = env.DB.prepare(q);
    const { results } = await stmt.bind(...args).all();
    const products = results as unknown[];
    const withImages = await Promise.all(
      products.map(async (p: Record<string, unknown>) => {
        if (p.cover_image_id) {
          const img = await env.DB.prepare('SELECT r2_key FROM product_images WHERE id = ? AND shop_id = ?')
            .bind(p.cover_image_id, shopId)
            .first();
          return { ...p, cover_image: (img as Record<string, unknown>)?.r2_key || null };
        }
        return { ...p, cover_image: null };
      })
    );
    return apiSuccess(withImages);
  }

  const productSlugMatch = path.match(/^products\/([^/]+)\/?$/);
  if (productSlugMatch && request.method === 'GET') {
    const slug = productSlugMatch[1];
    const product = await env.DB.prepare(
      `SELECT p.*, c.name_lo as cat_name_lo, c.name_en as cat_name_en FROM products p
       LEFT JOIN categories c ON p.category_id = c.id AND c.shop_id = p.shop_id
       WHERE p.shop_id = ? AND p.slug = ? AND p.status = 'published'`
    )
      .bind(shopId, slug)
      .first();
    if (!product) return apiError('Product not found', 404);
    const p = product as Record<string, unknown>;
    const images = await env.DB.prepare(
      'SELECT id, r2_key, sort_order FROM product_images WHERE product_id = ? AND shop_id = ? ORDER BY sort_order'
    )
      .bind(p.id, shopId)
      .all();
    const groups = await env.DB.prepare(
      'SELECT id, name_lo, name_en, is_required, sort_order FROM option_groups WHERE product_id = ? AND shop_id = ? ORDER BY sort_order'
    )
      .bind(p.id, shopId)
      .all();
    const groupIds = (groups.results as { id: number }[]).map((g) => g.id);
    let values: { group_id: number; id: number; value_lo: string; value_en: string; sort_order: number }[] = [];
    if (groupIds.length) {
      const vals = await env.DB.prepare(
        `SELECT id, group_id, value_lo, value_en, sort_order FROM option_values WHERE group_id IN (${groupIds.join(',')}) AND shop_id = ? ORDER BY group_id, sort_order`
      )
        .bind(shopId)
        .all();
      values = vals.results as { group_id: number; id: number; value_lo: string; value_en: string; sort_order: number }[];
    }
    const optionGroups = (groups.results as { id: number; name_lo: string; name_en: string; is_required: number; sort_order: number }[]).map((g) => ({
      ...g,
      is_required: !!g.is_required,
      values: values.filter((v) => v.group_id === g.id),
    }));
    const waNumbers = await env.DB.prepare(
      'SELECT id, label, phone_e164 FROM wa_numbers WHERE shop_id = ? AND is_active = 1 ORDER BY is_default DESC'
    )
      .bind(shopId)
      .all();
    return apiSuccess({
      ...p,
      images: images.results,
      option_groups: optionGroups,
      wa_numbers: waNumbers.results,
    });
  }

  if (path === 'orders' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { orderPublicSchema } = await import('@ai-shop/shared');
    const parsed = orderPublicSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors.map((e) => e.message).join(', '), 400);
    }
    const d = parsed.data;
    const product = await env.DB.prepare('SELECT id, name_lo, name_en, price FROM products WHERE id = ? AND shop_id = ?')
      .bind(d.product_id, shopId)
      .first();
    if (!product) return apiError('Product not found', 404);
    const waNum = await env.DB.prepare('SELECT id, phone_e164 FROM wa_numbers WHERE id = ? AND shop_id = ? AND is_active = 1')
      .bind(d.wa_number_id, shopId)
      .first();
    if (!waNum) return apiError('WhatsApp number not found', 404);
    const shopRow = await env.DB.prepare('SELECT name_lo, name_en, wa_template FROM shops WHERE id = ?').bind(shopId).first();
    const shop = shopRow as { name_lo: string; name_en: string; wa_template: string | null };
    const prod = product as { name_lo: string; name_en: string; price: number };
    const wa = waNum as { phone_e164: string };
    let template = shop.wa_template || 'Hi! I would like to order:\nProduct: {{product_name}}\nQuantity: {{qty}}\nPrice: {{price}}\n\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nAddress: {{customer_address}}\nNote: {{note}}';
    const msg = template
      .replace(/\{\{product_name\}\}/g, prod.name_en || prod.name_lo)
      .replace(/\{\{qty\}\}/g, String(d.qty))
      .replace(/\{\{price\}\}/g, String(prod.price))
      .replace(/\{\{customer_name\}\}/g, d.customer_name)
      .replace(/\{\{customer_phone\}\}/g, d.customer_phone)
      .replace(/\{\{customer_address\}\}/g, d.customer_address)
      .replace(/\{\{note\}\}/g, d.note);
    const opts = typeof d.selected_options === 'object' && d.selected_options !== null ? d.selected_options : {};
    const optsStr = Object.entries(opts).length ? '\nOptions: ' + JSON.stringify(opts) : '';
    const waMessage = msg + optsStr;
    const phone = wa.phone_e164.replace(/\D/g, '');
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
    await env.DB.prepare(
      `INSERT INTO orders (shop_id, product_id, wa_number_id, customer_name, customer_phone, customer_address, qty, note, selected_options_json, wa_message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`
    )
      .bind(
        shopId,
        d.product_id,
        d.wa_number_id,
        d.customer_name,
        d.customer_phone,
        d.customer_address || '',
        d.qty,
        d.note || '',
        JSON.stringify(opts),
        waMessage,
      )
      .run();
    return apiSuccess({ wa_url: waUrl });
  }

  return apiError('Not found', 404);
}

async function handleAuth(
  request: Request,
  env: Env,
  url: URL,
  shopId: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/auth\/?/, '');

  if (path === 'login' && request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    if (!checkLoginRate(ip)) {
      return apiError('Too many attempts. Try again later.', 429);
    }
    const body = await request.json().catch(() => ({}));
    const { loginSchema } = await import('@ai-shop/shared');
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid email or password', 401);
    }
    const { email, password } = parsed.data;
    const user = await env.DB.prepare(
      'SELECT id, shop_id, password_hash FROM users WHERE shop_id = ? AND email = ?'
    )
      .bind(shopId, email)
      .first();
    if (!user) {
      return apiError('Invalid email or password', 401);
    }
    const u = user as { id: number; shop_id: number; password_hash: string };
    const ok = await verifyPassword(password, u.password_hash);
    if (!ok) return apiError('Invalid email or password', 401);
    await env.DB.prepare('UPDATE users SET last_login_at = datetime("now") WHERE id = ?').bind(u.id).run();
    const token = await createSession(env, u.id, u.shop_id);
    const res = apiSuccess({ userId: u.id, shopId: u.shop_id });
    res.headers.set(
      'Set-Cookie',
      `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`
    );
    return res;
  }

  if (path === 'logout' && request.method === 'POST') {
    const res = apiSuccess({});
    res.headers.set('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return res;
  }

  if (path === 'me' && request.method === 'GET') {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    const token = match ? match[1] : null;
    if (!token) return apiError('Unauthorized', 401);
    const sess = await verifySession(env, token);
    if (!sess || sess.shopId !== shopId) return apiError('Unauthorized', 401);
    const user = await env.DB.prepare(
      'SELECT id, shop_id, email, role, created_at, last_login_at FROM users WHERE id = ? AND shop_id = ?'
    )
      .bind(sess.userId, shopId)
      .first();
    if (!user) return apiError('Unauthorized', 401);
    return apiSuccess(user);
  }

  return apiError('Not found', 404);
}

async function requireAuth(request: Request, env: Env, shopId: number): Promise<{ userId: number } | null> {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const token = match ? match[1] : null;
  if (!token) return null;
  const sess = await verifySession(env, token);
  if (!sess || sess.shopId !== shopId) return null;
  return { userId: sess.userId };
}

async function handleAdmin(
  request: Request,
  env: Env,
  url: URL,
  shopId: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const path = url.pathname.replace(/^\/api\/admin\/?/, '');

  if (path === 'bootstrap' && request.method === 'POST') {
    const countResult = await env.DB.prepare('SELECT COUNT(*) as c FROM users').first<{ c: number }>();
    const count = countResult?.c ?? 0;
    if (count > 0) {
      return apiError('Bootstrap is disabled. Users already exist.', 403);
    }
    const body = await request.json().catch(() => ({}));
    const { bootstrapSchema } = await import('@ai-shop/shared');
    const parsed = bootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors.map((e) => e.message).join(', '), 400);
    }
    const d = parsed.data;
    const domain = normalizeDomain(d.domain);
    if (!domain) return apiError('Invalid domain', 400);
    const existing = await env.DB.prepare('SELECT id FROM shops WHERE domain = ?').bind(domain).first();
    if (existing) return apiError('Domain already exists', 400);
    const hash = await hashPassword(d.password);
    const result = await env.DB.prepare(
      'INSERT INTO shops (domain, name_lo, name_en, desc_lo, desc_en) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(domain, d.shop_name_lo, d.shop_name_en, null, null)
      .run();
    const shopIdNew = result.meta.last_row_id;
    await env.DB.prepare(
      'INSERT INTO users (shop_id, email, password_hash, role) VALUES (?, ?, ?, ?)'
    )
      .bind(shopIdNew, d.email, hash, 'owner')
      .run();
    return apiSuccess({ shopId: shopIdNew, message: 'Bootstrap complete. Login to continue.' });
  }

  const auth = await requireAuth(request, env, shopId);
  if (!auth && path !== 'bootstrap') {
    return apiError('Unauthorized', 401);
  }

  if (path === 'shop' && request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT id, domain, name_lo, name_en, desc_lo, desc_en, avatar_key, cover_key, theme_primary, theme_secondary, wa_template FROM shops WHERE id = ?'
    )
      .bind(shopId)
      .first();
    if (!row) return apiError('Shop not found', 404);
    return apiSuccess(row);
  }

  if (path === 'shop' && request.method === 'PUT') {
    const body = await request.json().catch(() => ({}));
    const { shopUpdateSchema } = await import('@ai-shop/shared');
    const parsed = shopUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message, 400);
    const d = parsed.data;
    const updates: string[] = [];
    const vals: unknown[] = [];
    if (d.name_lo !== undefined) { updates.push('name_lo = ?'); vals.push(d.name_lo); }
    if (d.name_en !== undefined) { updates.push('name_en = ?'); vals.push(d.name_en); }
    if (d.desc_lo !== undefined) { updates.push('desc_lo = ?'); vals.push(d.desc_lo); }
    if (d.desc_en !== undefined) { updates.push('desc_en = ?'); vals.push(d.desc_en); }
    if (d.avatar_key !== undefined) { updates.push('avatar_key = ?'); vals.push(d.avatar_key); }
    if (d.cover_key !== undefined) { updates.push('cover_key = ?'); vals.push(d.cover_key); }
    if (d.theme_primary !== undefined) { updates.push('theme_primary = ?'); vals.push(d.theme_primary); }
    if (d.theme_secondary !== undefined) { updates.push('theme_secondary = ?'); vals.push(d.theme_secondary); }
    if (d.wa_template !== undefined) { updates.push('wa_template = ?'); vals.push(d.wa_template); }
    if (updates.length) {
      vals.push(shopId);
      await env.DB.prepare(`UPDATE shops SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    }
    const row = await env.DB.prepare(
      'SELECT id, domain, name_lo, name_en, desc_lo, desc_en, avatar_key, cover_key, theme_primary, theme_secondary, wa_template FROM shops WHERE id = ?'
    )
      .bind(shopId)
      .first();
    return apiSuccess(row);
  }

  if (path === 'wa-numbers' && request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT id, shop_id, label, phone_e164, is_default, is_active, created_at FROM wa_numbers WHERE shop_id = ? ORDER BY is_default DESC, id'
    )
      .bind(shopId)
      .all();
    const list = (rows.results as Record<string, unknown>[]).map((r) => ({
      ...r,
      is_default: !!r.is_default,
      is_active: !!r.is_active,
    }));
    return apiSuccess(list);
  }

  if (path === 'wa-numbers' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { waNumberSchema } = await import('@ai-shop/shared');
    const parsed = waNumberSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message, 400);
    const d = parsed.data;
    if (d.is_default) {
      await env.DB.prepare('UPDATE wa_numbers SET is_default = 0 WHERE shop_id = ?').bind(shopId).run();
    }
    const result = await env.DB.prepare(
      'INSERT INTO wa_numbers (shop_id, label, phone_e164, is_default, is_active) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(shopId, d.label, d.phone_e164, d.is_default ? 1 : 0, d.is_active !== false ? 1 : 0)
      .run();
    const row = await env.DB.prepare('SELECT * FROM wa_numbers WHERE id = ?').bind(result.meta.last_row_id).first();
    return apiSuccess(row);
  }

  const waNumIdMatch = path.match(/^wa-numbers\/(\d+)\/?$/);
  if (waNumIdMatch) {
    const id = Number(waNumIdMatch[1]);
    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const { waNumberSchema } = await import('@ai-shop/shared');
      const parsed = waNumberSchema.partial().safeParse(body);
      if (!parsed.success) return apiError(parsed.error.message, 400);
      const d = parsed.data;
      if (d.is_default) {
        await env.DB.prepare('UPDATE wa_numbers SET is_default = 0 WHERE shop_id = ?').bind(shopId).run();
      }
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (d.label !== undefined) { updates.push('label = ?'); vals.push(d.label); }
      if (d.phone_e164 !== undefined) { updates.push('phone_e164 = ?'); vals.push(d.phone_e164); }
      if (d.is_default !== undefined) { updates.push('is_default = ?'); vals.push(d.is_default ? 1 : 0); }
      if (d.is_active !== undefined) { updates.push('is_active = ?'); vals.push(d.is_active ? 1 : 0); }
      if (updates.length) {
        vals.push(id, shopId);
        await env.DB.prepare(`UPDATE wa_numbers SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`).bind(...vals).run();
      }
      const row = await env.DB.prepare('SELECT * FROM wa_numbers WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
      return apiSuccess(row);
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM wa_numbers WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
      return apiSuccess({});
    }
  }

  if (path === 'categories' && request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT id, shop_id, name_lo, name_en, sort_order FROM categories WHERE shop_id = ? ORDER BY sort_order, id'
    )
      .bind(shopId)
      .all();
    return apiSuccess(rows.results);
  }

  if (path === 'categories' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { categorySchema } = await import('@ai-shop/shared');
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message, 400);
    const d = parsed.data;
    const sortOrder = d.sort_order ?? (await env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM categories WHERE shop_id = ?').bind(shopId).first<{ next: number }>())?.next ?? 0;
    const result = await env.DB.prepare(
      'INSERT INTO categories (shop_id, name_lo, name_en, sort_order) VALUES (?, ?, ?, ?)'
    )
      .bind(shopId, d.name_lo, d.name_en, sortOrder)
      .run();
    const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(result.meta.last_row_id).first();
    return apiSuccess(row);
  }

  const catIdMatch = path.match(/^categories\/(\d+)\/?$/);
  if (catIdMatch) {
    const id = Number(catIdMatch[1]);
    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const { categorySchema } = await import('@ai-shop/shared');
      const parsed = categorySchema.partial().safeParse(body);
      if (!parsed.success) return apiError(parsed.error.message, 400);
      const d = parsed.data;
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (d.name_lo !== undefined) { updates.push('name_lo = ?'); vals.push(d.name_lo); }
      if (d.name_en !== undefined) { updates.push('name_en = ?'); vals.push(d.name_en); }
      if (d.sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(d.sort_order); }
      if (updates.length) {
        vals.push(id, shopId);
        await env.DB.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`).bind(...vals).run();
      }
      const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
      return apiSuccess(row);
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('UPDATE products SET category_id = NULL WHERE category_id = ? AND shop_id = ?').bind(id, shopId).run();
      await env.DB.prepare('DELETE FROM categories WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
      return apiSuccess({});
    }
  }

  if (path === 'products' && request.method === 'GET') {
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');
    const categoryId = url.searchParams.get('category_id');
    let q = 'FROM products WHERE shop_id = ?';
    const args: (string | number)[] = [shopId];
    if (status) { q += ' AND status = ?'; args.push(status); }
    if (categoryId) { q += ' AND category_id = ?'; args.push(Number(categoryId)); }
    const countRow = await env.DB.prepare(`SELECT COUNT(*) as c ${q}`).bind(...args).first<{ c: number }>();
    const total = countRow?.c ?? 0;
    const { results } = await env.DB.prepare(
      `SELECT p.*, c.name_lo as cat_name_lo, c.name_en as cat_name_en ${q}
       ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...args, limit, offset)
      .all();
    const products = results as Record<string, unknown>[];
    const withCover = await Promise.all(
      products.map(async (p) => {
        if (p.cover_image_id) {
          const img = await env.DB.prepare('SELECT r2_key FROM product_images WHERE id = ? AND shop_id = ?')
            .bind(p.cover_image_id, shopId)
            .first();
          return { ...p, cover_image: (img as Record<string, unknown>)?.r2_key || null };
        }
        return { ...p, cover_image: null };
      })
    );
    return apiSuccess({ items: withCover, total, page, limit });
  }

  if (path === 'products' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { productSchema } = await import('@ai-shop/shared');
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message, 400);
    const d = parsed.data;
    const existing = await env.DB.prepare('SELECT id FROM products WHERE shop_id = ? AND slug = ?').bind(shopId, d.slug).first();
    if (existing) return apiError('Slug already exists', 400);
    const result = await env.DB.prepare(
      'INSERT INTO products (shop_id, category_id, slug, name_lo, name_en, desc_lo, desc_en, price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        shopId,
        d.category_id ?? null,
        d.slug,
        d.name_lo,
        d.name_en,
        d.desc_lo ?? null,
        d.desc_en ?? null,
        d.price,
        d.status ?? 'draft'
      )
      .run();
    const row = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(result.meta.last_row_id).first();
    return apiSuccess(row);
  }

  const productIdMatch = path.match(/^products\/(\d+)\/?$/);
  if (productIdMatch) {
    const id = Number(productIdMatch[1]);
    if (request.method === 'GET') {
      const product = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
      if (!product) return apiError('Product not found', 404);
      const images = await env.DB.prepare('SELECT * FROM product_images WHERE product_id = ? AND shop_id = ? ORDER BY sort_order')
        .bind(id, shopId)
        .all();
      const groups = await env.DB.prepare('SELECT * FROM option_groups WHERE product_id = ? AND shop_id = ? ORDER BY sort_order')
        .bind(id, shopId)
        .all();
      const gids = (groups.results as { id: number }[]).map((g) => g.id);
      let vals: { group_id: number }[] = [];
      if (gids.length) {
        const v = await env.DB.prepare(
          `SELECT * FROM option_values WHERE group_id IN (${gids.join(',')}) AND shop_id = ? ORDER BY group_id, sort_order`
        )
          .bind(shopId)
          .all();
        vals = v.results as { group_id: number }[];
      }
      const optionGroups = (groups.results as Record<string, unknown>[]).map((g) => ({
        ...g,
        is_required: !!(g as { is_required: number }).is_required,
        values: vals.filter((v) => v.group_id === (g as { id: number }).id),
      }));
      return apiSuccess({
        ...(product as Record<string, unknown>),
        images: images.results,
        option_groups: optionGroups,
      });
    }
    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const { productSchema } = await import('@ai-shop/shared');
      const parsed = productSchema.partial().safeParse(body);
      if (!parsed.success) return apiError(parsed.error.message, 400);
      const d = parsed.data;
      const updates: string[] = [];
      const vals: unknown[] = [];
      if (d.category_id !== undefined) { updates.push('category_id = ?'); vals.push(d.category_id); }
      if (d.slug !== undefined) { updates.push('slug = ?'); vals.push(d.slug); }
      if (d.name_lo !== undefined) { updates.push('name_lo = ?'); vals.push(d.name_lo); }
      if (d.name_en !== undefined) { updates.push('name_en = ?'); vals.push(d.name_en); }
      if (d.desc_lo !== undefined) { updates.push('desc_lo = ?'); vals.push(d.desc_lo); }
      if (d.desc_en !== undefined) { updates.push('desc_en = ?'); vals.push(d.desc_en); }
      if (d.price !== undefined) { updates.push('price = ?'); vals.push(d.price); }
      if (d.status !== undefined) { updates.push('status = ?'); vals.push(d.status); }
      if (d.cover_image_id !== undefined) { updates.push('cover_image_id = ?'); vals.push(d.cover_image_id); }
      updates.push('updated_at = datetime("now")');
      vals.push(id, shopId);
      await env.DB.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`).bind(...vals).run();
      const row = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').bind(id, shopId).first();
      return apiSuccess(row);
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM product_images WHERE product_id = ? AND shop_id = ?').bind(id, shopId).run();
      await env.DB.prepare('DELETE FROM option_values WHERE group_id IN (SELECT id FROM option_groups WHERE product_id = ? AND shop_id = ?)').bind(id, shopId).run();
      await env.DB.prepare('DELETE FROM option_groups WHERE product_id = ? AND shop_id = ?').bind(id, shopId).run();
      await env.DB.prepare('DELETE FROM products WHERE id = ? AND shop_id = ?').bind(id, shopId).run();
      return apiSuccess({});
    }
  }

  const productImagesMatch = path.match(/^products\/(\d+)\/images\/?$/);
  if (productImagesMatch && request.method === 'POST') {
    const productId = Number(productImagesMatch[1]);
    const body = await request.json().catch(() => ({}));
    const { productImageAttachSchema } = await import('@ai-shop/shared');
    const parsed = productImageAttachSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message, 400);
    const { r2_key } = parsed.data;
    const maxSort = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM product_images WHERE product_id = ? AND shop_id = ?')
      .bind(productId, shopId)
      .first<{ next: number }>();
    const result = await env.DB.prepare(
      'INSERT INTO product_images (shop_id, product_id, r2_key, sort_order) VALUES (?, ?, ?, ?)'
    )
      .bind(shopId, productId, r2_key, maxSort?.next ?? 0)
      .run();
    const row = await env.DB.prepare('SELECT * FROM product_images WHERE id = ?').bind(result.meta.last_row_id).first();
    return apiSuccess(row);
  }

  const productImagesReorderMatch = path.match(/^products\/(\d+)\/images\/reorder\/?$/);
  if (productImagesReorderMatch && request.method === 'PUT') {
    const productId = Number(productImagesReorderMatch[1]);
    const body = await request.json().catch(() => ({}));
    const { productImagesReorderSchema } = await import('@ai-shop/shared');
    const parsed = productImagesReorderSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message, 400);
    for (let i = 0; i < parsed.data.image_ids.length; i++) {
      await env.DB.prepare('UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ? AND shop_id = ?')
        .bind(i, parsed.data.image_ids[i], productId, shopId)
        .run();
    }
    const rows = await env.DB.prepare('SELECT * FROM product_images WHERE product_id = ? AND shop_id = ? ORDER BY sort_order')
      .bind(productId, shopId)
      .all();
    return apiSuccess(rows.results);
  }

  if (path.startsWith('product-images/') && request.method === 'DELETE') {
    const imgId = Number(path.replace('product-images/', '').replace(/\/$/, ''));
    await env.DB.prepare('UPDATE products SET cover_image_id = NULL WHERE cover_image_id = ? AND shop_id = ?').bind(imgId, shopId).run();
    await env.DB.prepare('DELETE FROM product_images WHERE id = ? AND shop_id = ?').bind(imgId, shopId).run();
    return apiSuccess({});
  }

  const productOptionsMatch = path.match(/^products\/(\d+)\/options\/?$/);
  if (productOptionsMatch) {
    const productId = Number(productOptionsMatch[1]);
    if (request.method === 'GET') {
      const groups = await env.DB.prepare('SELECT * FROM option_groups WHERE product_id = ? AND shop_id = ? ORDER BY sort_order')
        .bind(productId, shopId)
        .all();
      const gids = (groups.results as { id: number }[]).map((g) => g.id);
      let vals: { group_id: number }[] = [];
      if (gids.length) {
        const v = await env.DB.prepare(
          `SELECT * FROM option_values WHERE group_id IN (${gids.join(',')}) AND shop_id = ? ORDER BY group_id, sort_order`
        )
          .bind(shopId)
          .all();
        vals = v.results as { group_id: number }[];
      }
      const list = (groups.results as Record<string, unknown>[]).map((g) => ({
        ...g,
        is_required: !!(g as { is_required: number }).is_required,
        values: vals.filter((v) => v.group_id === (g as { id: number }).id),
      }));
      return apiSuccess(list);
    }
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { optionGroupSchema, optionValueSchema } = await import('@ai-shop/shared');
      const groupParsed = optionGroupSchema.safeParse(body.group);
      const valueParsed = body.values ? optionValueSchema.array().safeParse(body.values) : { success: true, data: [] };
      if (!groupParsed.success) return apiError(groupParsed.error.message, 400);
      const g = groupParsed.data;
      const maxSort = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM option_groups WHERE product_id = ? AND shop_id = ?')
        .bind(productId, shopId)
        .first<{ next: number }>();
      const gResult = await env.DB.prepare(
        'INSERT INTO option_groups (shop_id, product_id, name_lo, name_en, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(shopId, productId, g.name_lo, g.name_en, g.is_required ? 1 : 0, g.sort_order ?? maxSort?.next ?? 0)
        .run();
      const groupId = gResult.meta.last_row_id;
      if (valueParsed.success && valueParsed.data.length) {
        for (let i = 0; i < valueParsed.data.length; i++) {
          const v = valueParsed.data[i];
          await env.DB.prepare(
            'INSERT INTO option_values (shop_id, group_id, value_lo, value_en, sort_order) VALUES (?, ?, ?, ?, ?)'
          )
            .bind(shopId, groupId, v.value_lo, v.value_en, v.sort_order ?? i)
            .run();
        }
      }
      const row = await env.DB.prepare('SELECT * FROM option_groups WHERE id = ?').bind(groupId).first();
      const vals = await env.DB.prepare('SELECT * FROM option_values WHERE group_id = ? AND shop_id = ? ORDER BY sort_order')
        .bind(groupId, shopId)
        .all();
      return apiSuccess({ ...(row as Record<string, unknown>), values: vals.results });
    }
  }

  const optionGroupIdMatch = path.match(/^products\/\d+\/options\/(\d+)\/?$/);
  if (optionGroupIdMatch) {
    const groupId = Number(optionGroupIdMatch[1]);
    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const { optionGroupSchema, optionValueSchema } = await import('@ai-shop/shared');
      const gParsed = optionGroupSchema.partial().safeParse(body.group || body);
      if (gParsed.success) {
        const g = gParsed.data;
        const updates: string[] = [];
        const vals: unknown[] = [];
        if (g.name_lo !== undefined) { updates.push('name_lo = ?'); vals.push(g.name_lo); }
        if (g.name_en !== undefined) { updates.push('name_en = ?'); vals.push(g.name_en); }
        if (g.is_required !== undefined) { updates.push('is_required = ?'); vals.push(g.is_required ? 1 : 0); }
        if (g.sort_order !== undefined) { updates.push('sort_order = ?'); vals.push(g.sort_order); }
        if (updates.length) {
          vals.push(groupId, shopId);
          await env.DB.prepare(`UPDATE option_groups SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`).bind(...vals).run();
        }
      }
      if (body.values && Array.isArray(body.values)) {
        const vParsed = optionValueSchema.array().safeParse(body.values);
        if (vParsed.success) {
          await env.DB.prepare('DELETE FROM option_values WHERE group_id = ? AND shop_id = ?').bind(groupId, shopId).run();
          for (let i = 0; i < vParsed.data.length; i++) {
            const v = vParsed.data[i];
            await env.DB.prepare(
              'INSERT INTO option_values (shop_id, group_id, value_lo, value_en, sort_order) VALUES (?, ?, ?, ?, ?)'
            )
              .bind(shopId, groupId, v.value_lo, v.value_en, v.sort_order ?? i)
              .run();
          }
        }
      }
      const row = await env.DB.prepare('SELECT * FROM option_groups WHERE id = ? AND shop_id = ?').bind(groupId, shopId).first();
      const vals = await env.DB.prepare('SELECT * FROM option_values WHERE group_id = ? AND shop_id = ? ORDER BY sort_order')
        .bind(groupId, shopId)
        .all();
      return apiSuccess({ ...(row as Record<string, unknown>), values: vals.results });
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM option_values WHERE group_id = ? AND shop_id = ?').bind(groupId, shopId).run();
      await env.DB.prepare('DELETE FROM option_groups WHERE id = ? AND shop_id = ?').bind(groupId, shopId).run();
      return apiSuccess({});
    }
  }

  if (path === 'uploads/sign' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const ext = (body.ext as string) || 'jpg';
    const key = `uploads/${shopId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl = `${url.origin}/api/admin/uploads/put?key=${encodeURIComponent(key)}`;
    const publicUrl = `${url.origin}/api/public/images/${encodeURIComponent(key)}`;
    return apiSuccess({ uploadUrl, r2Key: key, publicUrl });
  }

  if (path === 'uploads/put' && request.method === 'PUT') {
    const key = url.searchParams.get('key');
    if (!key || !key.startsWith(`uploads/${shopId}/`)) return apiError('Invalid key', 400);
    const arr = await request.arrayBuffer();
    await env.BUCKET.put(key, arr, {
      httpMetadata: { contentType: request.headers.get('Content-Type') || 'image/jpeg' },
    });
    return apiSuccess({ r2Key: key });
  }

  if (path.startsWith('orders') && !path.includes('export')) {
    if (path === 'orders' && request.method === 'GET') {
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
      const offset = (page - 1) * limit;
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search') || '';
      let q = 'FROM orders o JOIN products p ON o.product_id = p.id WHERE o.shop_id = ?';
      const args: (string | number)[] = [shopId];
      if (status) { q += ' AND o.status = ?'; args.push(status); }
      if (search) {
        q += ' AND (o.customer_phone LIKE ? OR o.customer_name LIKE ?)';
        const s = `%${search}%`;
        args.push(s, s);
      }
      const countRow = await env.DB.prepare(`SELECT COUNT(*) as c ${q}`).bind(...args).first<{ c: number }>();
      const total = countRow?.c ?? 0;
      const { results } = await env.DB.prepare(
        `SELECT o.*, p.name_lo as product_name_lo, p.name_en as product_name_en ${q}
         ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
      )
        .bind(...args, limit, offset)
        .all();
      return apiSuccess({ items: results, total, page, limit });
    }
    if (path === 'orders' && request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const { orderUpdateSchema } = await import('@ai-shop/shared');
      const parsed = orderUpdateSchema.safeParse(body);
      if (!parsed.success) return apiError(parsed.error.message, 400);
      const { status } = parsed.data;
      const id = url.searchParams.get('id');
      if (!id) return apiError('Missing order id', 400);
      await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ? AND shop_id = ?')
        .bind(status, Number(id), shopId)
        .run();
      const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND shop_id = ?').bind(Number(id), shopId).first();
      return apiSuccess(row);
    }
  }

  if (path === 'orders/export.csv' && request.method === 'GET') {
    const status = url.searchParams.get('status');
    let q = 'SELECT o.id, o.customer_name, o.customer_phone, o.customer_address, o.qty, o.note, o.status, o.created_at, p.name_en as product_name FROM orders o JOIN products p ON o.product_id = p.id WHERE o.shop_id = ?';
    const args: (string | number)[] = [shopId];
    if (status) { q += ' AND o.status = ?'; args.push(status); }
    q += ' ORDER BY o.created_at DESC';
    const { results } = await env.DB.prepare(q).bind(...args).all();
    const rows = results as Record<string, unknown>[];
    const header = 'id,customer_name,customer_phone,customer_address,qty,note,status,created_at,product_name';
    const lines = rows.map((r) =>
      [r.id, r.customer_name, r.customer_phone, r.customer_address, r.qty, r.note, r.status, r.created_at, r.product_name].map((v) =>
        typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${String(v).replace(/"/g, '""')}"` : v
      ).join(',')
    );
    const csv = [header, ...lines].join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=orders.csv',
      },
    });
  }

  return apiError('Not found', 404);
}
