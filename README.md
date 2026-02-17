# ai-shop: Multi-tenant Shop + WhatsApp Order System

Production-ready multi-tenant system where **each custom domain = one shop**. Built for Cloudflare (Pages + Workers + D1 + R2), deployed via **GitHub + Cloudflare Dashboard only** (no local Node.js, no wrangler CLI).

## Architecture

| Component | Technology |
|-----------|------------|
| Web (public + admin) | Next.js (App Router, static export) on **Cloudflare Pages** |
| API | **Cloudflare Worker** (separate from Pages) |
| Database | **Cloudflare D1** (SQLite) |
| Images | **Cloudflare R2** |
| Auth | Email + password, HttpOnly cookie session |
| Tenant resolution | Host header → `shops.domain` → `shop_id` |

## Repository Structure

```
/
├── apps/
│   ├── web/          # Next.js → Cloudflare Pages
│   └── api/          # Cloudflare Worker
├── packages/
│   └── shared/       # Types, Zod schemas, i18n (Lao + English)
├── schema/
│   ├── schema.sql    # D1 schema (run in D1 Console)
│   └── seed.sql      # Optional seed (or use bootstrap)
```

## Deployment (Cloudflare Dashboard + GitHub)

### Prerequisites

- Cloudflare account
- GitHub account
- Repository pushed to GitHub

---

### Step 1: Create D1 Database

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **D1 SQL Database**
2. Click **Create database**
3. Name: `ai-shop-db`
4. Click **Create**
5. Open the database → **Console** tab
6. Copy the contents of `schema/schema.sql` and paste into the console
7. Click **Execute** to create all tables
8. Copy the **Database ID** (you will need it for the Worker)

---

### Step 2: Create R2 Bucket

1. Go to **Cloudflare Dashboard** → **R2 Object Storage**
2. Click **Create bucket**
3. Name: `ai-shop-uploads`
4. Click **Create bucket**

---

### Step 3: Create Worker (API)

1. Go to **Workers & Pages** → **Create** → **Worker**
2. Name: `ai-shop-api`
3. Click **Deploy** (creates a starter worker)
4. Go to **Settings** → **Triggers** → note the Worker URL (e.g. `https://ai-shop-api.<your-subdomain>.workers.dev`)
5. Go to **Settings** → **Variables and Secrets**:
   - Add **D1 Database binding**:
     - Variable name: `DB`
     - D1 database: select `ai-shop-db`
   - Add **R2 Bucket binding**:
     - Variable name: `BUCKET`
     - R2 bucket: select `ai-shop-uploads`
   - Add **Secret** (encrypted environment variable):
     - Name: `SESSION_SECRET`
     - Value: a long random string (e.g. 32+ chars)

6. Connect to Git:
   - Go to **Workers & Pages** → **ai-shop-api** → **Settings** → **Integrations**
   - Or: **Overview** → **Configure build** / **Connect to Git**
   - If available: **Create with Git** / **Connect to Git**
   - Connect your GitHub account and select the repository
   - **Production branch**: `main`
   - **Build configuration**:
     - **Root directory**: leave empty (repository root)
     - **Build command**: `npm install && npm run build -w apps/api`
     - **Build output directory**: `apps/api/dist`
   - **Environment variables**: Ensure `SESSION_SECRET` is set in Dashboard (as secret)

7. Update `wrangler.toml` in the repo:
   - Set `database_id` under `[[d1_databases]]` to your D1 Database ID
   - Ensure `bucket_name` under `[[r2_buckets]]` is `ai-shop-uploads`

8. Manual alternative if Git integration is not available:
   - Build locally (or via CI): `npm install && npm run build -w apps/api`
   - Upload the built `apps/api/dist/worker.js` via Dashboard (Edit code → replace content)
   - Or use **Wrangler** in a CI workflow (GitHub Actions) if you prefer

---

### Step 4: Create Pages Project (Web)

1. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select your GitHub account and the `ai-shop` repository
3. **Production branch**: `main`
4. **Build configuration**:
   - **Framework preset**: Next.js (Static HTML)
   - **Root directory**: leave empty
   - **Build command**: `npm install && npm run build -w apps/web`
   - **Build output directory**: `out`
5. Add **Environment variable**:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: Your API base URL (see routing section below)
   - For same-domain routing: leave empty or set to `""`
   - For separate Worker subdomain: e.g. `https://ai-shop-api.<subdomain>.workers.dev`

6. Click **Save and Deploy**

---

### Step 5: Routing & Custom Domains

**Option A: Same domain (recommended)**

Use Cloudflare to route:

- `https://yourshop.com` → Pages (web)
- `https://yourshop.com/api/*` → Worker (API)

1. Add custom domain to **Pages** project: `yourshop.com`
2. Add a route in **Workers Routes** (or Pages Functions / _routes):
   - Route: `yourshop.com/api/*`
   - Worker: `ai-shop-api`

Or use **Cloudflare for SaaS** / **Custom Domains** to attach multiple shop domains to the same project.

**Option B: Subdomain**

- Web: `shop.yourdomain.com` (Pages)
- API: `api.yourdomain.com` (Worker)

Set `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com` in Pages environment variables.

---

### Step 6: Bootstrap First Shop

1. Add your first custom domain to the project (e.g. `myshop.pages.dev` or your custom domain)
2. Ensure the domain points to your Pages + Worker setup
3. Add the domain to the `shops` table manually, or use the bootstrap flow:
4. Visit: `https://<your-domain>/admin/bootstrap`
5. Fill in:
   - Domain (e.g. `myshop.com` or `myshop.pages.dev`)
   - Shop name (Lao + English)
   - Owner email and password (min 8 chars)
6. Click **Create Shop**
7. Log in at `/admin/login`

The bootstrap endpoint is **only enabled when the `users` table is empty**. After the first owner is created, it returns 403.

---

## Environment Variables & Secrets

| Variable        | Where    | Required | Description                          |
|----------------|----------|----------|--------------------------------------|
| `SESSION_SECRET` | Worker   | Yes      | Long random string for session signing |
| `NEXT_PUBLIC_API_URL` | Pages | No       | API base URL; leave empty for same-origin |

---

## Security

- **Password hashing**: PBKDF2-SHA256, 100,000 iterations, 16-byte salt (WebCrypto)
- **Session cookie**: `HttpOnly`, `Secure`, `SameSite=Lax`
- **CSRF**: Same-site cookie + Origin header check for POST/PUT/DELETE
- **Rate limit**: Login limited to 5 attempts per IP per minute (in-memory per colo)

---

## API Routes

### Public

- `GET /api/public/shop` – Shop info
- `GET /api/public/products` – Product list (query: `category_id`, `search`)
- `GET /api/public/products/:slug` – Product detail with images, options, WA numbers
- `POST /api/public/orders` – Create order, returns `{ wa_url }`
- `GET /api/public/images/:key` – Serve image from R2 (proxy)

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Admin (requires auth)

- `POST /api/admin/bootstrap` – Create first shop (only when no users exist)
- `GET/PUT /api/admin/shop`
- CRUD `/api/admin/wa-numbers`
- CRUD `/api/admin/categories`
- CRUD `/api/admin/products`
- `POST /api/admin/uploads/sign` – Returns `{ uploadUrl, r2Key, publicUrl }`
- `POST /api/admin/products/:id/images` – Attach image (body: `{ r2_key }`)
- `PUT /api/admin/products/:id/images/reorder` – Body: `{ image_ids: number[] }`
- `DELETE /api/admin/product-images/:id`
- CRUD `/api/admin/products/:id/options` (groups + values)
- `GET /api/admin/orders` (query: `page`, `limit`, `status`, `search`)
- `PUT /api/admin/orders` (query: `id`, body: `{ status }`)
- `GET /api/admin/orders/export.csv`

---

## Image Upload Flow

1. Web compresses image client-side (Canvas, max 1200×1200, JPEG 85%).
2. Web calls `POST /api/admin/uploads/sign` with `{ ext }` → receives `{ uploadUrl, r2Key, publicUrl }`.
3. Web `PUT`s the file to `uploadUrl` (with credentials).
4. Web calls `POST /api/admin/products/:id/images` with `{ r2_key }` to attach.
5. Images are served via `GET /api/public/images/:key` (Worker proxies R2).

---

## Languages

- Lao (lo)
- English (en)

Toggle in the UI. Stored in `localStorage` as `ai_shop_locale`.
